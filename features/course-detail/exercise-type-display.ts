import type { ExerciseType } from "@prisma/client";
import { ArrowDownUp, Headphones, Link2, ListChecks, type LucideIcon, Mic, PenLine, TextCursorInput } from "lucide-react";
import { EXERCISE_TYPE_LABELS } from "@/features/exercises/exercise-content";

/** Icon and the "what you will practise" sentence for each exercise type, in display order. */
export const EXERCISE_TYPE_DISPLAY: Record<ExerciseType, { label: string; icon: LucideIcon; skill: string }> = {
  multiple_choice: { label: EXERCISE_TYPE_LABELS.multiple_choice, icon: ListChecks, skill: "Nắm chắc ngữ pháp và từ vựng qua câu hỏi trắc nghiệm" },
  fill_blank: { label: EXERCISE_TYPE_LABELS.fill_blank, icon: TextCursorInput, skill: "Điền từ đúng ngữ cảnh, nhớ từ lâu hơn" },
  listening: { label: EXERCISE_TYPE_LABELS.listening, icon: Headphones, skill: "Nghe hiểu giọng Anh-Anh, nghe lại bao nhiêu lần cũng được" },
  matching: { label: EXERCISE_TYPE_LABELS.matching, icon: Link2, skill: "Nối từ với nghĩa, mở rộng vốn từ nhanh" },
  ordering: { label: EXERCISE_TYPE_LABELS.ordering, icon: ArrowDownUp, skill: "Sắp xếp câu, nắm vững trật tự từ" },
  writing: { label: EXERCISE_TYPE_LABELS.writing, icon: PenLine, skill: "Viết câu trả lời, được teacher sửa và nhận xét" },
  speaking: { label: EXERCISE_TYPE_LABELS.speaking, icon: Mic, skill: "Luyện nói, thu âm ngay trên trình duyệt để teacher chấm" },
};

export const EXERCISE_TYPE_ORDER = Object.keys(EXERCISE_TYPE_DISPLAY) as ExerciseType[];
