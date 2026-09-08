import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "../types/auth.js";

function requireJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    // Fail fast instead of silently signing tokens with a guessable default.
    throw new Error(
      "JWT_SECRET environment variable is required but was not set. Set it in .env before starting the server."
    );
  }
  return secret;
}

// Typed as `string` explicitly (not `string | undefined`) so downstream
// functions don't need to re-check it — TS narrowing from an early throw
// doesn't carry over into functions declared later in the file.
const JWT_SECRET: string = requireJwtSecret();

const JWT_EXPIRES_IN = (process.env["JWT_EXPIRES_IN"] ?? "1d") as Exclude<SignOptions["expiresIn"], undefined>;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  // jsonwebtoken's own JwtPayload type doesn't overlap with our app-specific
  // shape (id/email/role), so a direct `as` cast is rejected. We're the only
  // issuer of these tokens, so it's safe to trust our own payload shape here.
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
