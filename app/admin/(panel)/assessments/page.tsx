import Link from "next/link";
import { PageHeader, statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAssessmentsByCourse } from "@/features/assessments/assessment-queries";
import { ASSESSMENT_KIND_LABELS, type AssessmentKindName } from "@/lib/assessments/attempt-rules";
import { requirePermission } from "@/lib/auth/current-staff";

/** Tests and exams of every course the actor may touch, grouped by course. */
export default async function AssessmentsPage() {
  const staff = await requirePermission("assessment.manage");
  const courses = await listAssessmentsByCourse(staff);

  return (
    <>
      <PageHeader title="Bài kiểm tra" description="Bài kiểm tra và bài thi theo từng khóa học." />
      {courses.length === 0 && <p className="text-sm text-muted-foreground">Bạn chưa phụ trách khóa học nào.</p>}
      <div className="grid gap-10">
        {courses.map((course) => (
          <section key={course.id} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <Link href={`/admin/courses/${course.id}/assessments/new`} className={buttonVariants({ size: "sm" })}>
                Thêm bài kiểm tra
              </Link>
            </div>
            {course.assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có bài kiểm tra nào.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên bài</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Phút</TableHead>
                    <TableHead>Số câu</TableHead>
                    <TableHead>Lượt đã làm</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {course.assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <Link href={`/admin/courses/${course.id}/assessments/${assessment.id}`} className="font-medium hover:underline">
                          {assessment.title}
                        </Link>
                      </TableCell>
                      <TableCell>{ASSESSMENT_KIND_LABELS[assessment.kind as AssessmentKindName]}</TableCell>
                      <TableCell className="tabular-nums">{assessment.durationMinutes}</TableCell>
                      <TableCell className="tabular-nums">{assessment._count.exercises}</TableCell>
                      <TableCell className="tabular-nums">{assessment._count.attempts}</TableCell>
                      <TableCell>
                        <Badge variant={assessment.status === "published" ? "default" : "secondary"}>{statusLabel(assessment.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
