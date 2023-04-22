import { Memory } from "../../infra/memory"
import { Instruction, Tokens } from "../types"
import { GeneralRegister, getGrOrThrow, grToBytecode, advancePR } from "./registerAccessor"
import { isAddress, normalizeAddress } from "./strings"

export function makePUSH(
  tokens: Tokens,
  grMap: Map<string, GeneralRegister>,
  SP: GeneralRegister
): Instruction {
  const ts = tokens.operand.split(",")
  const value = ts[0]
  const grx = ts.length > 1 ? ts[1] : null

  const opCode = 0x70
  const wordLength = 2
  if (!isAddress(value)) {
    throw new Error(`operand should be address: ${tokens}`)
  }
  const operandAddress = normalizeAddress(value)
  const indexGR = grx == null ? null : getGrOrThrow(grx, grMap)
  return {
    wordLength,
    tokens,
    gen: (memory: Memory) => {
      const bytecode = new ArrayBuffer(4)
      const view = new DataView(bytecode)
      view.setUint8(0, opCode)
      view.setUint8(1, (0 << 4) + grToBytecode(indexGR))
      view.setUint16(2, operandAddress, false)
      return {
        bytecode,
        proc: (PR: GeneralRegister) => {
          // value -> memory(SP-1)
          let address = operandAddress
          if (indexGR != null) {
            address = address + indexGR.lookup()
          }
          SP.storeLogical(SP.lookupLogical()-1)
          memory.storeLogical(SP.lookupLogical(), address)
          advancePR(PR, wordLength)
        }
      }
    }
  }
}
