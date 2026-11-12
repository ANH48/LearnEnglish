"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RECORDING_MIME_CANDIDATES } from "@/lib/storage/recording-rules";
import { requestRecordingUploadAction, saveRecordingAnswerAction } from "./recording-actions";

type Props = {
  /** Null for practice inside a lesson. */
  attemptId: string | null;
  exerciseId: string;
  maxSeconds: number;
  /** Answer holding a take saved earlier, so it can be played back after a reload. */
  savedAnswerId: string | null;
  disabled: boolean;
  onSaved?: () => void;
};

type Phase = "idle" | "recording" | "saving";

/** Record with the microphone, stop, and the take is uploaded and saved as the answer. Recording again replaces it. */
export function SpeakingRecorder({ attemptId, exerciseId, maxSeconds, savedAnswerId, disabled, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [playback, setPlayback] = useState<string | null>(savedAnswerId ? `/api/recordings/${savedAnswerId}` : null);
  const recorder = useRef<MediaRecorder | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (ticker.current) clearInterval(ticker.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  // Leaving the page must release the microphone.
  useEffect(() => () => {
    if (ticker.current) clearInterval(ticker.current);
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const upload = async (blob: Blob) => {
    setPhase("saving");
    try {
      const ticket = await requestRecordingUploadAction(attemptId, exerciseId, blob.type);
      if (!ticket.ok) return setNote(ticket.error);
      const put = await fetch(ticket.url, { method: "PUT", headers: { "Content-Type": ticket.mime }, body: blob });
      if (!put.ok) return setNote("Tải bản thu lên thất bại. Hãy thu lại.");
      const saved = await saveRecordingAnswerAction(attemptId, exerciseId, ticket.key);
      if (!saved.ok) return setNote(saved.error);
      setPlayback(URL.createObjectURL(blob));
      setNote("Đã lưu bản thu.");
      onSaved?.();
    } catch {
      setNote("Mất kết nối khi lưu bản thu. Hãy thu lại.");
    } finally {
      setPhase("idle");
    }
  };

  const start = async () => {
    setNote("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setNote("Không dùng được micro. Hãy cho phép trình duyệt truy cập micro.");
    }
    const mimeType = RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
    const active = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    active.ondataavailable = (event) => chunks.push(event.data);
    active.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      void upload(new Blob(chunks, { type: active.mimeType }));
    };
    recorder.current = active;
    active.start();
    setSeconds(0);
    setPhase("recording");
    const startedAt = Date.now();
    ticker.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop();
    }, 250);
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "recording" ? (
          <Button type="button" variant="destructive" onClick={stop}>
            Dừng và lưu
          </Button>
        ) : (
          <Button type="button" variant={playback ? "outline" : "default"} disabled={disabled || phase === "saving"} onClick={start}>
            {phase === "saving" ? "Đang lưu…" : playback ? "Thu lại" : "Bắt đầu thu âm"}
          </Button>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">
          {phase === "recording" ? `Đang thu ${seconds}/${maxSeconds} giây` : `Tối đa ${maxSeconds} giây`}
        </span>
      </div>
      {playback && phase === "idle" && <audio controls src={playback} className="w-full" aria-label="Bản thu của bạn" />}
      {note && (
        <p role="status" className="text-sm">
          {note}
        </p>
      )}
    </div>
  );
}
