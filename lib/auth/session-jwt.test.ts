import { beforeAll, describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./session-jwt";

beforeAll(() => {
  process.env.STAFF_JWT_SECRET = "staff-secret-staff-secret-staff-secret-1";
  process.env.CUSTOMER_JWT_SECRET = "customer-secret-customer-secret-customer-2";
});

describe("session tokens", () => {
  it("round-trips a staff token", async () => {
    const token = await signSessionToken({ sub: "staff-1", kind: "staff", tv: 3 });
    expect(await verifySessionToken(token, "staff")).toEqual({ sub: "staff-1", kind: "staff", tv: 3 });
  });

  it("rejects a learner token presented as a staff token, and the reverse", async () => {
    const customerToken = await signSessionToken({ sub: "c-1", kind: "customer", tv: 0 });
    const staffToken = await signSessionToken({ sub: "s-1", kind: "staff", tv: 0 });
    expect(await verifySessionToken(customerToken, "staff")).toBeNull();
    expect(await verifySessionToken(staffToken, "customer")).toBeNull();
  });

  it("rejects a tampered or missing token", async () => {
    const token = await signSessionToken({ sub: "staff-1", kind: "staff", tv: 0 });
    expect(await verifySessionToken(`${token.slice(0, -2)}xx`, "staff")).toBeNull();
    expect(await verifySessionToken(undefined, "staff")).toBeNull();
    expect(await verifySessionToken("not-a-token", "staff")).toBeNull();
  });

  it("refuses to sign with a short secret", async () => {
    process.env.STAFF_JWT_SECRET = "short";
    await expect(signSessionToken({ sub: "s", kind: "staff", tv: 0 })).rejects.toThrow();
    process.env.STAFF_JWT_SECRET = "staff-secret-staff-secret-staff-secret-1";
  });
});
