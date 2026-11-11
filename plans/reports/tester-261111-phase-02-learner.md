# Tester report: phase 02 learner side

Date: 2026-11-11. Env: app prod build http://localhost:3457 (up, 200). Postgres 127.0.0.1:54329 (up). Not started by me.

## 1. Commands and counts (final run)

| Cmd | Result |
|---|---|
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, no output |
| `npm test` (vitest) | exit 1. Files 11 pass / 2 fail (13). Tests 117 pass / 8 fail (125) |
| `npx tsx --env-file=.env scripts/e2e-guard-check.ts` | exit 0. PASS 36, FAIL 0 |
| `npx tsx --env-file=.env scripts/e2e-learner-check.ts` | exit 0. PASS 37, FAIL 0 (was 27 before extension, +10 new) |

Baseline before my work: vitest 10 files / 84 tests, all pass.

Npm test failures = my new tests catching real bugs (below). Kept failing on purpose, no fixes made.

## 2. Tests added

- `lib/grading/grade-exercise-edge-cases.test.ts` (118 lines). Duplicate indices, empty selection, bad/NaN/non-int/over-long arrays, response shorter/longer than key, malformed answerKey, unknown type, non-object response.
- `lib/grading/normalize-and-score.test.ts` (48 lines). Tabs/newlines, mixed apostrophes, empty input, scoreFor rounding and zero points.
- `features/exercise-player/learner-exercise-malformed.test.ts` (84 lines). toLearnerExercise with null data/key, non-array options, string answerKey, smuggled key fields not forwarded; solutionText with malformed data.
- `scripts/e2e-learner-check.ts` (+57 lines, now 182). Original checks untouched. New checks:
  - soft-deleted lesson in open course: 404, title not listed
  - soft-deleted course (approved learner): 404 for course and lesson, not in /learn
  - staff session: /courses/<slug> 200, /learn blocked to /blocked?as=staff
  - teacher-a (guard fixture) on /admin/enrollments: sees e2e-course-a request, does NOT see e2e-course-b. Superadmin sees e2e-course-b (non-vacuous control)
  - script fails loudly if guard fixtures are missing. It cleans up its enrollments in course A/B.

All new files kept under 200 lines.

## 3. Bugs found (app code not touched)

Malformed answerKey / stored data makes pure functions throw. Data is written by `buildExerciseContent` so shape is normally valid, but the brief says "must not throw". No try/catch around `gradeExercise` / `solutionText` in `features/exercise-player/submit-answer-action.ts:41` and `:57`, so a throw becomes a server-action error for the learner.

1. `lib/grading/grade-exercise.ts:49` multiple_choice/listening. `new Set(key.correct)` throws on non-iterable.
   Repro: `gradeExercise("multiple_choice", { correct: 5 }, { selected: [5] })` -> `TypeError: number 5 is not iterable`.
2. `lib/grading/grade-exercise.ts:54` fill_blank. `accepted.map` throws when `answers` missing or not array.
   Repro: `gradeExercise("fill_blank", undefined, { answers: ["a"] })` -> `Cannot read properties of undefined (reading 'map')`.
3. `lib/grading/grade-exercise.ts:59` matching. `matches.map` throws when `matches` missing.
   Repro: `gradeExercise("matching", undefined, { matches: [0] })`.
4. `lib/grading/grade-exercise.ts:64` ordering. `tokens.length` throws when `tokens` missing.
   Repro: `gradeExercise("ordering", { tokens: null }, { tokens: ["a"] })`.
5. `features/exercise-player/learner-exercise.ts:61` solutionText multiple_choice/listening. `(key.correct).map` throws when missing.
   Repro: `solutionText({type:"multiple_choice", data:null, answerKey:null, ...})`.
6. `features/exercise-player/learner-exercise.ts:63` solutionText fill_blank. `key.answers.map is not a function` when not array.
7. `features/exercise-player/learner-exercise.ts:66` solutionText matching. Missing match index prints `cat = undefined`. Visible text bug, no throw.
8. Low: `lib/grading/grade-exercise.ts:56`. Accepted answer `""` gives credit for empty response (ratio 1). Only reachable with malformed key (builder requires non-empty text).

Severity: low-medium. Data is app-written, so real exposure is only corrupted rows or future import paths (phase 04 AI import reuses the builder).

Suggested fix direction (not applied): guard with `Array.isArray` before `new Set` / `.map`, or validate the key with zod at read time.

## 4. Behavior notes (pass, FYI)

- Duplicate indices in `selected` collapse via Set (`grade-exercise.ts:51`). `[0,0,2]` scores correct for key `[0,2]`. Acceptable, confirm intended.
- `normalizeAnswer` maps only `’ ‘ \``. Not `ʼ` (U+02BC) or `´` (U+00B4). Not tested as bug.
- `toLearnerExercise` silently filters non-string options (`learner-exercise.ts:25`). Shifts indices if data is malformed. Only with bad data.
- Lint, typecheck, guard and learner e2e all green. No flaky runs seen (learner check run 4x, same result each time).

## 5. Could not test / gaps

- Server actions `submitExerciseAnswerAction`, `lessonProgressActions`, `requestEnrollmentAction`, `reviewEnrollmentAction` have no unit or e2e coverage. E2E only uses GET pages (no POST server-action calls). Would need an HTTP action client or a Next test harness.
- No browser UI test (exercise player interaction, form UX).
- No concurrency test: double submit of an answer (`submit-answer-action.ts:47-55` findFirst then create/update race can create duplicate answer rows without a unique index).
- No perf or build-warning check (build not rerun; server served existing build).
- Teacher-A scope checked for enrollments list only, not for review actions on other courses.

## Unresolved questions

1. Is `new Set`-collapse of duplicate `selected` indices intended?
2. Should `normalizeAnswer` also fold `ʼ` and `´` to `'`?
3. Should server actions catch malformed-key errors and return `{ok:false}` instead of throwing? Current code has no try/catch in `submit-answer-action.ts`.
4. Race in `submit-answer-action.ts:47-55` (no unique on practice answers): acceptable for MVP?
5. Who owns the 8 failing tests: fix in phase 02 code or defer? Left failing per brief.
6. `git status` now also shows modified `README.md`, `docs/system-architecture.md`, and plan files that I did not touch. Not part of my changes; confirm.
