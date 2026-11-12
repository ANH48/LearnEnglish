// End-to-end check of a lesson built from blocks, against a running app (default http://localhost:3457):
// the page shows every section without leaking answers, audio is served only to people who may hear it,
// and a fill-in exercise marked "teacher grades" lands in the grading queue ungraded.
// Import the lesson first (scripts/import-day-lesson.ts).
// Run from the repo root: npx tsx --env-file=.env scripts/e2e-day-lesson-check.ts  (other day: E2E_DAY_TITLE="Ngày 2")
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { blockAudioIds, parseLessonBlocks } from "../features/lesson-blocks/lesson-blocks";
import { hashPassword } from "../lib/auth/password-hashing";
import { signSessionToken } from "../lib/auth/session-jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3457";
const COURSE_SLUG = "1000-cau-50-ngay";
// A new random password on every run: this repo is public and the check may run against a real database.
// Delete the two e2e-day-lesson accounts afterwards when that database is not a throwaway one.
const LEARNER = { email: "e2e-day-lesson@example.test", password: randomUUID() };
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

async function learnerCookie(email: string, password: string, courseId: string | null) {
  const passwordHash = await hashPassword(password);
  const learner = await db.customer.upsert({
    where: { email },
    update: { passwordHash, status: "active", deletedAt: null, tokenVersion: 0 },
    create: { email, fullName: "E2E Day Lesson", passwordHash },
  });
  if (courseId) {
    await db.enrollment.upsert({
      where: { courseId_customerId: { courseId, customerId: learner.id } },
      update: { status: "approved" },
      create: { courseId, customerId: learner.id, status: "approved" },
    });
  }
  return { id: learner.id, cookie: `customer_token=${await signSessionToken({ sub: learner.id, kind: "customer", tv: 0 })}` };
}

async function main() {
  const course = await db.course.findUniqueOrThrow({ where: { slug: COURSE_SLUG } });
  const lesson = await db.lesson.findFirstOrThrow({
    where: { courseId: course.id, deletedAt: null, title: { startsWith: process.env.E2E_DAY_TITLE ?? "Ngày 1" } },
    include: { exercises: { where: { deletedAt: null } } },
  });
  const blocks = parseLessonBlocks(lesson.blocks);
  const audioIds = blockAudioIds(blocks);
  const enrolled = await learnerCookie(LEARNER.email, LEARNER.password, course.id);
  const outsider = await learnerCookie("e2e-day-lesson-outsider@example.test", randomUUID(), null);
  const staff = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true, deletedAt: null } });
  const staffCookie = `staff_token=${await signSessionToken({ sub: staff.id, kind: "staff", tv: staff.tokenVersion })}`;

  check("lesson has the six blocks", blocks.map((b) => b.type).join() === "sentences,notes,exercise,story,vocabulary,translation", blocks.map((b) => b.type).join());
  check("lesson has four audio files", audioIds.length === 4, String(audioIds.length));

  const page = await visit(`/learn/${COURSE_SLUG}/${lesson.id}`, enrolled.cookie);
  check("lesson page opens for an approved learner", page.status === 200, String(page.status));
  check("sentences are shown with bold", /<strong[^>]*>does not work<\/strong>/.test(page.body));
  check("structure notes are shown", page.body.includes("It takes ... about ..."));
  check("fill-in exercise is shown", page.body.includes("Điền từ còn thiếu vào chỗ trống."));
  // The script travels in the page data for the "show" button, but is not rendered until asked.
  check("story script is hidden until asked", !page.body.includes("<span>Everybody talks about it") && page.body.includes("Hiện lời truyện"));
  check("vocabulary and translation are shown", page.body.includes("cái ghế") && page.body.includes("Ai cũng nói về nó."));
  // "takes" and "tell" appear in the sentences on purpose; the vocabulary alternates do not appear anywhere else.
  check("vocabulary quiz answers are not in the page", !page.body.includes("sửa chữa") && !page.body.includes("bữa ăn tối"));
  check("lesson page is closed to a learner outside the course", (await visit(`/learn/${COURSE_SLUG}/${lesson.id}`, outsider.cookie)).status === 404);

  for (const mediaId of audioIds) {
    const path = `/api/lesson-audio/${lesson.id}/${mediaId}`;
    const hit = await visit(path, enrolled.cookie);
    const file = hit.location ? await fetch(hit.location) : null;
    const size = file ? (await file.arrayBuffer()).byteLength : 0;
    check(`audio ${mediaId.slice(0, 8)} plays for the learner`, hit.status >= 300 && hit.status < 400 && file?.status === 200 && file.headers.get("content-type") === "audio/mpeg" && size > 100_000, `${hit.status} ${file?.status} ${size}`);
  }
  const audioPath = `/api/lesson-audio/${lesson.id}/${audioIds[0]}`;
  check("audio is closed without a session", (await visit(audioPath)).status === 404);
  check("audio is closed to a learner outside the course", (await visit(audioPath, outsider.cookie)).status === 404);
  const staffHit = await visit(audioPath, staffCookie);
  check("audio plays for staff of the course", staffHit.status >= 300 && staffHit.status < 400, String(staffHit.status));
  const recording = await db.mediaFile.findFirst({ where: { id: { notIn: audioIds } } });
  if (recording) check("a file the lesson does not list is not served", (await visit(`/api/lesson-audio/${lesson.id}/${recording.id}`, enrolled.cookie)).status === 404);

  // The grading queue picks up an ungraded practice answer of the teacher-graded fill-in exercise.
  const fillBlank = lesson.exercises.find((e) => (e.data as { teacherGraded?: boolean }).teacherGraded === true);
  check("fill-in exercise is marked for the teacher", fillBlank !== undefined);
  if (fillBlank) {
    await db.answer.deleteMany({ where: { customerId: enrolled.id, exerciseId: fillBlank.id, attemptId: null } });
    const answer = await db.answer.create({
      data: { customerId: enrolled.id, exerciseId: fillBlank.id, response: { answers: ["does", "Does", "takes", "take", "tell", "for", "cannot", "Can"] } },
    });
    const queue = await visit("/admin/grading", staffCookie);
    check("answer waits in the grading queue", queue.status === 200 && queue.body.includes(`/admin/grading/${answer.id}`), String(queue.status));
    const grading = await visit(`/admin/grading/${answer.id}`, staffCookie);
    check("grading page shows the answer and the key", grading.status === 200 && grading.body.includes("does; Does; takes") && grading.body.includes("cannot / can not"), String(grading.status));
    const again = await visit(`/learn/${COURSE_SLUG}/${lesson.id}`, enrolled.cookie);
    check("learner sees the answer is waiting for the teacher", again.body.includes("đang chờ teacher chấm"));
    await db.answer.delete({ where: { id: answer.id } });
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
