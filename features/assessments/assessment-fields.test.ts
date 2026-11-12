import { describe, expect, it } from "vitest";
import { type AssessmentFormInput, buildAssessmentFields, readPickedQuestions } from "./assessment-fields";

const input = (over: Partial<AssessmentFormInput>): AssessmentFormInput => ({
  title: "Unit 1",
  kind: "custom",
  durationMinutes: 40,
  maxAttempts: 3,
  opensAt: "",
  closesAt: "",
  status: "draft",
  ...over,
});
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("buildAssessmentFields", () => {
  it("keeps the typed duration for a custom test", () => {
    const built = buildAssessmentFields(input({}));
    expect(built).toMatchObject({ ok: true, fields: { durationMinutes: 40, maxAttempts: 3, opensAt: null, closesAt: null } });
  });
  it("forces the length of 15- and 60-minute tests", () => {
    expect(buildAssessmentFields(input({ kind: "quiz_15" }))).toMatchObject({ fields: { durationMinutes: 15 } });
    expect(buildAssessmentFields(input({ kind: "test_60" }))).toMatchObject({ fields: { durationMinutes: 60 } });
  });
  it("drops a window typed on a non-exam", () => {
    const built = buildAssessmentFields(input({ opensAt: "2026-11-12T08:00", closesAt: "2026-11-12T09:00" }));
    expect(built).toMatchObject({ fields: { opensAt: null, closesAt: null } });
  });
  it("gives an exam its window in UTC and exactly one attempt", () => {
    const built = buildAssessmentFields(input({ kind: "exam", opensAt: "2026-11-12T08:00", closesAt: "2026-11-12T10:00" }));
    expect(built).toMatchObject({
      ok: true,
      fields: { maxAttempts: 1, opensAt: new Date("2026-11-12T01:00:00Z"), closesAt: new Date("2026-11-12T03:00:00Z") },
    });
  });
  it("refuses an exam without a window or with a window that ends before it starts", () => {
    expect(buildAssessmentFields(input({ kind: "exam" })).ok).toBe(false);
    expect(buildAssessmentFields(input({ kind: "exam", opensAt: "2026-11-12T10:00", closesAt: "2026-11-12T10:00" })).ok).toBe(false);
  });
});

describe("readPickedQuestions", () => {
  const form = (entries: [string, string][]) => {
    const data = new FormData();
    for (const [key, value] of entries) data.append(key, value);
    return data;
  };
  it("returns ticked rows sorted by their order number", () => {
    const picked = readPickedQuestions(
      form([["exerciseId", A], ["exerciseId", B], [`points-${A}`, "2"], [`order-${A}`, "5"], [`points-${B}`, "3"], [`order-${B}`, "1"]]),
    );
    expect(picked).toEqual([{ exerciseId: B, points: 3, order: 1 }, { exerciseId: A, points: 2, order: 5 }]);
  });
  it("ignores points typed on rows that are not ticked", () => {
    expect(readPickedQuestions(form([[`points-${A}`, "2"]]))).toEqual([]);
  });
  it("counts a row ticked twice once", () => {
    expect(readPickedQuestions(form([["exerciseId", A], ["exerciseId", A], [`points-${A}`, "2"]]))).toHaveLength(1);
  });
  it("rejects bad ids and bad points", () => {
    expect(readPickedQuestions(form([["exerciseId", "not-a-uuid"], ["points-not-a-uuid", "1"]]))).toBeNull();
    expect(readPickedQuestions(form([["exerciseId", A], [`points-${A}`, "0"]]))).toBeNull();
  });
});
