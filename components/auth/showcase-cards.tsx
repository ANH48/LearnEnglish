import { BookA, Headphones, Mic, Star, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The four small "lesson pieces" floating on the showcase canvas. Pure markup
 * with CSS animations; the parent decides where each one sits and which is lit.
 */

function CardShell({ icon, label, active, children }: { icon: ReactNode; label: string; active: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
        {icon}
        {label}
      </p>
      <div
        className={cn(
          "rounded-2xl border bg-white p-3 text-brand-ink shadow-xl shadow-black/30 transition-all duration-500",
          active ? "border-teal-300 ring-4 ring-teal-300/30" : "border-white/10",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function VocabularyCard({ active }: { active: boolean }) {
  return (
    <CardShell icon={<BookA className="size-3.5" />} label="Từ vựng" active={active}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg leading-tight font-extrabold">brilliant</p>
          <p className="font-mono text-xs text-muted-foreground">/ˈbrɪl.jənt/</p>
        </div>
        <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary">
          <Volume2 className="size-3.5" />
        </span>
      </div>
      <p className="mt-2 rounded-lg bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">xuất sắc, rực rỡ</p>
    </CardShell>
  );
}

const WAVE = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.65, 0.45, 0.8, 0.6, 0.9];

export function ListeningCard({ active }: { active: boolean }) {
  return (
    <CardShell icon={<Headphones className="size-3.5" />} label="Nghe · giọng Anh-Anh" active={active}>
      <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
        {WAVE.map((height, i) => (
          <span
            key={i}
            className="w-1.5 origin-center animate-wave rounded-full bg-primary"
            style={{ height: `${height * 100}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[11px] font-semibold">
        {["0.75×", "1×", "1.25×"].map((speed) => (
          <span key={speed} className={cn("rounded-full px-2 py-0.5", speed === "1×" ? "bg-primary text-white" : "bg-secondary text-secondary-foreground")}>
            {speed}
          </span>
        ))}
      </div>
    </CardShell>
  );
}

export function SpeakingCard({ active }: { active: boolean }) {
  return (
    <CardShell icon={<Mic className="size-3.5" />} label="Luyện nói" active={active}>
      <p className="text-sm font-medium">“Describe your perfect weekend.”</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="relative grid size-9 place-items-center">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand-rose" />
          <span className="relative grid size-9 place-items-center rounded-full bg-brand-rose text-white">
            <Mic className="size-4" />
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums">00:12</span>
        <span className="ml-auto text-[11px] text-muted-foreground">Đang thu…</span>
      </div>
    </CardShell>
  );
}

export function FeedbackCard({ active }: { active: boolean }) {
  return (
    <CardShell icon={<Star className="size-3.5" />} label="Teacher chấm bài" active={active}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand-sun font-heading font-extrabold text-white">L</span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Cô Lan</p>
          <p className="flex gap-0.5 text-brand-sun" aria-label="5 sao">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="size-3 fill-current" />
            ))}
          </p>
        </div>
        <p className="font-heading text-2xl font-extrabold text-primary">
          9<span className="text-sm text-muted-foreground">/10</span>
        </p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Phát âm rất tốt! Chú ý thêm âm /θ/ trong “think”.</p>
    </CardShell>
  );
}
