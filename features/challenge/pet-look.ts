import type { StreakState } from "./challenge-streak";

/** Gear designs available per slot; levels above the last design keep the last one. */
export const GEAR_DESIGNS = 3;
const GROWTH_PER_DAY = 0.025;
const GROWTH_CAP_DAYS = 30;
/** The largest scale a pet reaches; the avatar is drawn so this size just fits. */
export const MAX_PET_SCALE = 1 + GROWTH_CAP_DAYS * GROWTH_PER_DAY;

export type PetMood = "sleeping" | "hungry" | "happy";
export type PetLook = { scale: number; mood: PetMood; hat: number; shirt: number; weapon: number };

/**
 * How the pet looks for a streak. Every 3rd day unlocks the next piece in turn:
 * hat, shirt, weapon, then a new hat, a new shirt... (level 0 = none). It grows a
 * little each day up to a cap. A streak at 0 means a sleeping pet with no gear.
 */
export function petLook(state: StreakState, today: string): PetLook {
  const streak = state.current;
  const milestones = Math.floor(streak / 3);
  const level = (offset: number) => Math.min(GEAR_DESIGNS, Math.floor((milestones + offset) / 3));
  const mood: PetMood = streak === 0 ? "sleeping" : state.lastDay === today ? "happy" : "hungry";
  return {
    scale: 1 + Math.min(streak, GROWTH_CAP_DAYS) * GROWTH_PER_DAY,
    mood,
    hat: level(2),
    shirt: level(1),
    weapon: level(0),
  };
}

/** Streak needed for the next piece of gear, or null once every design is unlocked. */
export function nextGearAt(streak: number): number | null {
  const next = (Math.floor(streak / 3) + 1) * 3;
  return next / 3 > GEAR_DESIGNS * 3 ? null : next;
}
