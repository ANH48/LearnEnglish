"use client";

import { useState } from "react";
import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BLANK,
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  type EditorPayload,
  type ExerciseTypeName,
  defaultEditorPayload,
} from "./exercise-content";

type AnyPayload = EditorPayload[ExerciseTypeName];
type Props = { initialType: ExerciseTypeName; initialPayload: AnyPayload };

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

/**
 * Type picker plus the fields for that type. The result is submitted as two
 * form fields: `type` and `payload` (JSON), validated again on the server.
 */
export function ExerciseContentEditor({ initialType, initialPayload }: Props) {
  const [type, setType] = useState(initialType);
  const [payload, setPayload] = useState<AnyPayload>(initialPayload);
  const patch = (changes: Partial<AnyPayload>) => setPayload((current) => ({ ...current, ...changes }) as AnyPayload);

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <FormField label="Loại bài tập" htmlFor="type">
        <select
          id="type"
          name="type"
          value={type}
          className={nativeSelectClass}
          onChange={(event) => {
            const next = event.target.value as ExerciseTypeName;
            setType(next);
            setPayload(defaultEditorPayload(next));
          }}
        >
          {EXERCISE_TYPES.map((t) => (
            <option key={t} value={t}>
              {EXERCISE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </FormField>

      {type === "listening" && (
        <FormField label="Lời thoại" htmlFor="transcript" hint="Câu tiếng Anh sẽ được đọc thành audio. Học viên không thấy phần này.">
          <Textarea
            id="transcript"
            value={(payload as EditorPayload["listening"]).transcript}
            onChange={(e) => patch({ transcript: e.target.value })}
          />
        </FormField>
      )}

      {(type === "multiple_choice" || type === "listening") && (
        <ChoiceRows payload={payload as EditorPayload["multiple_choice"]} onChange={patch} />
      )}

      {type === "fill_blank" && (
        <>
          <FormField label="Câu có chỗ trống" htmlFor="blankText" hint={`Viết ${BLANK} (ba dấu gạch dưới) ở mỗi chỗ trống.`}>
            <Textarea
              id="blankText"
              value={(payload as EditorPayload["fill_blank"]).text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </FormField>
          <FormField label="Đáp án" htmlFor="blankAnswers" hint="Mỗi dòng cho một chỗ trống theo thứ tự. Nhiều đáp án đúng thì ngăn bằng dấu |.">
            <Textarea
              id="blankAnswers"
              defaultValue={(payload as EditorPayload["fill_blank"]).answers.map((a) => a.join(" | ")).join("\n")}
              onChange={(e) =>
                patch({ answers: lines(e.target.value).map((line) => line.split("|").map((a) => a.trim()).filter(Boolean)) })
              }
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(payload as EditorPayload["fill_blank"]).teacherGraded === true}
              onChange={(e) => patch({ teacherGraded: e.target.checked })}
            />
            Teacher chấm tay khi học viên làm trong bài học (không chấm tự động)
          </label>
        </>
      )}

      {type === "matching" && (
        <FormField label="Các cặp" htmlFor="pairs" hint="Mỗi dòng một cặp, viết: vế trái = vế phải.">
          <Textarea
            id="pairs"
            rows={5}
            defaultValue={(payload as EditorPayload["matching"]).pairs.map((p) => `${p.left} = ${p.right}`).join("\n")}
            onChange={(e) =>
              patch({
                pairs: lines(e.target.value).map((line) => {
                  const [left, ...rest] = line.split("=");
                  return { left: left.trim(), right: rest.join("=").trim() };
                }),
              })
            }
          />
        </FormField>
      )}

      {type === "ordering" && (
        <FormField label="Câu đúng" htmlFor="sentence" hint="Học viên sẽ nhận các từ đã xáo trộn và xếp lại thành câu này.">
          <Input id="sentence" value={(payload as EditorPayload["ordering"]).sentence} onChange={(e) => patch({ sentence: e.target.value })} />
        </FormField>
      )}

      {type === "writing" && (
        <FormField label="Số từ tối thiểu" htmlFor="minWords" hint="Teacher chấm tay loại bài này.">
          <Input id="minWords" type="number" min={0} max={2000} value={(payload as EditorPayload["writing"]).minWords} onChange={(e) => patch({ minWords: Number(e.target.value) })} />
        </FormField>
      )}

      {type === "speaking" && (
        <FormField label="Thời lượng thu âm tối đa (giây)" htmlFor="maxSeconds" hint="Teacher nghe và chấm tay loại bài này.">
          <Input id="maxSeconds" type="number" min={10} max={600} value={(payload as EditorPayload["speaking"]).maxSeconds} onChange={(e) => patch({ maxSeconds: Number(e.target.value) })} />
        </FormField>
      )}
    </div>
  );
}

function ChoiceRows({
  payload,
  onChange,
}: {
  payload: EditorPayload["multiple_choice"];
  onChange: (changes: Partial<EditorPayload["multiple_choice"]>) => void;
}) {
  const { options, correct } = payload;
  return (
    <FormField label="Lựa chọn" hint="Đánh dấu ô bên trái cho đáp án đúng. Có thể có nhiều đáp án đúng.">
      <div className="grid gap-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Lựa chọn ${index + 1} là đáp án đúng`}
              checked={correct.includes(index)}
              onChange={(e) =>
                onChange({ correct: e.target.checked ? [...correct, index] : correct.filter((i) => i !== index) })
              }
            />
            <Input
              aria-label={`Lựa chọn ${index + 1}`}
              value={option}
              onChange={(e) => onChange({ options: options.map((o, i) => (i === index ? e.target.value : o)) })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={options.length <= 2}
              onClick={() =>
                onChange({
                  options: options.filter((_, i) => i !== index),
                  // Keep the remaining correct marks pointing at the same options.
                  correct: correct.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
                })
              }
            >
              Bỏ
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" disabled={options.length >= 8} onClick={() => onChange({ options: [...options, ""] })}>
            Thêm lựa chọn
          </Button>
        </div>
      </div>
    </FormField>
  );
}
