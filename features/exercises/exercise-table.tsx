import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteExerciseAction } from "./exercise-actions";
import { EXERCISE_TYPE_LABELS, type ExerciseTypeName } from "./exercise-content";

type Row = { id: string; type: string; prompt: string; points: number; status: string };

export function ExerciseTable({ courseId, exercises }: { courseId: string; exercises: Row[] }) {
  if (exercises.length === 0) return <p className="text-sm text-muted-foreground">Chưa có bài tập nào.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Đề bài</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {exercises.map((exercise) => (
          <TableRow key={exercise.id}>
            <TableCell className="max-w-md">
              <Link href={`/admin/courses/${courseId}/exercises/${exercise.id}`} className="line-clamp-2 font-medium whitespace-normal hover:underline">
                {exercise.prompt}
              </Link>
            </TableCell>
            <TableCell>{EXERCISE_TYPE_LABELS[exercise.type as ExerciseTypeName]}</TableCell>
            <TableCell className="tabular-nums">{exercise.points}</TableCell>
            <TableCell>
              <Badge variant={exercise.status === "published" ? "default" : "secondary"}>{statusLabel(exercise.status)}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <ConfirmActionButton
                action={deleteExerciseAction.bind(null, courseId, exercise.id)}
                label="Xóa"
                variant="destructive"
                confirmMessage="Xóa bài tập này?"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
