import { createHash, randomBytes } from "node:crypto";
import type { GeneradorDeTokens } from "../dominio/puertos.js";

/** 256 bits al azar. En la base queda solo el SHA-256: quien lea la tabla no puede usar la sesión. */
export class TokensAleatorios implements GeneradorDeTokens {
  nuevo(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
