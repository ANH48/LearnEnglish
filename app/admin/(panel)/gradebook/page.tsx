import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { finalizeExpiredAttempts } from "@/features/attempts/finalize-attempt";
import { gradebookCell } from "@/features/gradebook/gradebook-cell";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

/** Scores of one course: a row per approved learner, a column per assessment, best finished score in each cell. */
export default async function GradebookPage({ searchParams }: { searchParams: Promise<{ course?: string | string[] }> }) {
  const staff = await requirePermission("grading.manual");
  const courses = await db.course.findMany({ where: courseScopeWhere(staff), orderBy: { title: "asc" }, select: { id: true, title: true } });
  const { course: requested } = await searchParams;
  // An id outside the actor's scope simply does not match and falls back to the first course.
  const course = courses.find((c) => c.id === requested) ?? courses[0];

  if (!course) {
    return (
      <>
        <PageHeader title="Bảng điểm" />
        <p className="text-sm text-muted-foreground">Bạn chưa phụ trách khóa học nào.</p>
      </>
    );
  }

  await finalizeExpiredAttempts({ assessment: { courseId: course.id } });
  const [assessments, enrollments, attempts] = await Promise.all([
    db.assessment.findMany({
      where: { courseId: course.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, exercises: { select: { points: true } } },
    }),
    db.enrollment.findMany({
      where: { courseId: course.id, status: "approved", customer: { deletedAt: null } },
      orderBy: { customer: { fullName: "asc" } },
      select: { customer: { select: { id: true, fullName: true, email: true } } },
    }),
    db.attempt.findMany({ where: { assessment: { courseId: course.id } }, select: { assessmentId: true, customerId: true, status: true, score: true } }),
  ]);
  const cell = (customerId: string, assessment: (typeof assessments)[number]) =>
    gradebookCell(
      attempts.filter((a) => a.customerId === customerId && a.assessmentId === assessment.id),
      assessment.exercises.reduce((sum, link) => sum + link.points, 0),
    );

  return (
    <>
      <PageHeader title="Bảng điểm" description="Mỗi ô là điểm cao nhất trong các lượt đã nộp." />
      <div className="grid gap-6">
        <form method="get" className="flex max-w-md items-end gap-2">
          <div className="flex-1">
            <FormField label="Khóa học" htmlFor="course">
              <select id="course" name="course" defaultValue={course.id} className={nativeSelectClass}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <Button type="submit" variant="outline">
            Xem
          </Button>
        </form>

        {assessments.length === 0 && <p className="text-sm text-muted-foreground">Khóa học chưa có bài kiểm tra nào.</p>}
        {assessments.length > 0 && enrollments.length === 0 && <p className="text-sm text-muted-foreground">Khóa học chưa có học viên nào được duyệt.</p>}
        {assessments.length > 0 && enrollments.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                {assessments.map((assessment) => (
                  <TableHead key={assessment.id}>{assessment.title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map(({ customer }) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <span className="font-medium">{customer.fullName}</span>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </TableCell>
                  {assessments.map((assessment) => (
                    <TableCell key={assessment.id} className="tabular-nums">
                      {cell(customer.id, assessment)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
