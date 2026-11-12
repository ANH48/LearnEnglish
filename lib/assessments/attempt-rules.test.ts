import { describe, expect, it } from "vitest";
import { canSeeSolutions, canStillSave, checkCanStart, computeDeadline, isPastDeadline, settleScore, SAVE_GRACE_MS } from "./attempt-rules";

const at = (iso: string) => new Date(iso);
const quiz = { kind: "quiz_15", opensAt: null, closesAt: null, maxAttempts: 2 };
const exam = { kind: "exam", opensAt: at("2026-11-12T08:00:00Z"), closesAt: at("2026-11-12T10:00:00Z"), maxAttempts: 1 };

describe("computeDeadline", () => {
  it("adds the duration to the start time", () => {
    expect(computeDeadline(at("2026-11-12T08:00:00Z"), 15, quiz)).toEqual(at("2026-11-12T08:15:00Z"));
  });
  it("cuts an exam off at its closing time", () => {
    expect(computeDeadline(at("2026-11-12T09:30:00Z"), 60, exam)).toEqual(at("2026-11-12T10:00:00Z"));
  });
  it("ignores a closing time on non-exam kinds", () => {
    const withWindow = { ...quiz, closesAt: at("2026-11-12T08:05:00Z") };
    expect(computeDeadline(at("2026-11-12T08:00:00Z"), 15, withWindow)).toEqual(at("2026-11-12T08:15:00Z"));
  });
});

describe("deadline checks", () => {
  const deadline = at("2026-11-12T08:15:00Z");
  it("is not past at the exact deadline, is past one millisecond later", () => {
    expect(isPastDeadline(deadline, deadline)).toBe(false);
    expect(isPastDeadline(deadline, new Date(deadline.getTime() + 1))).toBe(true);
  });
  it("accepts a save within the grace period and rejects it after", () => {
    expect(canStillSave(deadline, new Date(deadline.getTime() + SAVE_GRACE_MS))).toBe(true);
    expect(canStillSave(deadline, new Date(deadline.getTime() + SAVE_GRACE_MS + 1))).toBe(false);
  });
});

describe("checkCanStart", () => {
  it("lets a learner start while attempts remain", () => {
    expect(checkCanStart(quiz, 1, at("2026-11-12T08:00:00Z"))).toBe("ok");
  });
  it("refuses once every attempt is used", () => {
    expect(checkCanStart(quiz, 2, at("2026-11-12T08:00:00Z"))).toBe("no_attempts_left");
  });
  it("refuses an exam before it opens and from its closing time on", () => {
    expect(checkCanStart(exam, 0, at("2026-11-12T07:59:59Z"))).toBe("not_open_yet");
    expect(checkCanStart(exam, 0, at("2026-11-12T08:00:00Z"))).toBe("ok");
    expect(checkCanStart(exam, 0, at("2026-11-12T10:00:00Z"))).toBe("closed");
  });
  it("allows an exam only once", () => {
    expect(checkCanStart(exam, 1, at("2026-11-12T09:00:00Z"))).toBe("no_attempts_left");
  });
});

describe("canSeeSolutions", () => {
  it("shows solutions of a quiz at any time", () => {
    expect(canSeeSolutions(quiz, at("2026-11-12T08:00:00Z"))).toBe(true);
  });
  it("hides exam solutions until the exam closes", () => {
    expect(canSeeSolutions(exam, at("2026-11-12T09:59:59Z"))).toBe(false);
    expect(canSeeSolutions(exam, at("2026-11-12T10:00:00Z"))).toBe(true);
  });
});

describe("settleScore", () => {
  const auto = (score: number) => ({ autoScore: score, manualScore: null, gradedAt: null, needsManual: false });
  it("is graded at once when nothing needs a teacher", () => {
    expect(settleScore([auto(1), auto(0.5)])).toEqual({ score: 1.5, status: "graded" });
  });
  it("stays submitted while a written answer waits for grading", () => {
    const waiting = { autoScore: null, manualScore: null, gradedAt: null, needsManual: true };
    expect(settleScore([auto(2), waiting])).toEqual({ score: 2, status: "submitted" });
  });
  it("adds the manual score once the teacher has graded", () => {
    const graded = { autoScore: null, manualScore: "3.5", gradedAt: new Date(), needsManual: true };
    expect(settleScore([auto(2), graded])).toEqual({ score: 5.5, status: "graded" });
  });
  it("scores an attempt with no answers as zero", () => {
    expect(settleScore([])).toEqual({ score: 0, status: "graded" });
  });
});
