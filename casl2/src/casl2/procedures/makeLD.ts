import { Memory } from "../../infra/memory"
import { Instruction, Label, Tokens } from "../types"
import { getLabelOrThrow } from "./labelAccessor"
import { GeneralRegister, isGeneralRegister, getGrOrThrow, grToBytecode, advancePR, FlagRegister } from "./registerAccessor"
import { isAddress, normalizeAddress } from "./strings"

export function makeLD(tokens: Tokens): Instruction {
  const ts = tokens.operand.split(",")
  const target = ts[0]
  const value = ts[1]
  if (isGeneralRegister(value)) {
    // GR -> GR
    const opCode = 0x14
    const wordLength = 1
    return {
      wordLength,
      tokens,
      gen: (
        grMap: Map<string, GeneralRegister>,
        flagRegister: FlagRegister,
        SP: GeneralRegister,
        memory: Memory,
        labels: Map<string, Label>,
        currentMemAddress?: number
      ) => {
        // e.g. LD GR1,GR2 => [0x1412]
        const distGR = getGrOrThrow(target, grMap)
        const grx = ts.length > 2 ? ts[2] : null
        const srcGR = getGrOrThrow(value, grMap)
        if (grx != null) {
          throw new Error(`cannot use GRx: ${tokens}`)
        }
        const bytecode = new ArrayBuffer(2)
        const byteArray = new Uint8Array(bytecode, 0, 2)
        byteArray[0] = opCode
        byteArray[1] = (grToBytecode(distGR) << 4) + grToBytecode(srcGR)
        return {
          bytecode,
          proc: (PR: GeneralRegister) => {
            const value = srcGR.lookup()
            distGR.store(value)
            flagRegister.set(value)
            advancePR(PR, wordLength)
          }
        }
      }
    }
  } else {
    // memory -> GR
    const opCode = 0x10
    const wordLength = 2
    return {
      wordLength,
      tokens,
      gen: (
        grMap: Map<string, GeneralRegister>,
        flagRegister: FlagRegister,
        SP: GeneralRegister,
        memory: Memory,
        labels: Map<string, Label>,
        currentMemAddress?: number
      ) => {
        // e.g. LD GR1,adr => [0x1010, address]
        const distGR = getGrOrThrow(target, grMap)
        const grx = ts.length > 2 ? ts[2] : null
        const indexGR = grx == null ? null : getGrOrThrow(grx, grMap)
        let operandAddress = 0
        if (isAddress(value)) {
          operandAddress = normalizeAddress(value)
        } else {
          const label = getLabelOrThrow(value, labels)
          operandAddress = label.memAddress
        }
        const bytecode = new ArrayBuffer(4)
        const view = new DataView(bytecode)
        view.setUint8(0, opCode)
        view.setUint8(1, (grToBytecode(distGR) << 4) + grToBytecode(indexGR))
        view.setUint16(2, operandAddress, false)
        return {
          bytecode,
          proc: (PR: GeneralRegister) => {
            let address = operandAddress
            if (indexGR != null) {
              address = address + indexGR.lookup()
            }
            const value = memory.lookup(address)
            distGR.store(value)
            flagRegister.set(value)
            advancePR(PR, wordLength)
          }
        }
      }
    }
  }
}
