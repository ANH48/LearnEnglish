import { describe, expect, it } from "vitest";
import { EMPTY_STREAK, applyCompletion, previousDay, streakOn, vnDay } from "./challenge-streak";
import { nextGearAt, petLook } from "./pet-look";

const at = (current: number, lastDay: string | null, extra: Partial<typeof EMPTY_STREAK> = {}) => ({ ...EMPTY_STREAK, current, best: current, lastDay, ...extra });

describe("challenge streak", () => {
  it("uses the Vietnam calendar day", () => {
    expect(vnDay(new Date("2026-11-12T17:30:00Z"))).toBe("2026-11-13"); // 00:30 in Vietnam
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });

  it("starts at 1 and grows by one per day, whatever the score", () => {
    expect(applyCompletion(EMPTY_STREAK, "2026-11-12", 0.1)).toMatchObject({ change: "counted", state: { current: 1, lastDay: "2026-11-12" } });
    expect(applyCompletion(at(4, "2026-11-11"), "2026-11-12", 0.3).state.current).toBe(5);
  });

  it("counts a day only once", () => {
    const outcome = applyCompletion(at(5, "2026-11-12"), "2026-11-12", 1);
    expect(outcome.change).toBe("already_counted");
    expect(outcome.state.current).toBe(5);
  });

  it("breaks after a missed day, however many days were missed", () => {
    expect(streakOn(at(7, "2026-11-10"), "2026-11-12")).toMatchObject({ current: 0, toRestore: 7 });
    expect(streakOn(at(7, "2026-01-01"), "2026-11-12")).toMatchObject({ current: 0, toRestore: 7 });
    expect(streakOn(at(7, "2026-11-11"), "2026-11-12").current).toBe(7);
  });

  it("restores the old streak plus today with 80% or more", () => {
    const outcome = applyCompletion(at(7, "2026-11-01", { best: 9 }), "2026-11-12", 0.8);
    expect(outcome).toEqual({ change: "restored", state: { current: 8, best: 9, toRestore: 0, lastDay: "2026-11-12" } });
  });

  it("below 80% keeps the streak at 0 and lets the learner try again, even days later", () => {
    const failed = applyCompletion(at(7, "2026-11-01"), "2026-11-12", 0.79);
    expect(failed.change).toBe("restore_failed");
    expect(failed.state).toMatchObject({ current: 0, toRestore: 7, lastDay: "2026-11-01" });
    expect(applyCompletion(failed.state, "2026-11-20", 0.9)).toMatchObject({ change: "restored", state: { current: 8 } });
  });
});

describe("pet look", () => {
  it("sleeps without gear at 0, is hungry until today's challenge, happy after", () => {
    expect(petLook(at(0, null, { toRestore: 12 }), "2026-11-12")).toMatchObject({ mood: "sleeping", hat: 0, shirt: 0, weapon: 0, scale: 1 });
    expect(petLook(at(2, "2026-11-11"), "2026-11-12").mood).toBe("hungry");
    expect(petLook(at(2, "2026-11-12"), "2026-11-12").mood).toBe("happy");
  });

  it("unlocks hat, shirt, weapon in turn every 3 days, then the next designs", () => {
    const gear = (streak: number) => {
      const look = petLook(at(streak, "2026-11-12"), "2026-11-12");
      return [look.hat, look.shirt, look.weapon];
    };
    expect(gear(2)).toEqual([0, 0, 0]);
    expect(gear(3)).toEqual([1, 0, 0]);
    expect(gear(6)).toEqual([1, 1, 0]);
    expect(gear(9)).toEqual([1, 1, 1]);
    expect(gear(12)).toEqual([2, 1, 1]);
    expect(gear(27)).toEqual([3, 3, 3]);
    expect(gear(200)).toEqual([3, 3, 3]);
    expect(nextGearAt(10)).toBe(12);
    expect(nextGearAt(27)).toBeNull();
  });

  it("grows a little each day up to a cap", () => {
    const scale = (streak: number) => petLook(at(streak, "2026-11-12"), "2026-11-12").scale;
    expect(scale(10)).toBeGreaterThan(scale(9));
    expect(scale(500)).toBe(scale(30));
  });
});
