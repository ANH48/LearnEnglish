// End-to-end check of route guards and course scope against a running app (default http://localhost:3457).
// Run from the repo root: npx tsx --env-file=.env scripts/e2e-guard-check.ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password-hashing";
import { signSessionToken } from "../lib/auth/session-jwt";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3457";
const db = new PrismaClient();
let failures = 0;

async function visit(path: string, cookie?: string) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: res.status, location: res.headers.get("location") ?? "", body: res.status === 200 ? await res.text() : "" };
}

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
}

async function main() {
  const teacherGroup = await db.permissionGroup.findUniqueOrThrow({ where: { name: "Teacher" } });
  const passwordHash = await hashPassword("irrelevant-password");
  const mk = (email: string) =>
    db.staff.upsert({
      where: { email },
      update: { tokenVersion: 0, status: "active" },
      create: { email, fullName: email, passwordHash, groups: { create: { groupId: teacherGroup.id } } },
    });
  const [a, b] = [await mk("teacher-a@test.local"), await mk("teacher-b@test.local")];
  const admin = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true } });
  const mkCourse = async (slug: string, staffId: string) =>
    (await db.course.findUnique({ where: { slug } })) ??
    db.course.create({ data: { title: slug, slug, createdBy: staffId, teachers: { create: { staffId } } } });
  const [courseA, courseB] = [await mkCourse("e2e-course-a", a.id), await mkCourse("e2e-course-b", b.id)];
  const customer = await db.customer.upsert({
    where: { email: "learner@test.local" },
    update: {},
    create: { email: "learner@test.local", fullName: "Learner", passwordHash },
  });

  const staffCookie = async (id: string, tv = 0) => `staff_token=${await signSessionToken({ sub: id, kind: "staff", tv })}`;
  const adminC = await staffCookie(admin.id, admin.tokenVersion);
  const aC = await staffCookie(a.id);
  const customerC = `customer_token=${await signSessionToken({ sub: customer.id, kind: "customer", tv: 0 })}`;

  let r = await visit("/admin");
  check("no session -> /admin redirects to login", r.status === 307 && r.location.endsWith("/admin/login"), JSON.stringify(r));
  r = await visit("/admin/login");
  check("login page renders", r.status === 200 && r.body.includes("Đăng nhập quản trị"), String(r.status));
  r = await visit("/admin", customerC);
  check("learner session blocked from /admin", r.location.includes("/blocked?as=customer"), JSON.stringify(r));
  r = await visit("/admin/login", customerC);
  check("learner session blocked from /admin/login", r.location.includes("/blocked?as=customer"), JSON.stringify(r));
  r = await visit("/learn", adminC);
  check("staff session blocked from /learn", r.location.includes("/blocked?as=staff"), JSON.stringify(r));
  r = await visit("/learn");
  check("no session -> /learn redirects to /login", r.location.endsWith("/login"), JSON.stringify(r));
  // A learner token placed in the staff cookie must not work.
  r = await visit("/admin", customerC.replace("customer_token", "staff_token"));
  check("learner token in staff cookie rejected", r.location.endsWith("/admin/login"), JSON.stringify(r));

  r = await visit("/admin", adminC);
  check("superadmin opens dashboard", r.status === 200 && r.body.includes("Group quyền"), String(r.status));
  r = await visit("/admin/groups", adminC);
  check("superadmin opens groups", r.status === 200 && r.body.includes("Teacher"), String(r.status));

  r = await visit("/admin", aC);
  check("teacher menu hides groups/staff/customers", r.status === 200 && !r.body.includes("Group quyền") && !r.body.includes('href="/admin/customers"'), String(r.status));
  r = await visit("/admin/groups", aC);
  check("teacher cannot open groups", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit("/admin/customers", aC);
  check("teacher cannot open customers", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit("/admin/courses", aC);
  check("teacher A list shows only own course", r.body.includes("e2e-course-a") && !r.body.includes("e2e-course-b"), String(r.status));
  r = await visit(`/admin/courses/${courseA.id}`, aC);
  check("teacher A opens own course", r.status === 200, String(r.status));
  r = await visit(`/admin/courses/${courseB.id}`, aC);
  check("teacher A cannot open teacher B's course", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseB.id}/lessons/new`, aC);
  check("teacher A cannot add lesson to B's course", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseB.id}`, adminC);
  check("superadmin opens any course", r.status === 200, String(r.status));

  // Teacher must not reach staff/category admin pages, or another course's lesson/exercise ids under their own course.
  const lessonB =
    (await db.lesson.findFirst({ where: { courseId: courseB.id, title: "e2e-lesson-b" } })) ??
    (await db.lesson.create({ data: { courseId: courseB.id, title: "e2e-lesson-b" } }));
  const exerciseB =
    (await db.exercise.findFirst({ where: { courseId: courseB.id, prompt: "e2e-exercise-b" } })) ??
    (await db.exercise.create({
      data: { courseId: courseB.id, lessonId: lessonB.id, type: "writing", prompt: "e2e-exercise-b" },
    }));
  const categoryId = (await db.category.findFirst())?.id ?? "00000000-0000-4000-8000-000000000000";
  r = await visit("/admin/staff", aC);
  check("teacher cannot open staff list", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit("/admin/staff/new", aC);
  check("teacher cannot open new staff form", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit(`/admin/staff/${b.id}`, aC);
  check("teacher cannot open staff detail", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit("/admin/categories", aC);
  check("teacher cannot open categories", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit(`/admin/categories/${categoryId}`, aC);
  check("teacher cannot open category detail", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit("/admin/groups/new", aC);
  check("teacher cannot open new group form", r.location.includes("/admin/forbidden"), JSON.stringify(r));
  r = await visit(`/admin/courses/${courseA.id}/lessons/new`, aC);
  check("teacher A opens new lesson in own course", r.status === 200, String(r.status));
  r = await visit(`/admin/courses/${courseA.id}/exercises/new`, aC);
  check("teacher A opens new exercise in own course", r.status === 200, String(r.status));
  r = await visit(`/admin/courses/${courseA.id}/lessons/${lessonB.id}`, aC);
  check("teacher A cannot open B's lesson id under own course", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseA.id}/exercises/${exerciseB.id}`, aC);
  check("teacher A cannot open B's exercise id under own course", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseB.id}/exercises/${exerciseB.id}`, aC);
  check("teacher A cannot open B's exercise under B's course", r.status === 404, String(r.status));
  r = await visit(`/admin/courses/${courseB.id}/lessons/${lessonB.id}`, adminC);
  check("superadmin opens B's lesson", r.status === 200, String(r.status));

  for (const path of ["/admin/courses/not-a-uuid", "/admin/categories/not-a-uuid", "/admin/staff/not-a-uuid", "/admin/groups/not-a-uuid", "/admin/customers/not-a-uuid"]) {
    r = await visit(path, adminC);
    check(`malformed id is 404, not a server error: ${path}`, r.status === 404, String(r.status));
  }

  await db.staff.update({ where: { id: a.id }, data: { tokenVersion: { increment: 1 } } });
  r = await visit("/admin", aC);
  check("old token dead after token_version bump", r.location.endsWith("/admin/login"), JSON.stringify(r));
  await db.staff.update({ where: { id: b.id }, data: { status: "locked" } });
  r = await visit("/admin", await staffCookie(b.id));
  check("locked account treated as signed out", r.location.endsWith("/admin/login"), JSON.stringify(r));

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exitCode = failures ? 1 : 0;
}

main().finally(() => db.$disconnect());
