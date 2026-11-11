import { describe, expect, it } from "vitest";
import {
  DEFAULT_GROUPS,
  PERMISSION_KEYS,
  PERMISSIONS,
  SUPERADMIN_ONLY,
  isPermissionKey,
  type PermissionKey,
} from "./permission-keys";

describe("permission keys", () => {
  it("every default group permission is a known key", () => {
    for (const group of DEFAULT_GROUPS) {
      for (const key of group.permissions) {
        expect(PERMISSION_KEYS, `${group.name} has unknown key ${key}`).toContain(key);
        expect(isPermissionKey(key)).toBe(true);
      }
    }
  });

  it("default groups never hold superadmin-only keys", () => {
    for (const group of DEFAULT_GROUPS) {
      for (const key of SUPERADMIN_ONLY) {
        expect(group.permissions, `${group.name} must not hold ${key}`).not.toContain(key);
      }
    }
  });

  it("default group permissions have no duplicates", () => {
    for (const group of DEFAULT_GROUPS) {
      expect(new Set(group.permissions).size).toBe(group.permissions.length);
    }
  });

  it("every key has a Vietnamese description and PERMISSION_KEYS mirrors PERMISSIONS", () => {
    expect(PERMISSION_KEYS).toHaveLength(Object.keys(PERMISSIONS).length);
    for (const key of PERMISSION_KEYS) expect(PERMISSIONS[key].length).toBeGreaterThan(0);
  });

  it("SUPERADMIN_ONLY keys are real keys", () => {
    for (const key of SUPERADMIN_ONLY) expect(isPermissionKey(key)).toBe(true);
  });

  it("isPermissionKey accepts real keys and rejects unknown strings", () => {
    expect(isPermissionKey("course.manage")).toBe(true);
    expect(isPermissionKey("course.delete")).toBe(false);
    expect(isPermissionKey("")).toBe(false);
  });

  it("isPermissionKey rejects inherited Object.prototype names", () => {
    // Bug guard: `value in PERMISSIONS` is true for inherited props. See permission-keys.ts isPermissionKey.
    const inherited: string[] = ["toString", "constructor", "hasOwnProperty", "__proto__"];
    for (const name of inherited) expect(isPermissionKey(name), name).toBe(false);
  });

  it("type guard narrows to PermissionKey", () => {
    const value: string = "ai.use";
    if (isPermissionKey(value)) {
      const typed: PermissionKey = value;
      expect(typed).toBe("ai.use");
    }
  });
});
