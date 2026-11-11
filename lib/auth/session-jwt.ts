import { SignJWT, jwtVerify } from "jose";
import {
  type AccountKind,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SECRET_ENV,
} from "./session-constants";

/**
 * The token only identifies the account. Permissions are never stored in it:
 * they are read from the database on every server operation, so a group change
 * takes effect immediately. `tv` (token_version) lets us revoke all old tokens.
 */
export type SessionPayload = { sub: string; kind: AccountKind; tv: number };

function secretFor(kind: AccountKind): Uint8Array {
  const value = process.env[SESSION_SECRET_ENV[kind]];
  if (!value || value.length < 32) {
    throw new Error(`${SESSION_SECRET_ENV[kind]} must be set and at least 32 characters`);
  }
  return new TextEncoder().encode(value);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ kind: payload.kind, tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretFor(payload.kind));
}

/** Returns null for a missing, expired, tampered or wrong-kind token. */
export async function verifySessionToken(
  token: string | undefined,
  kind: AccountKind,
): Promise<SessionPayload | null> {
  if (!token) return null;
  // Resolved outside the try: a missing secret is a deployment error, not a bad token.
  const secret = secretFor(kind);
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.kind !== kind || typeof payload.sub !== "string" || typeof payload.tv !== "number") {
      return null;
    }
    return { sub: payload.sub, kind, tv: payload.tv };
  } catch {
    return null;
  }
}
