"use client";

import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { BoldText } from "./bold-text";
import type { SentencesBlock } from "./lesson-blocks";

type Props = { block: SentencesBlock; audioSrc: string | null };

/**
 * The day's sentences with one recording of all of them. The player plays the
 * whole list; the button beside a sentence plays just that sentence.
 */
export function SentenceListBlock({ block, audioSrc }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /** Second at which a single-sentence play stops; null while the whole list plays. */
  const stopAt = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const segments = block.segments ?? [];

  const playOne = (index: number) => {
    const audio = audioRef.current;
    const segment = segments[index];
    if (!audio || !segment) return;
    const start = () => {
      audio.currentTime = segment[0];
      stopAt.current = segment[1];
      void audio.play();
    };
    // Some phones ignore preload; a seek before the file's length is known would be dropped.
    if (audio.readyState >= 1) return start();
    audio.addEventListener("loadedmetadata", start, { once: true });
    audio.load();
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = audio.currentTime;
    if (stopAt.current !== null && time >= stopAt.current) audio.pause();
    // A sentence stays marked through the silence left for repeating it.
    const index = segments.findIndex(([start], i) => time >= start && time < (segments[i + 1]?.[0] ?? Infinity));
    setActive(audio.paused || index === -1 ? null : index);
  };

  return (
    <div className="grid gap-4">
      {audioSrc ? (
        <div className="sticky top-2 z-10 grid gap-1 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/8">
          <audio
            ref={audioRef}
            controls
            preload="auto"
            src={audioSrc}
            className="w-full"
            aria-label="Nghe tất cả các câu"
            onTimeUpdate={onTimeUpdate}
            onPause={() => {
              stopAt.current = null;
              setActive(null);
            }}
          />
          <p className="text-xs text-muted-foreground">Nghe từng câu, nói theo vào khoảng lặng ngay sau câu đó. Đọc thật to.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Audio của phần này chưa được tạo.</p>
      )}

      <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {block.items.map((item, index) => (
          <li
            key={index}
            className={`flex items-start gap-2 rounded-xl p-2 transition-colors ${active === index ? "bg-accent" : ""}`}
          >
            <span className="w-6 shrink-0 pt-1 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg leading-snug" lang="en">
                <BoldText text={item.en} />
              </p>
              {item.vi && <p className="text-sm text-muted-foreground">{item.vi}</p>}
            </div>
            {audioSrc && segments[index] && (
              <button
                type="button"
                onClick={() => playOne(index)}
                aria-label={`Nghe câu ${index + 1}`}
                className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/10 focus-visible:outline-2"
              >
                <Volume2 className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
