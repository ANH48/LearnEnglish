import "server-only";
import { cookies } from "next/headers";
import {
  type AccountKind,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "./session-constants";
import { type SessionPayload, signSessionToken, verifySessionToken } from "./session-jwt";

export async function startSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  (await cookies()).set(SESSION_COOKIE_NAME[payload.kind], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(kind: AccountKind): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME[kind]);
}

export async function readSession(kind: AccountKind): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME[kind])?.value;
  return verifySessionToken(token, kind);
}
