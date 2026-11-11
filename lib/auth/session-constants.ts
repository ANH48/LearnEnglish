// No Next.js or Node imports here: proxy.ts and tests both use this file.

export type AccountKind = "staff" | "customer";

export const SESSION_COOKIE_NAME: Record<AccountKind, string> = {
  staff: "staff_token",
  customer: "customer_token",
};

export const SESSION_SECRET_ENV: Record<AccountKind, string> = {
  staff: "STAFF_JWT_SECRET",
  customer: "CUSTOMER_JWT_SECRET",
};

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function otherKind(kind: AccountKind): AccountKind {
  return kind === "staff" ? "customer" : "staff";
}
