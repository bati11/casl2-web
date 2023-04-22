import { Instruction, Label, Tokens } from "../types"
import { getLabelOrThrow } from "./labelAccessor"
import { GeneralRegister, FlagRegister, isGeneralRegister, getGrOrThrow, grToBytecode, advancePR } from "./registerAccessor"
import { isNumeric } from "./strings"

export function makeSLA(
  tokens: Tokens,
  labels: Map<string, Label>,
  flagRegister: FlagRegister,
  grMap: Map<string, GeneralRegister>,
): Instruction {
  const ts = tokens.operand.split(",")
  const operand1 = ts[0]
  const target = ts[1]
  const grx = ts.length > 2 ? ts[2] : null

  // GR1 << 2 -> GR1
  const opCode = 0x50
  const wordLength = 2
  const operand1GR = getGrOrThrow(operand1, grMap)
  let getAddress = () => 0
  if (isNumeric(target)) {
    getAddress = () => Number(target)
  } else {
    getAddress = () => getLabelOrThrow(target, labels).memAddress
  }
  const indexGR = grx == null ? null : getGrOrThrow(grx, grMap)
  return {
    wordLength,
    tokens,
    gen: () => {
      // e.g. SLA GR1,adr
      const operandAddress = getAddress()
      const bytecode = new ArrayBuffer(4)
      const view = new DataView(bytecode)
      view.setUint8(0, opCode)
      view.setUint8(1, (grToBytecode(operand1GR) << 4) + grToBytecode(indexGR))
      view.setUint16(2, operandAddress, false)
      return {
        bytecode,
        proc: (PR: GeneralRegister) => {
          let b = operandAddress
          if (indexGR != null) {
            b = b + indexGR.lookup()
          }
          const isNegative = ((operand1GR.lookup() >> 15) & 1) !== 0
          let v = operand1GR.lookup() << b
          if (isNegative) {
            v = v | (1<<15)
          } else {
            v = v & ~(1<<15)
          }
          let overflowFlag = false
          if (((operand1GR.lookupLogical() >> (16 -1 - b)) & 1) !== 0) {
            overflowFlag = true
          }
          operand1GR.store(v)
          flagRegister.setWithOverflowFlag(v, overflowFlag)
          advancePR(PR, wordLength)
        }
      }
    }
  }
}
