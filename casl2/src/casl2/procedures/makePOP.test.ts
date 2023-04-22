import { Memory } from "../../infra/memory"
import { Tokens } from "../types"
import { makePOP } from "./makePOP"
import { GeneralRegister } from "./registerAccessor"

describe(`makePOP`, () => {
  describe.each([
    {
        tokens: create({ label: "AA", operator: "POP", operand: "GR1" }),
        expected: { wordLength: 1, bytecode: [0x71, 0x10], targetGR: "GR1", value: 5000 }
    },
    {
        tokens: create({ label: "AA", operator: "POP", operand: "GR3" }),
        expected: { wordLength: 1, bytecode: [0x71, 0x30], targetGR: "GR3", value: 5000 }
    },
  ])(`$# :: $tokens`, ({tokens, expected}) => {
    const grMap = new Map<string, GeneralRegister>()
    for (let i = 0; i <= 7; i++) {
      const name = `GR${i}`
      grMap.set(name, new GeneralRegister(name))
    }

    const memory = new Memory()
    memory.storeLogical(0x8FFF, 5000)

    const SP = new GeneralRegister("SP")
    SP.store(0x8FFF)

    const res = makePOP(tokens, grMap, SP)
    test(`makePOP() returns Instruction`, () => {
      expect(res?.gen).not.toBeNull()
      expect(res?.wordLength).toBe(expected.wordLength)
      expect(new DataView(res?.gen(memory)!.bytecode).getUint8(0)).toEqual(expected.bytecode[0])
      expect(new DataView(res?.gen(memory)!.bytecode).getUint8(1)).toEqual(expected.bytecode[1])
    })

    res?.gen(memory)!.proc(new GeneralRegister("PR"))
    test(`SP was incremented`, () => {
      expect(SP.lookupLogical()).toEqual(0x9000)
    })
    test(`target GR should be loaded data`, () => {
      var GR = grMap.get(expected.targetGR)
      expect(GR?.lookupLogical()).toEqual(expected.value)
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
