import { Tokens } from "./types";

export class AssembleError extends Error {
  tokens: Tokens

  constructor(tokens: Tokens, e: Error) {
    super(e.message)
    this.tokens = tokens
  }
}
