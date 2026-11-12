"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import type { VocabularyBlock as VocabularyBlockData } from "./lesson-blocks";

type Props = { block: VocabularyBlockData; quiz: ReactNode | null };

/**
 * Words from the story with their meanings. When the learner is ready, the
 * meanings are hidden and the quiz (an exercise of the lesson) takes their place.
 */
export function VocabularyBlock({ block, quiz }: Props) {
  const [quizShown, setQuizShown] = useState(false);

  if (quizShown && quiz) {
    return (
      <div className="grid gap-4">
        {quiz}
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setQuizShown(false)}>
            ← Xem lại các từ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {block.items.map((item) => (
          <li key={item.en} className="flex items-baseline justify-between gap-3 rounded-xl border bg-card px-3 py-2">
            <span className="font-bold" lang="en">
              {item.en}
            </span>
            <span className="text-right text-sm text-muted-foreground">{item.vi}</span>
          </li>
        ))}
      </ul>
      {quiz && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setQuizShown(true)}>
            Tôi nhớ rồi, kiểm tra →
          </Button>
          <span className="text-sm text-muted-foreground">Nghĩa sẽ được ẩn đi, bạn gõ lại bằng tiếng Việt.</span>
        </div>
      )}
    </div>
  );
}
