import { describe, expect, it } from "vitest";
import { type EnrollmentEvent, type EnrollmentStatus, nextEnrollmentStatus } from "./enrollment-state";

const STATUSES: (EnrollmentStatus | null)[] = [null, "pending", "approved", "rejected", "cancelled"];
const EVENTS: EnrollmentEvent[] = ["request", "cancel", "approve", "reject", "remove"];

describe("nextEnrollmentStatus", () => {
  it("allows exactly the moves in the spec", () => {
    const allowed: Record<string, EnrollmentStatus> = {
      "null>request": "pending",
      "rejected>request": "pending",
      "cancelled>request": "pending",
      "pending>cancel": "cancelled",
      "pending>approve": "approved",
      "pending>reject": "rejected",
      "approved>remove": "cancelled",
    };
    for (const status of STATUSES) {
      for (const event of EVENTS) {
        expect(nextEnrollmentStatus(status, event), `${status} > ${event}`).toBe(allowed[`${status}>${event}`] ?? null);
      }
    }
  });

  it("never lets a learner reach approved without a teacher", () => {
    for (const status of STATUSES) {
      expect(nextEnrollmentStatus(status, "request")).not.toBe("approved");
      expect(nextEnrollmentStatus(status, "cancel")).not.toBe("approved");
    }
  });
});
