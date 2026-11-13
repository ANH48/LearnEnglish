"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/images/shrink-image";
import { MAX_ORIGINAL_IMAGE_BYTES, MAX_WRITING_IMAGES, MAX_WRITING_IMAGE_BYTES, OCR_TIMEOUT_MS } from "@/lib/storage/writing-image-rules";
import { requestWritingImageUploadAction } from "./writing-image-actions";

/** A chosen photo: shrunk in the browser, uploaded once (`key`), reused if the learner tries again. */
export type Photo = { id: string; blob: Blob; previewUrl: string; key?: string };
type Phase = "idle" | "preparing" | "reading" | "done";

/** State and steps of "photo of a handwritten answer → text in the answer box". */
export function useWritingOcr(attemptId: string | null, exerciseId: string, onText: (text: string) => void) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const running = useRef<AbortController | null>(null);

  // Leaving the page (or submitting the answer) stops the wait, and frees the preview images.
  useEffect(
    () => () => {
      running.current?.abort();
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    [],
  );

  useEffect(() => {
    if (phase !== "reading") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_WRITING_IMAGES - photos.length;
    if (files.length > room) setError(`Chỉ gửi được tối đa ${MAX_WRITING_IMAGES} ảnh.`);
    setPhase("preparing");
    const added: Photo[] = [];
    for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
      if (!file.type.startsWith("image/") || file.size > MAX_ORIGINAL_IMAGE_BYTES) {
        setError("Có tệp không phải ảnh hoặc quá nặng (tối đa 25 MB), đã bỏ qua.");
        continue;
      }
      try {
        const blob = await shrinkImage(file, MAX_WRITING_IMAGE_BYTES);
        added.push({ id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob) });
      } catch {
        setError("Không mở được một ảnh (định dạng chưa hỗ trợ). Hãy chụp lại hoặc chọn ảnh JPG/PNG.");
      }
    }
    setPhotos((current) => [...current, ...added].slice(0, MAX_WRITING_IMAGES));
    setPhase("idle");
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((p) => p.id !== id);
    });
    setPhase("idle");
  }

  async function upload(photo: Photo, signal: AbortSignal): Promise<string> {
    if (photo.key) return photo.key;
    const ticket = await requestWritingImageUploadAction(attemptId, exerciseId, photo.blob.type);
    if (!ticket.ok) throw new Error(ticket.error);
    const put = await fetch(ticket.url, { method: "PUT", body: photo.blob, headers: { "Content-Type": ticket.mime }, signal });
    if (!put.ok) throw new Error("Tải ảnh lên không thành công. Hãy thử lại.");
    setPhotos((current) => current.map((p) => (p.id === photo.id ? { ...p, key: ticket.key } : p)));
    return ticket.key;
  }

  /** Uploads what is not uploaded yet, then waits for the text; the whole wait is capped at 2 minutes. */
  async function readText() {
    if (photos.length === 0 || phase === "reading") return;
    setError(null);
    setSeconds(0);
    setPhase("reading");
    const controller = new AbortController();
    running.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, OCR_TIMEOUT_MS);
    try {
      const keys: string[] = [];
      for (const photo of photos) keys.push(await upload(photo, controller.signal));
      const response = await fetch("/api/writing-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, exerciseId, keys }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; text?: string; error?: string };
      if (!response.ok || !data.ok || typeof data.text !== "string") throw new Error(data.error ?? "Chưa đọc được chữ trong ảnh. Hãy thử lại.");
      if (!data.text) throw new Error("Không thấy chữ nào trong ảnh. Hãy chụp rõ và gần hơn.");
      if (controller.signal.aborted) return;
      onText(data.text);
      // The text is in the answer box now; clearing the photos stops the same pages being read and added twice.
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setPhase("done");
    } catch (caught) {
      if (controller.signal.aborted && !timedOut) return; // the component is gone
      setPhase("idle");
      if (timedOut) setError("Quá 2 phút vẫn chưa xong. Kiểm tra mạng rồi bấm thử lại.");
      // fetch fails with a TypeError ("Failed to fetch", "Load failed") when the network drops.
      else if (caught instanceof TypeError) setError("Mất kết nối mạng. Kiểm tra mạng rồi bấm thử lại.");
      else setError((caught as Error).message);
    } finally {
      clearTimeout(timeout);
      if (running.current === controller) running.current = null;
    }
  }

  return { photos, phase, error, seconds, addFiles, removePhoto, readText };
}
