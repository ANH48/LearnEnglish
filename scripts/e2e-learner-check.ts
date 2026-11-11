// End-to-end check of the learner area against a running app (default http://localhost:3457):
// public pages, enrollment gate, and that answers never reach the learner's browser.
// Run from the repo root: npx tsx --env-file=.env scripts/e2e-learner-check.ts
import { PrismaClient } from "@prisma/client";
import { buildExerciseContent } from "../features/exercises/exercise-content";
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

async function main() {
  const admin = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true } });
  const passwordHash = await hashPassword("irrelevant-password");

  const mkCourse = async (slug: string, status: "draft" | "published") =>
    db.course.upsert({ where: { slug }, update: { status, deletedAt: null }, create: { title: slug, slug, status, createdBy: admin.id } });
  const open = await mkCourse("e2e-learn-open", "published");
  const other = await mkCourse("e2e-learn-other", "published");
  const draft = await mkCourse("e2e-learn-draft", "draft");

  const mkLesson = async (courseId: string, title: string, status: "draft" | "published") =>
    (await db.lesson.findFirst({ where: { courseId, title } })) ??
    db.lesson.create({ data: { courseId, title, status, content: `# ${title}\n\nSome **bold** text.` } });
  const lesson = await mkLesson(open.id, "e2e-lesson-published", "published");
  const hiddenLesson = await mkLesson(open.id, "e2e-lesson-draft", "draft");
  const otherLesson = await mkLesson(other.id, "e2e-lesson-other", "published");

  // Soft-deleted lesson in the open course, and a soft-deleted course with one lesson
  const softLesson = (await db.lesson.findFirst({ where: { courseId: open.id, title: "e2e-lesson-soft" } })) ?? (await db.lesson.create({ data: { courseId: open.id, title: "e2e-lesson-soft", status: "published", content: "# soft" } }));
  await db.lesson.update({ where: { id: softLesson.id }, data: { deletedAt: new Date() } });
  const deletedCourse = await db.course.upsert({
    where: { slug: "e2e-learn-deleted" },
    update: { status: "published", deletedAt: new Date() },
    create: { title: "e2e-learn-deleted", slug: "e2e-learn-deleted", status: "published", createdBy: admin.id, deletedAt: new Date() },
  });
  const deletedCourseLesson = (await db.lesson.findFirst({ where: { courseId: deletedCourse.id } })) ?? (await db.lesson.create({ data: { courseId: deletedCourse.id, title: "e2e-lesson-in-deleted", status: "published", content: "# x" } }));

  const content = buildExerciseContent("listening", {
    transcript: "SECRET-TRANSCRIPT-e2e",
    options: ["visible-option-one", "visible-option-two"],
    correct: [1],
  });
  if (!content.ok) throw new Error(content.error);
  if (!(await db.exercise.findFirst({ where: { lessonId: lesson.id } }))) {
    await db.exercise.create({
      data: { courseId: open.id, lessonId: lesson.id, type: "listening", prompt: "e2e-prompt", status: "published", data: content.data as object, answerKey: content.answerKey as object },
    });
    await db.exercise.create({
      data: { courseId: open.id, lessonId: lesson.id, type: "multiple_choice", prompt: "e2e-draft-exercise", status: "draft", data: { options: ["x", "y"] }, answerKey: { correct: [0] } },
    });
  }

  const learner = await db.customer.upsert({
    where: { email: "e2e-learner@test.local" },
    update: { tokenVersion: 0, status: "active" },
    create: { email: "e2e-learner@test.local", fullName: "E2E Learner", passwordHash },
  });
  const cookie = `customer_token=${await signSessionToken({ sub: learner.id, kind: "customer", tv: 0 })}`;
  const setEnrollment = async (status: "pending" | "approved" | "rejected" | "cancelled" | null) => {
    const key = { courseId_customerId: { courseId: open.id, customerId: learner.id } };
    if (status === null) await db.enrollment.deleteMany({ where: { courseId: open.id, customerId: learner.id } });
    else await db.enrollment.upsert({ where: key, update: { status }, create: { courseId: open.id, customerId: learner.id, status } });
  };
  const lessonPath = `/learn/${open.slug}/${lesson.id}`;

  // Public pages
  let r = await visit("/");
  check("landing lists published courses only", r.status === 200 && r.body.includes("e2e-learn-open") && !r.body.includes("e2e-learn-draft"), String(r.status));
  r = await visit(`/courses/${open.slug}`);
  check("public course page shows published lesson titles only", r.status === 200 && r.body.includes("e2e-lesson-published") && !r.body.includes("e2e-lesson-draft"), String(r.status));
  check("public course page does not show lesson content or exercises", !r.body.includes("e2e-prompt") && !r.body.includes("Some <strong>"));
  r = await visit(`/courses/${draft.slug}`);
  check("draft course page is 404", r.status === 404, String(r.status));
  r = await visit("/login");
  check("login page renders", r.status === 200 && r.body.includes("Đăng nhập"), String(r.status));
  r = await visit("/register");
  check("register page renders", r.status === 200 && r.body.includes("Tạo tài khoản học viên"), String(r.status));

  // Enrollment gate
  r = await visit("/learn");
  check("no session -> /learn redirects to /login", r.location.endsWith("/login"), r.location);
  for (const status of [null, "pending", "rejected", "cancelled"] as const) {
    await setEnrollment(status);
    r = await visit(`/learn/${open.slug}`, cookie);
    check(`enrollment ${status ?? "none"} -> course content is 404`, r.status === 404, String(r.status));
    r = await visit(lessonPath, cookie);
    check(`enrollment ${status ?? "none"} -> lesson is 404`, r.status === 404, String(r.status));
  }

  await setEnrollment("approved");
  r = await visit("/learn", cookie);
  check("my courses lists the approved course", r.status === 200 && r.body.includes("e2e-learn-open"), String(r.status));
  r = await visit(`/learn/${open.slug}`, cookie);
  check("approved learner sees published lessons only", r.status === 200 && r.body.includes("e2e-lesson-published") && !r.body.includes("e2e-lesson-draft"), String(r.status));
  r = await visit(lessonPath, cookie);
  check("approved learner opens the lesson with rendered markdown", r.status === 200 && r.body.includes("<strong>bold</strong>"), String(r.status));
  check("lesson shows published exercise and its options", r.body.includes("e2e-prompt") && r.body.includes("visible-option-two"));
  check("lesson hides draft exercises", !r.body.includes("e2e-draft-exercise"));
  check("answer key and listening transcript never reach the browser", !r.body.includes("SECRET-TRANSCRIPT") && !r.body.includes("answerKey") && !r.body.includes('"correct"'));
  r = await visit(`/learn/${open.slug}/${hiddenLesson.id}`, cookie);
  check("draft lesson is 404", r.status === 404, String(r.status));
  r = await visit(`/learn/${open.slug}/${otherLesson.id}`, cookie);
  check("lesson of another course under this course is 404", r.status === 404, String(r.status));
  r = await visit(`/learn/${other.slug}`, cookie);
  check("course without enrollment is 404", r.status === 404, String(r.status));
  r = await visit(`/learn/${open.slug}/not-a-uuid`, cookie);
  check("malformed lesson id is 404", r.status === 404, String(r.status));

  // Soft-deleted lesson and course (learner approved in both)
  await db.enrollment.upsert({
    where: { courseId_customerId: { courseId: deletedCourse.id, customerId: learner.id } },
    update: { status: "approved" },
    create: { courseId: deletedCourse.id, customerId: learner.id, status: "approved" },
  });
  r = await visit(`/learn/${open.slug}/${softLesson.id}`, cookie);
  check("soft-deleted lesson of an open course is 404", r.status === 404, String(r.status));
  r = await visit(`/learn/${open.slug}`, cookie);
  check("soft-deleted lesson title is not listed", r.status === 200 && !r.body.includes("e2e-lesson-soft"), String(r.status));
  r = await visit(`/learn/${deletedCourse.slug}`, cookie);
  check("soft-deleted course is 404 even when approved", r.status === 404, String(r.status));
  r = await visit(`/learn/${deletedCourse.slug}/${deletedCourseLesson.id}`, cookie);
  check("lesson of soft-deleted course is 404", r.status === 404, String(r.status));
  r = await visit("/learn", cookie);
  check("soft-deleted course is not in my courses", r.status === 200 && !r.body.includes("e2e-learn-deleted"), String(r.status));

  // Staff sessions: public course page open, learner area blocked
  const staffCookie = `staff_token=${await signSessionToken({ sub: admin.id, kind: "staff", tv: admin.tokenVersion })}`;
  r = await visit(`/courses/${open.slug}`, staffCookie);
  check("staff session opens public course page", r.status === 200 && r.body.includes("e2e-lesson-published"), String(r.status));
  r = await visit("/learn", staffCookie);
  check("staff session blocked from /learn", r.location.includes("/blocked?as=staff"), `${r.status} ${r.location}`);

  // Teacher A must not list enrollments of courses A does not teach (fixtures from e2e-guard-check)
  const teacherA = await db.staff.findUnique({ where: { email: "teacher-a@test.local" } });
  const courseA = await db.course.findUnique({ where: { slug: "e2e-course-a" } });
  const courseB = await db.course.findUnique({ where: { slug: "e2e-course-b" } });
  if (!teacherA || !courseA || !courseB) {
    check("guard fixtures present (run e2e-guard-check first)", false, "missing teacher-a / e2e-course-a / e2e-course-b");
  } else {
    for (const c of [courseA, courseB]) {
      await db.enrollment.upsert({
        where: { courseId_customerId: { courseId: c.id, customerId: learner.id } },
        update: { status: "pending" },
        create: { courseId: c.id, customerId: learner.id, status: "pending" },
      });
    }
    const teacherCookie = `staff_token=${await signSessionToken({ sub: teacherA.id, kind: "staff", tv: teacherA.tokenVersion })}`;
    r = await visit("/admin/enrollments", teacherCookie);
    check("teacher A sees pending request of own course", r.status === 200 && r.body.includes("e2e-course-a"), String(r.status));
    check("teacher A does not see enrollments of course B", !r.body.includes("e2e-course-b"), String(r.status));
    r = await visit("/admin/enrollments", staffCookie);
    check("superadmin sees course B enrollment (scope check not vacuous)", r.status === 200 && r.body.includes("e2e-course-b"), String(r.status));
    await db.enrollment.deleteMany({ where: { customerId: learner.id, courseId: { in: [courseA.id, courseB.id] } } });
  }

  // Account state
  await db.course.update({ where: { id: open.id }, data: { status: "draft" } });
  r = await visit(lessonPath, cookie);
  check("unpublishing the course closes it for approved learners", r.status === 404, String(r.status));
  await db.course.update({ where: { id: open.id }, data: { status: "published" } });
  await db.customer.update({ where: { id: learner.id }, data: { status: "locked" } });
  r = await visit("/learn", cookie);
  check("locked learner is treated as signed out", r.location.endsWith("/login"), r.location);
  await db.customer.update({ where: { id: learner.id }, data: { status: "active" } });

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exitCode = failures ? 1 : 0;
}

main().finally(() => db.$disconnect());
