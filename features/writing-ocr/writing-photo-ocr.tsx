"use client";

import { Camera, ImagePlus, LoaderCircle, RotateCcw, ScanText, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { MAX_WRITING_IMAGES } from "@/lib/storage/writing-image-rules";
import { useWritingOcr } from "./use-writing-ocr";

type Props = { attemptId: string | null; exerciseId: string; disabled: boolean; onText: (text: string) => void };

/**
 * "Viết tay rồi chụp lại": up to 3 photos → learner checks them → the text is read and put in the
 * answer box, where the learner corrects it before submitting. Photos are kept 3 days only.
 */
export function WritingPhotoOcr({ attemptId, exerciseId, disabled, onText }: Props) {
  const { photos, phase, error, seconds, addFiles, removePhoto, readText } = useWritingOcr(attemptId, exerciseId, onText);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = disabled || phase === "reading" || phase === "preparing";
  const full = photos.length >= MAX_WRITING_IMAGES;

  const pick = (files: FileList | null, input: HTMLInputElement | null) => {
    void addFiles(files);
    if (input) input.value = ""; // the same photo can be chosen again after removing it
  };

  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-medium">Viết tay? Chụp bài để chuyển thành chữ</p>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy || full} onClick={() => cameraInput.current?.click()}>
          <Camera aria-hidden /> Chụp ảnh
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy || full} onClick={() => fileInput.current?.click()}>
          <ImagePlus aria-hidden /> Chọn ảnh
        </Button>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files, e.target)} />
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files, e.target)} />
      </div>

      {photos.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            Xem lại ảnh: chữ có rõ, đủ trang chưa? ({photos.length}/{MAX_WRITING_IMAGES} ảnh, ảnh tự xoá sau 3 ngày)
          </p>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <li key={photo.id} className="relative overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image */}
                <img src={photo.previewUrl} alt={`Ảnh bài viết ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 size-9 rounded-full shadow"
                  aria-label={`Bỏ ảnh ${index + 1}`}
                  disabled={busy}
                  onClick={() => removePhoto(photo.id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" className="min-h-11" disabled={busy} onClick={() => void readText()}>
            {phase === "reading" ? (
              <>
                <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> Đang đọc chữ… {seconds}s
              </>
            ) : error ? (
              <>
                <RotateCcw aria-hidden /> Thử lại
              </>
            ) : (
              <>
                <ScanText aria-hidden /> Ảnh đúng rồi, đọc chữ
              </>
            )}
          </Button>
        </>
      )}

      <div aria-live="polite" className="grid gap-1 text-sm">
        {phase === "preparing" && <p className="text-muted-foreground">Đang thu nhỏ ảnh…</p>}
        {phase === "reading" && <p className="text-muted-foreground">Thường mất dưới 1 phút, tối đa 2 phút. Đừng đóng trang.</p>}
        {phase === "done" && (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-foreground">
            Đã đưa chữ vào ô bài viết bên dưới. Đọc lại, sửa cho đúng với bài của bạn rồi mới nộp.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
