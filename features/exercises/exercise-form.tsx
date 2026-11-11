import { ActionForm } from "@/components/admin/action-form";
import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveExerciseAction } from "./exercise-actions";
import { type EditorPayload, type ExerciseTypeName, defaultEditorPayload } from "./exercise-content";
import { ExerciseContentEditor } from "./exercise-content-editor";

type Props = {
  courseId: string;
  lessons: { id: string; title: string }[];
  /** Preselected lesson when creating from a lesson page. */
  defaultLessonId?: string;
  exercise?: {
    id: string;
    type: ExerciseTypeName;
    prompt: string;
    points: number;
    status: string;
    lessonId: string | null;
    payload: EditorPayload[ExerciseTypeName];
  };
};

export function ExerciseForm({ courseId, lessons, defaultLessonId, exercise }: Props) {
  const type = exercise?.type ?? "multiple_choice";
  return (
    <ActionForm action={saveExerciseAction.bind(null, courseId, exercise?.id ?? null)}>
      <FormField label="Đề bài" htmlFor="prompt">
        <Textarea id="prompt" name="prompt" defaultValue={exercise?.prompt} required maxLength={2000} />
      </FormField>
      <ExerciseContentEditor initialType={type} initialPayload={exercise?.payload ?? defaultEditorPayload(type)} />
      <FormField
        label="Thuộc bài học"
        htmlFor="lessonId"
        hint="Bài tập không gắn bài học chỉ dùng trong bài kiểm tra."
      >
        <select
          id="lessonId"
          name="lessonId"
          defaultValue={exercise ? (exercise.lessonId ?? "") : (defaultLessonId ?? "")}
          className={nativeSelectClass}
        >
          <option value="">Không gắn bài học</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Điểm" htmlFor="points">
        <Input id="points" name="points" type="number" min={1} max={100} defaultValue={exercise?.points ?? 1} required />
      </FormField>
      <FormField label="Trạng thái" htmlFor="status">
        <select id="status" name="status" defaultValue={exercise?.status ?? "draft"} className={nativeSelectClass}>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </FormField>
    </ActionForm>
  );
}
