# Tester report: LearnEnglish phase 01 foundation
Date: 2026-11-11. Scope: typecheck, lint, vitest, e2e route guards. No app code changed. Nothing committed.

## Commands and results
| Command | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0, no errors |
| `npm run lint` | PASS, exit 0, no warnings/errors |
| `npm test` (vitest run) | FAIL, exit 1. 7 files, 69 tests: 67 pass, 2 fail (both real bugs, kept on purpose). Baseline before work: 3 files, 25 pass |
| `npx tsx --env-file=.env scripts/e2e-guard-check.ts` (localhost:3457) | PASS, 31/31 (19 original + 12 new) |

Test duration: ~0.2-0.5s. No flaky runs seen (ran suite 4x).

## Tests added
- `lib/forms/action-state.test.ts` (57 lines): slugify (Vietnamese diacritics, đ/Đ, separators, idempotent, empty), isUniqueViolation (P2002 true; other codes/non-objects false), validationFailed (field errors, message), EMPTY_ACTION_STATE.
- `features/accounts/account-schemas.test.ts` (80 lines): email trim/lowercase, invalid msg, length cap 200 (boundary), fullName trim/blank/120 cap, password min/max, optionalPassword "" vs valid, status enum, deletedEmail.
- `lib/permissions/permission-keys.test.ts` (63 lines): default groups use only known keys, no SUPERADMIN_ONLY keys in defaults, no dup keys, PERMISSION_KEYS mirrors PERMISSIONS, isPermissionKey true/false cases, inherited-name guard (FAILS, bug 1).
- `features/exercises/exercise-content-edge-cases.test.ts` (104 lines): MC dup correct indices, whitespace-only options, trim, case/space dup options, out-of-range correct; fill_blank adjacent blanks (`______`=2), `____`=1, whitespace-only answer, empty answer list; matching `=` in right side + round-trip, case-dup right/left; ordering extra spaces/tabs, padding, whitespace-only, authored vs shuffled key. All pass.
- `scripts/e2e-guard-check.ts` (extended, original 19 checks untouched). New 12 checks: teacher blocked from /admin/staff, /admin/staff/new, /admin/staff/<id>, /admin/categories, /admin/categories/<id>, /admin/groups/new; teacher A positive control on new lesson/exercise under own course (200); teacher A blocked on B's lesson id and B's exercise id under own course (404); teacher A blocked on B's exercise under B's course (404); superadmin opens B's lesson (200). Script creates rows `e2e-lesson-b` / `e2e-exercise-b` in e2e-course-b (idempotent, find-or-create).

## Coverage
- No coverage script in package.json; coverage % not measured. Gap is by inspection only.
- Pure logic targeted in this phase now has direct tests (listed above). Not unit-tested: exercise-actions/lesson-actions authorization (covered only by e2e route checks, not server-action calls).

## Bugs found (app code not modified)
1. **isPermissionKey uses `in` on object literal, inherited names pass.**
   - `lib/permissions/permission-keys.ts:27` `return value in PERMISSIONS;`
   - Repro: `isPermissionKey("toString") === true`; same for `constructor`, `hasOwnProperty`, `__proto__`.
   - Test: `lib/permissions/permission-keys.test.ts` "rejects inherited Object.prototype names" (FAILS).
   - Impact: low. Callers `features/groups/group-actions.ts:18` (filter) and `lib/permissions/check-permission.ts:25` (merge) accept these strings, so a crafted group form can store `constructor` as a permission_key. No privilege gained seen (hasPermission checks specific keys). Fix: `Object.hasOwn(PERMISSIONS, value)`.
2. **Email trimmed after format check, padded addresses rejected.**
   - `features/accounts/account-schemas.ts:12` `z.email("Email không hợp lệ").trim().toLowerCase().max(200)`. Zod runs `.email()` before `.trim()`.
   - Repro: `accountFields.email.safeParse("  user@example.com  ").success === false`.
   - Test: `features/accounts/account-schemas.test.ts` "accepts surrounding whitespace" (FAILS).
   - Used by `features/staff/staff-actions.ts:14` and `features/customers/customer-actions.ts:14`.
   - Impact: low. Browser `type="email"` strips leading/trailing whitespace before submit, so UI rarely hits it. Direct action calls or API paths do. Fix: trim first, e.g. `z.string().trim().toLowerCase().pipe(z.email(...))`.

No failures found in: exercise-content.ts edge cases, action-state.ts, route guards for staff/categories/groups/cross-course lesson and exercise ids.

## Could not test
- `npm run build` not re-run. Server on :3457 served the pre-existing build; app code unchanged, so results hold for it.
- Browser/UI flows (forms, redirects in real browser), Prisma migrations, DB seed, login throttling in e2e.
- Performance and memory checks. No benchmarks in repo.
- Server actions' authorization via direct POST (only page routes covered by e2e).

## Unresolved questions
- Should email bug (2) be fixed given browsers pre-strip whitespace? Low priority if API path unused.
- Should `isPermissionKey` be hardened now or with the group-form validation work in phase 02?
- Is a coverage target (80%) enforced anywhere? No coverage script exists to measure it.
- E2E test rows (`e2e-course-a/b`, teacher-a/b@test.local, `e2e-lesson-b`, `e2e-exercise-b`) remain in the local DB by design; confirm this is acceptable for the dev DB.
