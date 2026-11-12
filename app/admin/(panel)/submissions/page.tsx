import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUBMISSION_PAGE_SIZE, listSubmissions, submissionFilters } from "@/features/practice-submissions/submission-list-query";
import { requirePermission } from "@/lib/auth/current-staff";

const vnTime = (date: Date) =>
  date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Every practice submit in a course, newest first: who, when, which exercise, the score and what was wrong. */
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ course?: string | string[]; learner?: string | string[] }> }) {
  const staff = await requirePermission("grading.manual");
  const params = await searchParams;
  const { courses, course, learners } = await submissionFilters(staff, first(params.course));

  if (!course) {
    return (
      <>
        <PageHeader title="Lượt nộp bài" />
        <p className="text-sm text-muted-foreground">Bạn chưa phụ trách khóa học nào.</p>
      </>
    );
  }

  // Only learners listed for this course can be picked; anything else shows the whole course.
  const learner = learners.find((l) => l.id === first(params.learner)) ?? null;
  const rows = await listSubmissions(course.id, learner?.id ?? null);

  return (
    <>
      <PageHeader title="Lượt nộp bài" description="Mỗi lần học viên nộp bài tập trong bài học là một dòng, kèm điểm và chỗ sai." />
      <div className="grid gap-6">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
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
          <div className="min-w-56 flex-1">
            <FormField label="Học viên" htmlFor="learner">
              <select id="learner" name="learner" defaultValue={learner?.id ?? ""} className={nativeSelectClass}>
                <option value="">Tất cả học viên</option>
                {learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} · {l.email}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <Button type="submit" variant="outline">
            Xem
          </Button>
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có lượt nộp bài nào.</p>
        ) : (
          <>
            {rows.length === SUBMISSION_PAGE_SIZE && (
              <p className="text-sm text-muted-foreground">Đang hiện {SUBMISSION_PAGE_SIZE} lượt mới nhất. Chọn một học viên để xem kỹ hơn.</p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Bài</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Chỗ sai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className="whitespace-nowrap tabular-nums">{vnTime(row.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{row.learner.fullName}</span>
                      <p className="text-xs text-muted-foreground">{row.learner.email}</p>
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal">
                      <span className="font-medium">{row.lessonTitle}</span>
                      <p className="text-xs text-muted-foreground">{row.exercisePrompt}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {row.score === null ? (
                        <Badge variant="secondary">Chờ teacher chấm</Badge>
                      ) : (
                        <Badge variant={row.score === row.maxPoints ? "default" : "outline"}>
                          {row.score}/{row.maxPoints}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal text-sm">
                      {row.recording && <span className="text-muted-foreground">Đã gửi bản thu âm</span>}
                      {!row.recording && row.score !== null && row.mistakes.length === 0 && <span className="text-muted-foreground">Không sai chỗ nào</span>}
                      {row.mistakes.length > 0 && (
                        <ul className="grid gap-1">
                          {row.mistakes.map((m, i) => (
                            <li key={i}>
                              <span className="text-muted-foreground">{m.where}</span>
                              <br />
                              <span className="text-destructive line-through">{m.given}</span> → <span className="font-medium">{m.expected}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </>
  );
}
