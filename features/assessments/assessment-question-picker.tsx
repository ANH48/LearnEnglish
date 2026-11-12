import { ActionForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXERCISE_TYPE_LABELS, type ExerciseTypeName } from "@/features/exercises/exercise-content";
import { saveAssessmentQuestionsAction } from "./assessment-actions";

export type PickerRow = {
  id: string;
  prompt: string;
  type: string;
  lessonTitle: string | null;
  /** Points to show: the assessment's own value when picked, else the exercise's. */
  points: number;
  /** Position inside the assessment, or null when not picked. */
  position: number | null;
};

/** Tick the course exercises that make up the assessment, with points and order for each. */
export function AssessmentQuestionPicker({ courseId, assessmentId, rows, locked }: { courseId: string; assessmentId: string; rows: PickerRow[]; locked: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Khóa học chưa có bài tập nào để chọn.</p>;

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chọn</TableHead>
          <TableHead>Đề bài</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Bài học</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Thứ tự</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <input type="checkbox" name="exerciseId" value={row.id} defaultChecked={row.position !== null} disabled={locked} aria-label={`Chọn: ${row.prompt}`} />
            </TableCell>
            <TableCell className="max-w-sm">
              <span className="line-clamp-2 whitespace-normal">{row.prompt}</span>
            </TableCell>
            <TableCell>{EXERCISE_TYPE_LABELS[row.type as ExerciseTypeName]}</TableCell>
            <TableCell>{row.lessonTitle ?? "—"}</TableCell>
            <TableCell>
              <Input name={`points-${row.id}`} type="number" min={1} max={100} defaultValue={row.points} disabled={locked} aria-label="Điểm" className="w-20" />
            </TableCell>
            <TableCell>
              <Input name={`order-${row.id}`} type="number" min={0} max={999} defaultValue={row.position !== null ? row.position + 1 : 0} disabled={locked} aria-label="Thứ tự" className="w-20" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (locked) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">Đã có học viên làm bài nên danh sách câu hỏi được giữ nguyên.</p>
        {table}
      </div>
    );
  }
  return (
    <ActionForm action={saveAssessmentQuestionsAction.bind(null, courseId, assessmentId)} submitLabel="Lưu câu hỏi">
      {table}
    </ActionForm>
  );
}
