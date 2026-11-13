"use client";

import { Eye, EyeOff, Languages } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { BoldText } from "./bold-text";
import { STORY_SPEEDS, type StoryBlock as StoryBlockData, type StorySpeed } from "./lesson-blocks";

const SPEED_LABELS: Record<StorySpeed, string> = { slow: "Chậm", normal: "Bình thường", fast: "Nhanh" };

type Props = {
  block: StoryBlockData;
  audioSrc: Partial<Record<StorySpeed, string>>;
  /** Vietnamese translation of the story, shown beside the script when the learner asks for it. */
  translation: string[] | null;
};

/** A story to listen to at one of three speeds; the script and its translation stay hidden until the learner asks for them. */
export function StoryBlock({ block, audioSrc, translation }: Props) {
  const available = STORY_SPEEDS.filter((speed) => audioSrc[speed]);
  const [speed, setSpeed] = useState<StorySpeed>(available.includes("normal") ? "normal" : (available[0] ?? "normal"));
  const [scriptShown, setScriptShown] = useState(false);
  const [translationShown, setTranslationShown] = useState(false);
  const sideBySide = scriptShown && translationShown && translation !== null;
  // Same number of paragraphs: each one sits next to its translation. Otherwise the two texts are plain columns.
  const aligned = sideBySide && translation.length === block.paragraphs.length;

  return (
    <div className="grid gap-4">
      {available.length > 0 ? (
        <div className="grid max-w-2xl gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/8">
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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" aria-expanded={scriptShown} onClick={() => setScriptShown((shown) => !shown)}>
          {scriptShown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {scriptShown ? "Ẩn lời truyện" : "Hiện lời truyện"}
        </Button>
        {translation && (
          <Button type="button" variant="outline" size="sm" aria-expanded={translationShown} onClick={() => setTranslationShown((shown) => !shown)}>
            <Languages className="size-4" aria-hidden />
            {translationShown ? "Ẩn bản dịch" : "Hiện bản dịch"}
          </Button>
        )}
      </div>

      {!scriptShown && !translationShown && (
        <p className="text-sm text-muted-foreground">Nghe trước đã, không cần dịch từng từ. Khi cần thì bấm “Hiện lời truyện”.</p>
      )}
      {aligned ? (
        <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
          {block.paragraphs.map((paragraph, index) => (
            <Fragment key={index}>
              <p className="text-lg leading-relaxed" lang="en">
                <BoldText text={paragraph} />
              </p>
              <p className="leading-7 text-muted-foreground max-lg:mb-2">{translation[index]}</p>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className={sideBySide ? "grid gap-8 lg:grid-cols-2" : "max-w-2xl"}>
          {scriptShown && (
            <div className="grid content-start gap-3 text-lg leading-relaxed" lang="en">
              {block.paragraphs.map((paragraph, index) => (
                <p key={index}>
                  <BoldText text={paragraph} />
                </p>
              ))}
            </div>
          )}
          {translationShown && translation && (
            <div className="grid content-start gap-2 leading-7 text-muted-foreground">
              {translation.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
