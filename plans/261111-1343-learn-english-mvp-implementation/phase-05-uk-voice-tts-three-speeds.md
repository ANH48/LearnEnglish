# Phase 05 — Giọng đọc UK, 3 tốc độ

## Context Links
- [plan.md](plan.md) · [phase-04](phase-04-ai-bridge-pdf-to-draft.md) · Spec Luồng 4

## Overview
- Priority: P2. Status: pending. Phụ thuộc phase 04 (worker). Spike (bước 1) làm sớm được, độc lập.
- Sinh audio en-GB cho bài nghe: chậm / bản xứ / nhanh, 3 file riêng, lưu R2.

## Key Insights
- Rủi ro lớn nhất dự án: nối âm do model quyết định, prompt không ép được.
- Sinh 3 lần với tham số tốc độ của model; không time-stretch 1 bản.
- Bản chậm tự nhiên ít nối âm — đúng với cách người bản xứ nói chậm.
- Audio sinh 1 lần, phát từ R2; không realtime.
- "Worker/handler" trong file này = phiên Claude Code nhận job `tts` qua bridge (phase 04) rồi chạy script TTS local `bridge/tts/*`; không có daemon riêng.

## Requirements
- Functional: teacher bấm Tạo giọng đọc trên exercise `listening`; job `tts`; 3 file → `exercise_audios`; nghe thử trong admin; tạo lại; học viên chọn tốc độ khi làm bài.
- Non-functional: mp3 (hoặc opus) nhẹ; nút khóa khi bridge offline.

## Architecture
```
worker/src/handlers/tts.ts + tts-client.ts   (interface synthesize(text, speed) → file)
features/ai-jobs/{create-tts-job,apply-tts-result}.ts
features/exercise-player/components/audio-speed-player.tsx
```

## Related Code Files
- Tạo: các file trên, `docs/tts-model-evaluation.md` (kết quả spike)
- Sửa: form exercise listening (nút tạo + nghe thử), `listening-player`

## Implementation Steps
1. **Spike**: cài 2–3 model local có giọng en-GB (ứng viên: Kokoro, Piper — xác minh lại tại thời điểm làm), sinh cùng 10 câu mẫu × 3 tốc độ; user nghe và chọn. Ghi kết quả vào docs.
2. Nếu không model nào đạt → dừng, hỏi user: chấp nhận mức hiện có hay dùng API trả phí.
3. `tts-client.ts` bọc model đã chọn sau 1 interface.
4. Handler `tts`: 3 lần synthesize → ffmpeg sang mp3 → presign PUT lên R2 → complete job.
5. `apply-tts-result`: upsert 3 dòng `exercise_audios`, xóa file cũ khi tạo lại.
6. Admin: nút tạo, trạng thái job, 3 nút nghe thử.
7. Học viên: player chọn tốc độ, mặc định "bản xứ".
8. Test: apply result, thay file cũ; typecheck.

## Todo
- [ ] Spike nghe thử + user chọn model
- [ ] tts-client + handler
- [ ] apply result + dọn file cũ
- [ ] UI admin
- [ ] Player học viên
- [ ] Test + docs

## Success Criteria
- Mỗi bài nghe có đủ 3 file en-GB; user nghe và xác nhận đạt.
- Học viên đổi tốc độ không cần tải lại trang.

## Risk Assessment
- Không model local nào đạt → API trả phí (ngoài ngân sách hiện tại) — quyết định của user.
- TTS chậm trên máy user → job chạy tuần tự, hiển thị tiến độ.

## Security
- Audio bài thi: presign GET ngắn hạn, chỉ cho học viên approved.

## Next Steps
- Sau MVP: AI chấm writing/speaking, email thông báo, OCR PDF scan.
