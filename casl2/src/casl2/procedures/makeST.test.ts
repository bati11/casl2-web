import { Memory } from "../../infra/memory"
import { Interpreter } from "../../interpreter/interpreter"
import { Label, Tokens } from "../types"
import { makeST } from "./makeST"
import { FlagRegister, GeneralRegister } from "./registerAccessor"

describe(`makeST`, () => {
  describe.each([
    {
        tokens: create({ label: "AA", operator: "ST", operand: "GR1,5000" }),
        expected: { wordLength: 2, bytecode: [0x11, 0x10, 5000], stored_mem_address: 5000 }
    },
    {
        tokens: create({ label: "AA", operator: "ST", operand: "GR1,5000,GR3" }),
        expected: { wordLength: 2, bytecode: [0x11, 0x13, 5000], stored_mem_address: 5002 }
    },
    {
        tokens: create({ label: "AA", operator: "ST", operand: "GR1,#1388,GR3" }),
        expected: { wordLength: 2, bytecode: [0x11, 0x13, 5000], stored_mem_address: 5002 }
    },
  ])(`$# :: $tokens`, ({tokens, expected}) => {
    // given
    const labels = new Map<string, Label>()
    labels.set("AA", {label: "AA", memAddress: 2000})
    const grMap = new Map<string, GeneralRegister>()
    for (let i = 0; i <= 7; i++) {
      const name = `GR${i}`
      grMap.set(name, new GeneralRegister(name))
    }
    grMap.get("GR1")?.store(123)
    grMap.get("GR3")?.store(2)
    const flagRegister = new FlagRegister()
    const SP = new GeneralRegister("SP")
    const memory = new Memory()
    memory.store(5000, 0)

    // when, then
    const res = makeST(tokens)
    test(`makeST() returns Instruction`, () => {
      expect(res?.gen).not.toBeNull()
      expect(res?.wordLength).toBe(expected.wordLength)
      expect(new DataView(res?.gen(grMap, memory, labels)!.bytecode).getUint8(0)).toEqual(expected.bytecode[0])
      expect(new DataView(res?.gen(grMap, memory, labels)!.bytecode).getUint8(1)).toEqual(expected.bytecode[1])
      expect(new DataView(res?.gen(grMap, memory, labels)!.bytecode).getUint16(2)).toEqual(expected.bytecode[2])
    })

    // given
    const PR = new GeneralRegister("PR")
    PR.storeLogical(0)

    // when
    const bytecode = res?.gen(grMap, memory, labels)!.bytecode
    memory.storeBytecode(bytecode, 0)
    const interpreter = new Interpreter(grMap, flagRegister, PR, SP, memory)
    interpreter.step()

    // then
    test(`memory should be stored data`, () => {
      expect(memory.lookup(expected.stored_mem_address)).toEqual(123)
    })
  })
})

function create(params: {
  lineNum?: number,
  instructionNum?: number,
  label?: string,
  operator: string,
  operand: string
}): Tokens {
  let { lineNum, instructionNum, label, operator, operand } = params
  lineNum = lineNum || 0
  instructionNum = instructionNum || 0
  label = label || ""
  return { lineNum, instructionNum, label, operator, operand }
}
