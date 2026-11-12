"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BoldText } from "./bold-text";
import { STORY_SPEEDS, type StoryBlock as StoryBlockData, type StorySpeed } from "./lesson-blocks";

const SPEED_LABELS: Record<StorySpeed, string> = { slow: "Chậm", normal: "Bình thường", fast: "Nhanh" };

type Props = { block: StoryBlockData; audioSrc: Partial<Record<StorySpeed, string>> };

/** A story to listen to at one of three speeds; the script stays hidden until the learner asks for it. */
export function StoryBlock({ block, audioSrc }: Props) {
  const available = STORY_SPEEDS.filter((speed) => audioSrc[speed]);
  const [speed, setSpeed] = useState<StorySpeed>(available.includes("normal") ? "normal" : (available[0] ?? "normal"));
  const [scriptShown, setScriptShown] = useState(false);

  return (
    <div className="grid gap-4">
      {available.length > 0 ? (
        <div className="grid gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/8">
          {available.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tốc độ đọc">
              <span className="text-sm text-muted-foreground">Tốc độ:</span>
              {available.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={option === speed ? "default" : "outline"}
                  aria-pressed={option === speed}
                  onClick={() => setSpeed(option)}
                >
                  {SPEED_LABELS[option]}
                </Button>
              ))}
            </div>
          )}
          {/* The key makes the browser load the other file when the speed changes. */}
          <audio key={speed} controls preload="metadata" src={audioSrc[speed]} className="w-full" aria-label={`Nghe truyện, tốc độ ${SPEED_LABELS[speed]}`} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Audio của truyện chưa được tạo.</p>
      )}

      <div>
        <Button type="button" variant="outline" size="sm" aria-expanded={scriptShown} onClick={() => setScriptShown((shown) => !shown)}>
          {scriptShown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {scriptShown ? "Ẩn lời truyện" : "Hiện lời truyện"}
        </Button>
      </div>

      {scriptShown ? (
        <div className="grid gap-3 text-lg leading-relaxed" lang="en">
          {block.paragraphs.map((paragraph, index) => (
            <p key={index}>
              <BoldText text={paragraph} />
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nghe trước đã, không cần dịch từng từ. Khi cần thì bấm “Hiện lời truyện”.</p>
      )}
    </div>
  );
}
