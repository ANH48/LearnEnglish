# Code Review — Phase 01 Foundation (auth, permissions, content CRUD)

Scope: `lib/auth/*`, `lib/permissions/*`, `proxy.ts`, `features/**` actions, `app/admin/**`, `features/exercises/exercise-content.ts`, `prisma/schema.prisma`, seed. ~3.6k LOC. Read-only; nothing run against DB (`.env` untouched), so "CONFIRMED" = code path traced by reading, not executed.

Overall: guard structure solid (every action + page calls `requirePermission` / `requireCourseAccess` / `requireSuperadmin`, perms read from DB per request, kind separated by secret + claim, no redirect loop). One real scope bypass (#1), rest medium/low.

---

## HIGH

### 1. Course-scope bypass via Prisma operator injection in bound action args — CONFIRMED (trace)
- `lib/auth/current-staff.ts:58-61`, `lib/permissions/course-scope.ts:13-16`
- `features/lessons/lesson-actions.ts:33-34, 53, 55, 63-64`
- `features/exercises/exercise-actions.ts:53, 68-69, 88-89`

Wrong: `courseId` / `lessonId` / `exerciseId` come from `.bind()` args. Bound args of module-level `"use server"` actions not encrypted/signed (only inline closures are); client can send any JSON value, TS types not enforced at runtime. Values go straight into Prisma `where`.

Scenario: teacher T (has `course.manage`, no `course.view_all`, owns ≥1 course — can self-create one). Crafts action POST for `deleteLessonAction` with `courseId = {"not":"00000000-0000-0000-0000-000000000000"}`, `lessonId = <lesson of another teacher>`.
- `canAccessCourse` → `findFirst({ id: {not: …}, deletedAt: null, teachers: {some: T} })` → matches T's own course → access granted.
- `lesson.updateMany({ where: { id: lessonId, courseId: {not: …} } })` → matches foreign lesson → soft-deleted, plus its exercises.

Same trick:
- `saveLessonAction` update path → overwrite foreign lesson.
- `saveExerciseAction` update path → overwrite foreign exercise + answer key (lesson check at :53 also passes).
- `deleteExerciseAction` → delete foreign exercise.
- `moveLessonAction` → `findMany` returns lessons of ALL courses, then rewrites `position` across all of them (global order corruption).

Not affected: `saveCourseAction` / `deleteCourseAction` (unique `where` rejects filter object), staff/customer/category deletes (unique `update` throws; category tx rolls back).

Fix: validate at choke point, e.g. in `requireCourseAccess`: `if (!z.uuid().safeParse(courseId).success) notFound()`. Add same `parseId()` helper at top of every action for `lessonId`, `exerciseId`, `staffId`, `customerId`, `categoryId`, `groupId`; validate `direction` with `z.enum(["up","down"])`. Add e2e case to `scripts/e2e-guard-check.ts` passing object as courseId.

---

## MEDIUM

### 2. `staff.manage` (non-superadmin) can take over any non-superadmin staff account — CONFIRMED
`features/staff/staff-actions.ts:45-47, 56, 62-73`

Wrong: only target `isSuperadmin` checked. Non-superadmin may set email + password of any other non-superadmin staff.
Scenario: Admin-group user resets password of staff in custom group holding `prompt.manage` (Admin group lacks it), logs in as them → gains perm superadmin never granted. Also impersonation: actions in audit log attributed to victim.
Fix: allow password/email change of another staff only if superadmin, or only if target's merged perms ⊆ actor's. At minimum audit (`passwordChanged` already logged — keep).

### 3. Login throttle counter not atomic → parallel guesses bypass 5-try limit — CONFIRMED
`features/auth/staff-login-action.ts:30, 41-45`, `lib/auth/login-throttle.ts:12-21`

Wrong: count read at :30, new value computed in JS, written at :42. N concurrent requests all read `failedLoginCount = 0`, all write `1`.
Scenario: 200 parallel wrong-password POSTs → 200 guesses, counter = 1, no lock. Repeat.
Fix: atomic `UPDATE staff SET failed_login_count = failed_login_count + 1 … RETURNING` (Prisma `{ increment: 1 }` then read result, lock when ≥ MAX), or conditional `updateMany({ where: { id, failedLoginCount: staff.failedLoginCount } })` and treat count 0 as failed attempt.

### 4. Lockout message + timing enumerate staff emails; lockout usable as DoS — CONFIRMED
`features/auth/staff-login-action.ts:31-39`

Wrong: unknown email → always `WRONG_CREDENTIALS`. Existing email after 5 misses → "Nhập sai quá nhiều lần" and returns before argon2 (fast response). Comment at :16 claims no enumeration.
Scenario: attacker sends 6 wrong logins per candidate email; distinct message on 6th = staff account exists. Side effect: anyone knowing superadmin email keeps it locked forever (6 requests / 15 min), no IP limit.
Fix: when locked return `WRONG_CREDENTIALS` (or generic "sai hoặc tạm khóa") after a dummy `hashPassword`; add per-IP limit (table keyed by ip+window) so lock is not sole throttle. Accept DoS trade-off explicitly if kept.

### 5. Category update ignores `deletedAt` → resurrects slug on deleted row — CONFIRMED
`features/categories/category-actions.ts:35`

Wrong: `update({ where: { id } })`, no `deletedAt: null`, no existence check.
Scenario: admin A has edit tab open for "Grammar"; admin B deletes it (slug → `grammar--deleted-<id>`); A saves → deleted row gets slug `grammar` back. Row invisible in list, but creating new "Grammar" now fails "Đã có thể loại dùng đường dẫn này" forever. Unknown id → P2025 → 500.
Fix: `updateMany({ where: { id, deletedAt: null } })`, return "Không tìm thấy" when count 0.

### 6. Locked teacher silently unassigned on any course save — CONFIRMED
`features/courses/course-form-options.ts:12`, `features/courses/course-actions.ts:65-69`

Wrong: options list only `status: "active"` staff; save does delete-all + recreate from submitted checkboxes.
Scenario: teacher temporarily locked; admin fixes a typo in course title → teacher's `course_teachers` row dropped; after unlock teacher no longer sees own course.
Fix: include currently assigned (non-deleted) teachers in options regardless of status, or diff instead of replace.

---

## LOW

### 7. Logout does not revoke token — CONFIRMED
`features/auth/logout-actions.ts:7`. Cookie deleted only; copied JWT valid until 7-day expiry. Fix: bump `tokenVersion` on logout (signs out all devices) or accept + document.

### 8. Audit gaps vs spec item 13 ("audit cho xóa, đổi quyền") — CONFIRMED
- No audit: `deleteLessonAction` (`lesson-actions.ts:50`), `deleteExerciseAction` (`exercise-actions.ts:86`), teacher reassignment in `saveCourseAction` (scope change = permission change).
- Audit written outside the tx (`staff-actions.ts:84`, `group-actions.ts:47`): audit insert failure after commit → 500 shown though change saved, no log row. Fix: write inside `$transaction` with `tx`.

### 9. Changing own password logs actor out — CONFIRMED
`staff-actions.ts:58, 72`. `revokeTokens` true for self → `redirect("/admin/staff")` lands on login. Fix: when `isSelf`, `startSession` with new `tokenVersion`.

### 10. Crafted / stale IDs give 500 or wrong message — CONFIRMED (trace), PLAUSIBLE for exact Prisma codes
- Non-UUID in URL (`/admin/courses/abc`, `/admin/categories/abc`, `/admin/staff/abc`) → Prisma UUID parse error → 500 instead of 404. Fixed by #1 helper.
- Unknown `groupIds` / `categoryIds` / `teacherIds` → FK error → 500 (`staff-actions.ts:78`, `course-actions.ts:61, 67`).
- Duplicate ids in those arrays → P2002 reported as "Email này đã được dùng" / "Đã có khóa học dùng đường dẫn này" (`staff-actions.ts:90`, `course-actions.ts:74`). Fix: dedupe with `new Set`, `skipDuplicates: true`.
- `saveGroupAction` / `deleteGroupAction` on deleted group → P2025 → 500 (`group-actions.ts:39, 61`).
- `saveCourseAction` accepts soft-deleted category ids and deleted/locked staff ids (no filter). Fix: `where: { id: { in }, deletedAt: null }` lookup before insert.

### 11. Join rows outlive soft delete — CONFIRMED
`deleteStaffAction` (`staff-actions.ts:104`) keeps `course_teachers` + `staff_groups`. Result: deleted teacher name still listed (`app/admin/(panel)/courses/page.tsx:44`), group "Số staff" counts deleted staff (`groups/page.tsx:13`). Category "courses" count includes soft-deleted courses (`categories/page.tsx:15`). Fix: delete join rows in same tx, or filter counts.

### 12. Missing JWT secret swallowed in verify — CONFIRMED
`lib/auth/session-jwt.ts:39`. `secretFor()` inside `try` → misconfigured env = everyone silently "signed out" in proxy + pages; error only surfaces at next login. Fix: resolve secret before `try`.

### 13. Exercise content edge cases — CONFIRMED
`features/exercises/exercise-content.ts`
- `:74` `"____"` (4+ underscores) counts as 1 blank + stray `_` in learner text. Fix: split on `/_{3,}/` and normalise.
- `:26-36` no max on option / answer / sentence / fill text length or count; `exercise-actions.ts:18` `payload` unbounded (only Next body limit). Add `.max()`.
- `exercise-actions.ts:68` moving exercise to another lesson keeps old `position` → duplicate positions, order undefined.

### 14. Position races — PLAUSIBLE
`lesson-actions.ts:39-41` (max+1 outside tx) and `:63-76` (read outside tx): two concurrent adds/moves → duplicate positions. Self-heals on next move (tie-break `createdAt`). Low priority.

---

## Verified clean (no finding)
- Every action in `features/**` and page in `app/admin/**` has server-side guard; group pages/actions superadmin-only; `/admin/forbidden` + dashboard need only `requireStaff` and scope counts.
- Escalation: non-superadmin cannot set `isSuperadmin`, assign groups, edit/delete superadmin (`staff-actions.ts:45, 67, 76, 102`); `SUPERADMIN_ONLY` keys filtered on group save and ignored in `hasPermission` even if present in DB.
- Teacher cannot change `course_teachers`; new course auto-assigned to creator; lesson for exercise checked against same course.
- Token kind: separate secret + `kind` claim + alg pinned HS256. `tv`, `status`, `deletedAt` checked per request. Lock / password reset / delete bump `tokenVersion`.
- No redirect loop: proxy lets `/admin/login` through, login page decides via DB; `/blocked` outside matcher. Cookie flags OK (httpOnly, Secure in prod, Lax, path `/`).
- Soft delete: email/slug freed on staff, customer, category, course delete; page queries filter `deletedAt`.
- Answer key never in `data` for all 7 types (zod strips unknown payload keys; matching right column + ordering tokens sorted; transcript in `answerKey`). Editor round-trip correct.

## Plan TODO
All 11 checkboxes in phase-01 file still `[ ]`. Not edited (read-only brief). Code covers all items; "Audit log" partial (#8).

## Unresolved questions
1. #2: is `staff.manage` meant to allow resetting other admins' passwords, or superadmin only?
2. #4: keep lockout-by-account (DoS on superadmin possible) or add IP-based limit now?
3. #7: logout = revoke all devices acceptable?
4. `multiple_choice` `data` has no single/multi hint — phase 02 learner UI will need it without leaking count of correct answers; add `multiple: boolean` now?
5. Course soft delete does not cascade to lessons/exercises — phase 02 learner queries must always join `course.deletedAt`; want cascade instead?
6. Exercise reorder absent (only lessons) — intended for phase 01?
