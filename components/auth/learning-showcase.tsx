"use client";

import { MousePointer2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FeedbackCard, ListeningCard, SpeakingCard, VocabularyCard } from "./showcase-cards";

/**
 * Animated "learning canvas": lesson pieces joined by flowing lines, with a
 * caption that cycles through what the site offers and lights up the matching
 * piece. Used beside the sign-in forms and in the landing hero.
 */

const STEPS = [
  { tab: "Từ vựng", title: "Học từ mới mỗi ngày", text: "Từ vựng có phiên âm và nghĩa, nghe phát âm ngay trên thẻ." },
  { tab: "Nghe", title: "Nghe giọng Anh-Anh", text: "Ba tốc độ đọc: chậm, bản xứ, nhanh. Nghe lại bao nhiêu lần cũng được." },
  { tab: "Nói", title: "Thu âm, nộp trong một chạm", text: "Nói thẳng vào trình duyệt, teacher nghe và chấm cho bạn." },
  { tab: "Chấm bài", title: "Có teacher đồng hành", text: "Điểm và nhận xét cụ thể, biết ngay mình cần sửa ở đâu." },
];
const STEP_MS = 4500;

const PIECES = [
  { Card: VocabularyCard, position: "left-[5%] top-[5%]", delay: 0.1 },
  { Card: ListeningCard, position: "right-[5%] top-[13%]", delay: 0.25 },
  { Card: SpeakingCard, position: "left-[3%] top-[47%]", delay: 0.4 },
  { Card: FeedbackCard, position: "right-[4%] top-[57%]", delay: 0.55 },
];

export function LearningShowcase({ showCaption = true, className }: { showCaption?: boolean; className?: string }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    // Respect reduced motion: no automatic cycling, the learner picks a tab.
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [auto]);

  return (
    <div className={cn("relative isolate flex flex-col overflow-hidden bg-brand-ink text-white", className)}>
      {/* dotted canvas + soft colour glows */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgb(255_255_255/0.09)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -top-24 -left-24 -z-10 size-80 rounded-full bg-teal-400/25 blur-3xl" />
      <div className="absolute -right-20 bottom-24 -z-10 size-72 rounded-full bg-orange-400/20 blur-3xl" />

      <div className="relative min-h-[420px] flex-1">
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {["M40 18 C 50 18, 50 24, 58 24", "M22 34 C 22 40, 18 42, 18 48", "M42 62 C 50 62, 50 70, 56 70", "M78 40 C 80 46, 76 50, 76 58"].map((d) => (
            <path key={d} d={d} fill="none" stroke="rgb(153 246 228 / 0.55)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="animate-dash" />
          ))}
        </svg>

        {PIECES.map(({ Card, position, delay }, i) => (
          <div key={i} className={cn("absolute w-[min(44%,250px)] animate-rise", position)} style={{ animationDelay: `${delay}s` }}>
            <div className="animate-float" style={{ animationDelay: `${i * -1.7}s` }}>
              <Card active={active === i} />
            </div>
          </div>
        ))}

        <CursorTag name="Minh" color="bg-brand-rose" className="top-[3%] left-[48%]" delay={-2} />
        <CursorTag name="Cô Lan" color="bg-brand-sun" className="top-[86%] left-[30%]" delay={-4} />
      </div>

      {showCaption && (
        <div className="grid gap-4 p-8 pt-0">
          <div key={active} className="animate-rise" aria-live="polite">
            <p className="font-heading text-3xl font-extrabold tracking-tight">{STEPS[active].title}</p>
            <p className="mt-1 max-w-md text-sm text-white/75">{STEPS[active].text}</p>
          </div>
          <div className="grid grid-cols-4 gap-3" role="tablist" aria-label="Tính năng">
            {STEPS.map((step, i) => (
              <button
                key={step.tab}
                type="button"
                role="tab"
                aria-selected={active === i}
                onClick={() => {
                  setActive(i);
                  setAuto(false);
                }}
                className="grid cursor-pointer gap-2 rounded-md py-1 text-left text-[11px] font-semibold tracking-wide text-white/70 uppercase transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:outline-none aria-selected:text-white"
              >
                {step.tab}
                <span className="h-1 overflow-hidden rounded-full bg-white/15">
                  {active === i && (
                    <span
                      key={`${i}-${auto}`}
                      className="block h-full origin-left rounded-full bg-white"
                      style={auto ? { animation: `le-grow ${STEP_MS}ms linear both` } : undefined}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CursorTag({ name, color, className, delay }: { name: string; color: string; className: string; delay: number }) {
  return (
    <div className={cn("pointer-events-none absolute flex animate-float items-start", className)} style={{ animationDelay: `${delay}s` }} aria-hidden="true">
      <MousePointer2 className="size-5 -rotate-12 fill-white text-white drop-shadow" />
      <span className={cn("mt-4 -ml-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-lg", color)}>{name}</span>
    </div>
  );
}
