# Code review — Phase 02 learner (summary + fix status)

Date: 2026-11-11. Reviewer: code-reviewer agent (static trace, read-only). Agent returned report in chat only; this file = condensed copy + what was fixed after.

## Verdict
No path found to lesson content, exercises or answer keys without approved enrollment in published course. No critical. Checked clean: content gate on every page/action, assessment-only exercises rejected in practice submit, answer key never in client props (only `multiple` hint, deliberate), all action ids validated, no self-approve, teacher scope enforced on enrollment's own course, no staff/customer table mix-up.

## Findings

| # | Finding | Where | Status |
|---|---|---|---|
| 1 | Open redirect after login/register: `next=/\evil.com`, `/<tab>/evil.com` passed prefix check | features/auth/customer-auth-actions.ts | Fixed: `lib/forms/safe-next-path.ts` parses URL, unit tested |
| 2 | Practice answers could duplicate on concurrent submit (find-then-create); "latest" read unordered | submit-answer-action.ts, lesson page | Fixed: tx + `pg_advisory_xact_lock` per learner+exercise; reads ordered by updatedAt |
| 3 | Raw client JSON stored instead of validated response; `\u0000` → 500 | submit-answer-action.ts | Fixed: `parseResponse` output stored; NUL rejected |
| 4 | No rate limit on registration (argon2 cost, table flood, pending-request spam); email existence confirmed on register | customer-auth-actions.ts | NOT fixed. Needs per-IP limiter (also covers login lockout DoS from phase 1) |
| 5 | Learner cancel could overwrite concurrent teacher approval | enrollment-actions.ts | Fixed: status-filtered updateMany; create with skipDuplicates |
| 6 | Response limits stricter than editor (ordering > 200 words, long blank answers never gradable) | grade-exercise.ts vs exercise-content.ts | Fixed: editor capped (ordering ≤ 60 words, blank answer ≤ 200 chars), response limits aligned |
| 7 | Grader / solutionText threw on malformed stored key (future AI import risk) | grade-exercise.ts, learner-exercise.ts | Fixed: never throw; grade → null, solution → "" |
| 8 | `?category=a&category=b` → 500 on landing | app/page.tsx | Fixed |
| 9 | Minor: public outline order tiebreak | app/courses/[slug]/page.tsx | Fixed |
| 9 | Minor: ordering tokens sorted alphabetically can equal answer for short sentences; capital letter / punctuation hint first/last word | exercise-content.ts | NOT fixed (pedagogy, not security) |
| 9 | Minor: header "Trang quản trị" link + other-kind session check are signature-only | site-header.tsx, password-login.ts | Accepted: `/admin` re-checks; `/blocked` offers logout for both kinds |

## Unresolved questions (for phase 03)
1. Exercise in a published lesson AND in an exam → practice submit returns its solution → leaks exam key. Need rule: exam exercises must have `lessonId = null`, or check at submit.
2. Removed / rejected learner can re-request immediately, unlimited. Add cooldown or block?
3. `multiple` hint acceptable inside exams?
4. Keep per-account lockout for learners (victim lockout possible) or move to per-IP?
