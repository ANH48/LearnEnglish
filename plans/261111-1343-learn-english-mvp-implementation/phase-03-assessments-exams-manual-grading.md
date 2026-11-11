# Phase 03 — Kiểm tra, thi, chấm tay, bảng điểm

## Context Links
- [plan.md](plan.md) · [phase-02](phase-02-learner-enrollment-lessons-auto-grading.md) · Spec Luồng 5

## Overview
- Priority: P1. Status: pending. Phụ thuộc phase 02.
- Bài test nhẹ (quiz_15, test_60, custom), bài thi có lịch (exam), tính giờ server, chấm tay writing/speaking, bảng điểm. Upload R2 (thu âm) bắt đầu từ phase này.

## Key Insights
- `deadline_at` = `started_at + duration`, tính ở server; client chỉ hiển thị đếm ngược.
- Lưu câu trả lời từng câu (upsert) → rớt mạng không mất bài.
- Không có cron: attempt quá hạn được "chốt lười" — lần đọc kế tiếp (học viên hoặc teacher mở) thấy `now > deadline` thì tự nộp + chấm.
- Exam: 1 lần; đáp án chỉ hiện sau `closes_at`.
- Speaking: MediaRecorder → presigned PUT lên R2 → lưu `media_files`.

## Requirements
- Functional: teacher tạo assessment, chọn exercise từ khóa, đặt điểm, thời lượng, `opens_at/closes_at` (exam), `max_attempts`; học viên bắt đầu, làm, nộp; tự chấm phần tự động; teacher chấm tay + nhận xét; điểm cuối = auto + manual; bảng điểm theo khóa/bài; học viên xem điểm + nhận xét.
- Non-functional: answer sau deadline bị từ chối; không tạo 2 attempt song song (unique partial / transaction).

## Architecture
```
features/assessments/{actions,schema}.ts        (admin)
features/attempts/{start-attempt,save-answer,submit-attempt,finalize-if-expired}.ts
lib/storage/{r2-client,presign-upload,presign-download}.ts
features/manual-grading/...                     (admin)
features/gradebook/...
app/(learner)/learn/[courseSlug]/assessments/[id]/{page,take,result}
```

## Related Code Files (tạo mới)
- Các thư mục trên + `app/admin/(panel)/{assessments,grading,gradebook}/...`
- `features/exercise-player/components/{writing,speaking}-player.tsx`
- `app/api/uploads/presign/route.ts`
- Sửa: sidebar admin

## Implementation Steps
1. `lib/storage`: R2 client (S3 SDK), presign PUT (giới hạn mime + size), presign GET.
2. Admin CRUD assessment + chọn/sắp xếp exercise (`assessment_exercises`), scope theo khóa.
3. `start-attempt`: check enrollment approved, khung giờ, số lượt; tạo attempt trong transaction.
4. Trang làm bài: đếm ngược theo `deadline_at`, autosave từng câu, nút nộp, tự nộp khi hết giờ.
5. `submit-attempt` + `finalize-if-expired`: chấm tự động, status `submitted` (còn câu chấm tay) hoặc `graded`.
6. Writing + speaking player (thu âm, nghe lại, nộp).
7. Admin hàng đợi chấm tay: xem bài viết / nghe thu âm, nhập điểm + nhận xét → cập nhật score, status.
8. Trang kết quả học viên; ẩn đáp án exam trước `closes_at`.
9. Bảng điểm: theo assessment và theo học viên; lọc theo scope.
10. Bài tập writing/speaking trong bài học đi cùng hàng đợi chấm tay.
11. Test: tính deadline, từ chối trễ hạn, giới hạn lượt, finalize lười.

## Todo
- [ ] R2 storage lib + presign API
- [ ] CRUD assessment
- [ ] Start attempt + guard
- [ ] Trang làm bài + autosave + timer
- [ ] Submit + finalize lười
- [ ] Writing/speaking player
- [ ] Chấm tay
- [ ] Kết quả + bảng điểm
- [ ] Test + typecheck

## Success Criteria
- Exam chỉ mở trong khung giờ, chỉ cho học viên approved, đúng 1 lần.
- Tắt tab giữa chừng, mở lại → còn nguyên câu đã làm, đồng hồ đúng.
- Hết giờ không nộp → bài vẫn được chốt và chấm.
- Teacher chấm tay xong → học viên thấy điểm cuối + nhận xét.

## Risk Assessment
- MediaRecorder khác codec giữa Safari/Chrome → chấp nhận webm + mp4, phát bằng `<audio>` gốc.
- Sai lệch đồng hồ client → luôn lấy thời gian server.
- CORS R2 cho presigned PUT → cấu hình bucket sớm.

## Security
- Presign chỉ cấp cho người đã đăng nhập, key do server sinh, giới hạn size/mime.
- Download thu âm chỉ qua presign GET sau khi check quyền (teacher của khóa hoặc chính học viên).

## Next Steps
- Phase 04 dùng lại `lib/storage` cho PDF.
