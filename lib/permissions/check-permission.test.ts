import { describe, expect, it } from "vitest";
import { isLoginLocked, lockUntilAfterFailure, MAX_FAILED_LOGINS } from "../auth/login-throttle";
import { canSeeAllCourses, hasPermission, mergeGroupPermissions } from "./check-permission";
import { DEFAULT_GROUPS, type PermissionKey } from "./permission-keys";

const holder = (permissions: PermissionKey[], isSuperadmin = false) => ({
  id: "staff-1",
  isSuperadmin,
  permissions: new Set(permissions),
});

describe("hasPermission", () => {
  it("lets a superadmin do everything", () => {
    expect(hasPermission(holder([], true), "group.manage")).toBe(true);
    expect(hasPermission(holder([], true), "course.manage")).toBe(true);
  });

  it("only grants what the groups contain", () => {
    const teacher = holder(["course.manage"]);
    expect(hasPermission(teacher, "course.manage")).toBe(true);
    expect(hasPermission(teacher, "customer.manage")).toBe(false);
  });

  it("never grants superadmin-only permissions through a group", () => {
    const sneaky = holder(["group.manage", "staff.assign_group"]);
    expect(hasPermission(sneaky, "group.manage")).toBe(false);
    expect(hasPermission(sneaky, "staff.assign_group")).toBe(false);
  });
});

describe("course scope", () => {
  const groupOf = (name: string) => DEFAULT_GROUPS.find((g) => g.name === name)!.permissions;

  it("limits the Teacher group to its own courses and lets Admin see all", () => {
    expect(canSeeAllCourses(holder(groupOf("Teacher")))).toBe(false);
    expect(canSeeAllCourses(holder(groupOf("Admin")))).toBe(true);
  });
});

describe("mergeGroupPermissions", () => {
  it("unions groups and drops keys that no longer exist in the code", () => {
    const merged = mergeGroupPermissions([["course.manage", "removed.key"], ["ai.use", "course.manage"]]);
    expect([...merged].sort()).toEqual(["ai.use", "course.manage"]);
  });
});

describe("login throttle", () => {
  const now = new Date("2026-11-11T10:00:00Z");

  it("locks after the maximum number of wrong passwords", () => {
    expect(lockUntilAfterFailure(1, now)).toBeNull();
    expect(lockUntilAfterFailure(MAX_FAILED_LOGINS - 1, now)).toBeNull();
    expect(lockUntilAfterFailure(MAX_FAILED_LOGINS, now)!.getTime()).toBeGreaterThan(now.getTime());
    // Parallel guesses can push the counter past the limit; that still locks.
    expect(lockUntilAfterFailure(MAX_FAILED_LOGINS + 3, now)).not.toBeNull();
  });

  it("is locked only until the lock time passes", () => {
    expect(isLoginLocked(null, now)).toBe(false);
    expect(isLoginLocked(new Date(now.getTime() + 1000), now)).toBe(true);
    expect(isLoginLocked(new Date(now.getTime() - 1000), now)).toBe(false);
  });
});
