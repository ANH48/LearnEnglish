import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-hashing";
import { accountFields, deletedEmail } from "./account-schemas";

const email = z.object({ email: accountFields.email });
const name = z.object({ fullName: accountFields.fullName });
const pass = z.object({ password: accountFields.password });
const optPass = z.object({ optionalPassword: accountFields.optionalPassword });

describe("accountFields.email", () => {
  it("trims and lowercases a valid address", () => {
    expect(email.parse({ email: "Teacher@Example.COM" }).email).toBe("teacher@example.com");
  });

  it("rejects malformed addresses with the Vietnamese message", () => {
    const r = email.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Email không hợp lệ");
  });

  it("accepts surrounding whitespace (trim must run before the format check)", () => {
    expect(email.safeParse({ email: "  user@example.com  " }).success).toBe(true);
  });

  it("caps the address at 200 chars", () => {
    const atLimit = `${"a".repeat(195)}@x.io`; // 200 chars
    expect(email.safeParse({ email: atLimit }).success).toBe(true);
    const over = `${"a".repeat(196)}@x.io`; // 201 chars
    expect(email.safeParse({ email: over }).success).toBe(false);
  });
});

describe("accountFields.fullName", () => {
  it("trims and rejects blank names", () => {
    expect(name.parse({ fullName: "  Lan Nguyen " }).fullName).toBe("Lan Nguyen");
    expect(name.safeParse({ fullName: "   " }).error?.issues[0]?.message).toBe("Bắt buộc");
  });

  it("caps length at 120 chars", () => {
    expect(name.safeParse({ fullName: "x".repeat(120) }).success).toBe(true);
    expect(name.safeParse({ fullName: "x".repeat(121) }).success).toBe(false);
  });
});

describe("accountFields.password", () => {
  it("enforces the minimum length from password-hashing", () => {
    expect(pass.safeParse({ password: "a".repeat(MIN_PASSWORD_LENGTH - 1) }).success).toBe(false);
    expect(pass.safeParse({ password: "a".repeat(MIN_PASSWORD_LENGTH) }).success).toBe(true);
  });

  it("caps length at 200 chars", () => {
    expect(pass.safeParse({ password: "a".repeat(201) }).success).toBe(false);
  });
});

describe("accountFields.optionalPassword", () => {
  it("accepts empty string (keep current) and valid passwords only", () => {
    expect(optPass.safeParse({ optionalPassword: "" }).success).toBe(true);
    expect(optPass.safeParse({ optionalPassword: "a".repeat(MIN_PASSWORD_LENGTH) }).success).toBe(true);
    expect(optPass.safeParse({ optionalPassword: "short" }).success).toBe(false);
  });
});

describe("accountFields.status", () => {
  it("allows only active or locked", () => {
    expect(z.object({ status: accountFields.status }).safeParse({ status: "active" }).success).toBe(true);
    expect(z.object({ status: accountFields.status }).safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("deletedEmail", () => {
  it("suffixes the address with the account id so the real address is freed", () => {
    expect(deletedEmail("lan@example.com", "abc-123")).toBe("lan@example.com#deleted-abc-123");
  });

  it("produces a value that no longer matches the original address", () => {
    expect(deletedEmail("lan@example.com", "1")).not.toBe("lan@example.com");
  });
});
