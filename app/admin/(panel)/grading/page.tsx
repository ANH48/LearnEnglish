import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { finalizeExpiredAttempts } from "@/features/attempts/finalize-attempt";
import { manualAnswerWhere } from "@/features/manual-grading/grading-queue";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

/** Written and spoken answers waiting for a teacher, oldest first. */
export default async function GradingQueuePage() {
  const staff = await requirePermission("grading.manual");
  // Attempts that ran out of time are closed here, so their written answers show up.
  await finalizeExpiredAttempts({ assessment: { course: courseScopeWhere(staff) } });

  const answers = await db.answer.findMany({
    where: { ...manualAnswerWhere(staff), gradedAt: null },
    orderBy: { updatedAt: "asc" },
    include: {
      customer: { select: { fullName: true } },
      exercise: { select: { prompt: true, course: { select: { title: true } }, lesson: { select: { title: true } } } },
      attempt: { select: { assessment: { select: { title: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="Chấm bài" description="Bài viết và bài nói đang chờ chấm, bài nộp trước xếp trước." />
      {answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có bài nào đang chờ chấm.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Khóa học</TableHead>
              <TableHead>Thuộc</TableHead>
              <TableHead>Đề bài</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {answers.map((answer) => (
              <TableRow key={answer.id}>
                <TableCell className="font-medium">{answer.customer.fullName}</TableCell>
                <TableCell>{answer.exercise.course.title}</TableCell>
                <TableCell>{answer.attempt ? answer.attempt.assessment.title : `Bài học: ${answer.exercise.lesson?.title ?? "—"}`}</TableCell>
                <TableCell className="max-w-sm">
                  <span className="line-clamp-2 whitespace-normal">{answer.exercise.prompt}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/grading/${answer.id}`} className="underline">
                    Chấm
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
