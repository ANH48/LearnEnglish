import { ActionForm } from "@/components/admin/action-form";
import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { ASSESSMENT_KIND_LABELS, ASSESSMENT_KINDS } from "@/lib/assessments/attempt-rules";
import { toVietnamLocalInput } from "@/lib/datetime/vietnam-time";
import { saveAssessmentAction } from "./assessment-actions";

type Props = {
  courseId: string;
  assessment?: {
    id: string;
    title: string;
    kind: string;
    durationMinutes: number;
    maxAttempts: number;
    opensAt: Date | null;
    closesAt: Date | null;
    status: string;
  };
};

export function AssessmentForm({ courseId, assessment }: Props) {
  return (
    <ActionForm action={saveAssessmentAction.bind(null, courseId, assessment?.id ?? null)}>
      <FormField label="Tên bài" htmlFor="title">
        <Input id="title" name="title" defaultValue={assessment?.title} required maxLength={200} />
      </FormField>
      <FormField label="Loại" htmlFor="kind" hint="Bài thi có lịch mở/đóng, mỗi học viên làm đúng 1 lần, đáp án hiện sau khi đóng.">
        <select id="kind" name="kind" defaultValue={assessment?.kind ?? "quiz_15"} className={nativeSelectClass}>
          {ASSESSMENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ASSESSMENT_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Thời gian làm bài (phút)" htmlFor="durationMinutes" hint="Loại 15 phút và 60 phút luôn dùng đúng số phút của loại đó.">
        <Input id="durationMinutes" name="durationMinutes" type="number" min={1} max={300} defaultValue={assessment?.durationMinutes ?? 15} required />
      </FormField>
      <FormField label="Số lượt làm tối đa" htmlFor="maxAttempts" hint="Bài thi luôn là 1 lượt.">
        <Input id="maxAttempts" name="maxAttempts" type="number" min={1} max={20} defaultValue={assessment?.maxAttempts ?? 1} required />
      </FormField>
      <FormField label="Giờ mở (chỉ cho bài thi)" htmlFor="opensAt" hint="Giờ Việt Nam.">
        <Input id="opensAt" name="opensAt" type="datetime-local" defaultValue={assessment?.opensAt ? toVietnamLocalInput(assessment.opensAt) : ""} />
      </FormField>
      <FormField label="Giờ đóng (chỉ cho bài thi)" htmlFor="closesAt" hint="Giờ Việt Nam. Bài đang làm tự nộp khi tới giờ đóng.">
        <Input id="closesAt" name="closesAt" type="datetime-local" defaultValue={assessment?.closesAt ? toVietnamLocalInput(assessment.closesAt) : ""} />
      </FormField>
      <FormField label="Trạng thái" htmlFor="status" hint="Học viên chỉ thấy bài đã xuất bản.">
        <select id="status" name="status" defaultValue={assessment?.status ?? "draft"} className={nativeSelectClass}>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </FormField>
    </ActionForm>
  );
}
