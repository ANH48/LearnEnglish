// End-to-end check of tests and exams against a running app (default http://localhost:3457):
// who can open an assessment, that answers stay hidden, that an attempt left
// open past its deadline is closed and graded, and that teachers only see their own courses.
// Uses the fixtures of e2e-guard-check, so run that one first.
// Run from the repo root: npx tsx --env-file=.env scripts/e2e-assessment-check.ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password-hashing";
import { signSessionToken } from "../lib/auth/session-jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3457";
const db = new PrismaClient();
let failures = 0;

async function visit(path: string, cookie?: string) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: res.status, location: res.headers.get("location") ?? "", body: await res.text() };
}

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
}

const HOUR = 3_600_000;

async function main() {
  const admin = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true } });
  const teacherA = await db.staff.findUnique({ where: { email: "teacher-a@test.local" } });
  const courseA = await db.course.findUnique({ where: { slug: "e2e-course-a" } });
  const courseB = await db.course.findUnique({ where: { slug: "e2e-course-b" } });
  if (!teacherA || !courseA || !courseB) throw new Error("Missing fixtures: run scripts/e2e-guard-check.ts first.");
  await db.course.updateMany({ where: { id: { in: [courseA.id, courseB.id] } }, data: { status: "published" } });

  // Start clean so the script can run again and again.
  await db.assessment.deleteMany({ where: { title: { startsWith: "e2e-asm-" } } });
  await db.exercise.deleteMany({ where: { prompt: { startsWith: "e2e-asm-" } } });
  await db.mediaFile.deleteMany({ where: { storageKey: { startsWith: "recordings/e2e-asm-" } } });

  const mkExercise = (courseId: string, prompt: string, type: "multiple_choice" | "writing") =>
    db.exercise.create({
      data:
        type === "writing"
          ? { courseId, type, prompt, status: "published", points: 4, data: { minWords: 5 } }
          : { courseId, type, prompt, status: "published", data: { options: ["e2e-wrong-opt", "SOLUTION-OPT-e2e"] }, answerKey: { correct: [1] } },
    });
  const choice = await mkExercise(courseA.id, "e2e-asm-choice", "multiple_choice");
  const writing = await mkExercise(courseA.id, "e2e-asm-writing", "writing");
  const choiceB = await mkExercise(courseB.id, "e2e-asm-choice-b", "multiple_choice");

  const now = Date.now();
  const mkAssessment = (courseId: string, title: string, extra: object, exercises: { exerciseId: string; points: number; position: number }[]) =>
    db.assessment.create({
      data: { courseId, title, kind: "custom", durationMinutes: 30, maxAttempts: 2, status: "published", createdBy: admin.id, ...extra, exercises: { create: exercises } },
    });
  const questions = [
    { exerciseId: choice.id, points: 3, position: 0 },
    { exerciseId: writing.id, points: 4, position: 1 },
  ];
  const quiz = await mkAssessment(courseA.id, "e2e-asm-quiz", {}, questions);
  const draft = await mkAssessment(courseA.id, "e2e-asm-draft", { status: "draft" }, questions);
  const exam = await mkAssessment(courseA.id, "e2e-asm-exam", { kind: "exam", maxAttempts: 1, opensAt: new Date(now - HOUR), closesAt: new Date(now + HOUR) }, questions);
  const future = await mkAssessment(courseA.id, "e2e-asm-future", { kind: "exam", maxAttempts: 1, opensAt: new Date(now + HOUR), closesAt: new Date(now + 2 * HOUR) }, questions);
  const quizB = await mkAssessment(courseB.id, "e2e-asm-quiz-b", {}, [{ exerciseId: choiceB.id, points: 1, position: 0 }]);

  const learner = await db.customer.upsert({
    where: { email: "e2e-asm-learner@test.local" },
    update: { tokenVersion: 0, status: "active", deletedAt: null },
    create: { email: "e2e-asm-learner@test.local", fullName: "E2E Asm Learner", passwordHash: await hashPassword("irrelevant-password") },
  });
  const cookie = `customer_token=${await signSessionToken({ sub: learner.id, kind: "customer", tv: 0 })}`;
  const enroll = (courseId: string, status: "pending" | "approved") =>
    db.enrollment.upsert({ where: { courseId_customerId: { courseId, customerId: learner.id } }, update: { status }, create: { courseId, customerId: learner.id, status } });
  const page = (assessmentId: string, rest = "", slug = courseA.slug) => `/learn/${slug}/assessments/${assessmentId}${rest}`;

  // Who can open an assessment
  await db.enrollment.deleteMany({ where: { customerId: learner.id, courseId: courseB.id } });
  await enroll(courseA.id, "pending");
  let r = await visit(page(quiz.id), cookie);
  check("pending enrollment -> assessment is 404", r.status === 404, String(r.status));
  await enroll(courseA.id, "approved");
  r = await visit(`/learn/${courseA.slug}`, cookie);
  check("course page lists published assessments only", r.status === 200 && r.body.includes("e2e-asm-quiz") && !r.body.includes("e2e-asm-draft"), String(r.status));
  r = await visit(page(quiz.id), cookie);
  check("approved learner opens the assessment with a start button", r.status === 200 && r.body.includes("Bắt đầu làm bài"), String(r.status));
  r = await visit(page(draft.id), cookie);
  check("draft assessment is 404", r.status === 404, String(r.status));
  r = await visit(page(quizB.id, "", courseB.slug), cookie);
  check("assessment of a course without enrollment is 404", r.status === 404, String(r.status));
  r = await visit(page(quizB.id), cookie);
  check("assessment of another course under this course is 404", r.status === 404, String(r.status));
  r = await visit(page("not-a-uuid"), cookie);
  check("malformed assessment id is 404", r.status === 404, String(r.status));
  r = await visit(page(future.id), cookie);
  check("exam that has not opened shows no start button", r.status === 200 && r.body.includes("Bài thi chưa mở") && !r.body.includes("Bắt đầu làm bài"), String(r.status));
  r = await visit(page(quiz.id, "/take"), cookie);
  check("take page without a running attempt goes back to the assessment", r.location.endsWith(page(quiz.id)), `${r.status} ${r.location}`);

  // A running attempt: saved answers come back, nothing from the answer key does
  const running = await db.attempt.create({
    data: { assessmentId: quiz.id, customerId: learner.id, deadlineAt: new Date(now + 20 * 60_000) },
  });
  await db.answer.create({ data: { attemptId: running.id, exerciseId: writing.id, customerId: learner.id, response: { text: "SAVED-TEXT-e2e stays after closing the tab" } } });
  r = await visit(page(quiz.id, "/take"), cookie);
  check("take page shows both questions and restores the saved text", r.status === 200 && r.body.includes("e2e-asm-choice") && r.body.includes("SAVED-TEXT-e2e"), String(r.status));
  check("take page never carries the answer key", !r.body.includes("answerKey") && !r.body.includes('"correct"'));
  r = await visit(page(quiz.id, `/result/${running.id}`), cookie);
  check("result of a running attempt goes back to the take page", r.location.endsWith(page(quiz.id, "/take")), `${r.status} ${r.location}`);

  // Deadline passed without handing in: the next read closes and grades it
  await db.answer.create({ data: { attemptId: running.id, exerciseId: choice.id, customerId: learner.id, response: { selected: [1] } } });
  const deadline = new Date(now - 60_000);
  await db.attempt.update({ where: { id: running.id }, data: { deadlineAt: deadline } });
  r = await visit(page(quiz.id, "/take"), cookie);
  let attempt = await db.attempt.findUniqueOrThrow({ where: { id: running.id } });
  check("opening the take page after the deadline closes the attempt", r.location.endsWith(page(quiz.id)) && attempt.status === "submitted", `${r.location} ${attempt.status}`);
  check("auto part is graded with the assessment's points, written part waits", Number(attempt.score) === 3, String(attempt.score));
  check("an attempt closed late counts as handed in at its deadline", attempt.submittedAt?.getTime() === deadline.getTime(), String(attempt.submittedAt));
  r = await visit(page(quiz.id, `/result/${running.id}`), cookie);
  check("result shows the score, the waiting note and the quiz solution", r.status === 200 && r.body.includes("Chờ teacher chấm") && r.body.includes("Đáp án: <!-- -->SOLUTION-OPT-e2e"), String(r.status));

  // Exam: one attempt, solution hidden until it closes
  const examAttempt = await db.attempt.create({
    data: { assessmentId: exam.id, customerId: learner.id, deadlineAt: new Date(now - 60_000), answers: { create: { exerciseId: choice.id, customerId: learner.id, response: { selected: [0] } } } },
  });
  r = await visit(page(exam.id), cookie);
  attempt = await db.attempt.findUniqueOrThrow({ where: { id: examAttempt.id } });
  check("exam attempt with no written answer is graded at once", attempt.status === "graded" && Number(attempt.score) === 0, `${attempt.status} ${attempt.score}`);
  check("exam cannot be started a second time", r.body.includes("Bạn đã dùng hết số lượt làm bài") && !r.body.includes("Bắt đầu làm bài"), String(r.status));
  r = await visit(page(exam.id, `/result/${examAttempt.id}`), cookie);
  check("exam result hides the solution while the exam is open", r.status === 200 && !r.body.includes("Đáp án: <!-- -->SOLUTION-OPT-e2e"), String(r.status));
  await db.assessment.update({ where: { id: exam.id }, data: { closesAt: new Date(now - 500) } });
  r = await visit(page(exam.id, `/result/${examAttempt.id}`), cookie);
  check("exam result shows the solution once the exam has closed", r.body.includes("Đáp án: <!-- -->SOLUTION-OPT-e2e"), String(r.status));

  // An exercise deleted after attempts exist stays part of the test, so score and total still match
  await db.exercise.update({ where: { id: choice.id }, data: { deletedAt: new Date() } });
  r = await visit(page(quiz.id, `/result/${running.id}`), cookie);
  check("deleting an exercise later keeps it in finished results", r.body.includes("e2e-asm-choice") && /3(<!-- -->)?\/(<!-- -->)?7/.test(r.body), String(r.status));
  await db.exercise.update({ where: { id: choice.id }, data: { deletedAt: null } });

  // Another learner cannot read this result
  const stranger = await db.customer.upsert({
    where: { email: "e2e-asm-stranger@test.local" },
    update: { tokenVersion: 0, status: "active" },
    create: { email: "e2e-asm-stranger@test.local", fullName: "E2E Asm Stranger", passwordHash: "x" },
  });
  await db.enrollment.upsert({
    where: { courseId_customerId: { courseId: courseA.id, customerId: stranger.id } },
    update: { status: "approved" },
    create: { courseId: courseA.id, customerId: stranger.id, status: "approved" },
  });
  const strangerCookie = `customer_token=${await signSessionToken({ sub: stranger.id, kind: "customer", tv: 0 })}`;
  r = await visit(page(quiz.id, `/result/${running.id}`), strangerCookie);
  check("another learner's result is 404", r.status === 404, String(r.status));

  // Teacher scope: grading queue, grade page, gradebook, assessment editor
  await enroll(courseB.id, "approved");
  const attemptB = await db.attempt.create({ data: { assessmentId: quizB.id, customerId: learner.id, deadlineAt: new Date(now - 1000), status: "graded", score: 1 } });
  const writingB = await mkExercise(courseB.id, "e2e-asm-writing-b", "writing");
  const answerB = await db.answer.create({ data: { exerciseId: writingB.id, customerId: learner.id, response: { text: "course B practice text" } } });
  const answerA = await db.answer.findFirstOrThrow({ where: { attemptId: running.id, exerciseId: writing.id } });
  const teacherCookie = `staff_token=${await signSessionToken({ sub: teacherA.id, kind: "staff", tv: teacherA.tokenVersion })}`;
  const adminCookie = `staff_token=${await signSessionToken({ sub: admin.id, kind: "staff", tv: admin.tokenVersion })}`;

  r = await visit("/admin/grading", teacherCookie);
  check("teacher A's queue has the written answer of course A", r.status === 200 && r.body.includes("e2e-asm-writing"), String(r.status));
  check("teacher A's queue has nothing from course B", !r.body.includes("e2e-asm-writing-b"));
  r = await visit(`/admin/grading/${answerA.id}`, teacherCookie);
  check("teacher A opens the answer with the assessment's max points", r.status === 200 && r.body.includes("SAVED-TEXT-e2e") && /tối đa (<!-- -->)?4\)/.test(r.body), String(r.status));
  r = await visit(`/admin/grading/${answerB.id}`, teacherCookie);
  check("teacher A cannot open an answer of course B", r.status === 404, String(r.status));
  r = await visit(`/admin/grading/${answerB.id}`, adminCookie);
  check("superadmin opens the course B answer (scope check not vacuous)", r.status === 200 && r.body.includes("course B practice text"), String(r.status));
  r = await visit(`/admin/gradebook?course=${courseB.id}`, teacherCookie);
  check("gradebook asked for course B falls back to teacher A's own course", r.status === 200 && r.body.includes("e2e-asm-quiz") && !r.body.includes("e2e-asm-quiz-b"), String(r.status));
  check("gradebook shows the waiting score", r.body.includes("3/7 (chờ chấm)"), "missing 3/7 (chờ chấm)");
  r = await visit("/admin/assessments", teacherCookie);
  check("teacher A lists assessments of own course only", r.status === 200 && r.body.includes("e2e-asm-quiz") && !r.body.includes("e2e-asm-quiz-b"), String(r.status));
  r = await visit(`/admin/courses/${courseA.id}/assessments/${quiz.id}`, teacherCookie);
  check("teacher A opens the editor; questions are locked after an attempt", r.status === 200 && r.body.includes("danh sách câu hỏi được giữ nguyên"), String(r.status));
  r = await visit(`/admin/courses/${courseB.id}/assessments/${quizB.id}`, teacherCookie);
  check("teacher A cannot open the editor of course B", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseA.id}/assessments/${quizB.id}`, teacherCookie);
  check("assessment of course B under course A's URL is 404", r.status === 404, String(r.status));
  r = await visit("/admin/grading", cookie);
  check("learner session cannot open the grading queue", r.status !== 200, String(r.status));

  // Voice recordings: only the learner who recorded and teachers of that course may listen
  const speakingB = await db.exercise.create({ data: { courseId: courseB.id, type: "speaking", prompt: "e2e-asm-speaking-b", status: "published", data: { maxSeconds: 30 } } });
  const media = await db.mediaFile.create({ data: { kind: "recording", storageKey: `recordings/e2e-asm-${Date.now()}.webm`, mime: "audio/webm", sizeBytes: 1 } });
  const spoken = await db.answer.create({ data: { exerciseId: speakingB.id, customerId: learner.id, mediaId: media.id } });
  const listen = `/api/recordings/${spoken.id}`;
  r = await visit(listen, cookie);
  check("the learner who recorded gets a storage link", r.status === 302 && r.location.includes("X-Amz-Signature"), `${r.status}`);
  r = await visit(listen, strangerCookie);
  check("another learner cannot listen", r.status === 404, String(r.status));
  r = await visit(listen, teacherCookie);
  check("teacher A cannot listen to a recording of course B", r.status === 404, String(r.status));
  r = await visit(listen, adminCookie);
  check("superadmin can listen (scope check not vacuous)", r.status === 302, String(r.status));
  r = await visit(listen);
  check("signed-out visitor cannot listen", r.status === 404, String(r.status));
  r = await visit(`/api/recordings/${answerB.id}`, cookie);
  check("an answer without a recording is 404", r.status === 404, String(r.status));

  await db.attempt.delete({ where: { id: attemptB.id } });
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exitCode = failures ? 1 : 0;
}

main().finally(() => db.$disconnect());
