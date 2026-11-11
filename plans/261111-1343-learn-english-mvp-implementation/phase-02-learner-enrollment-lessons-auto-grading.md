# Phase 02 — Học viên: đăng ký, xin vào khóa, học, chấm tự động

## Context Links
- [plan.md](plan.md) · [phase-01](phase-01-foundation-auth-permissions-content-crud.md) · Spec Luồng 2, Loại bài tập

## Overview
- Priority: P0. Status: pending. Phụ thuộc phase 01.
- Landing, đăng ký/đăng nhập customer, xin vào khóa → teacher duyệt → học + làm bài tập chấm tự động + tiến độ.

## Key Insights
- Enrollment unique (course, customer); state machine: pending → approved/rejected/cancelled; rejected → pending.
- Không bao giờ gửi `answer_key` xuống client trước khi nộp.
- Chấm ở server, mỗi loại 1 hàm thuần → dễ test.
- Chưa có audio (phase 5): `listening` hiển thị được nhưng trình phát ẩn khi chưa có file.

## Requirements
- Functional: landing + danh sách khóa published theo thể loại; `/register`, `/login`, logout; trang khóa + nút Đăng ký khóa; "Khóa của tôi" kèm trạng thái; admin: danh sách chờ duyệt, duyệt/từ chối + ghi chú; xem bài học; làm 5 loại bài tập tự chấm; đánh dấu hoàn thành bài học; % tiến độ khóa.
- Non-functional: mobile-first khu học viên; rate limit register/login.

## Architecture
```
app/(marketing)/page.tsx, courses/[slug]
app/(auth)/{login,register}
app/(learner)/learn/{page, [courseSlug], [courseSlug]/[lessonId]}
features/enrollments/{actions,state-machine}.ts
lib/grading/{grade-exercise, graders/<type>}.ts
features/exercise-player/components/<type>-player.tsx
```
Guard: `requireApprovedEnrollment(customerId, courseId)` cho mọi trang/hành động nội dung khóa.

## Related Code Files (tạo mới)
- `app/(marketing)/...`, `app/(auth)/...`, `app/(learner)/...`
- `features/enrollments/...`, `app/admin/(panel)/enrollments/...`
- `lib/grading/...` + test
- `features/exercise-player/...`, `features/progress/...`
- Sửa: `middleware.ts` (route learner), sidebar admin (mục Duyệt đăng ký)

## Implementation Steps
1. Customer register/login/logout (dùng lại `lib/auth`, secret customer).
2. Landing + trang danh sách/chi tiết khóa (public, chỉ published).
3. Enrollment: action xin vào, hủy, xin lại; state machine + test.
4. Admin: danh sách enrollment theo scope khóa, duyệt/từ chối (`enrollment.review`).
5. "Khóa của tôi" + trang chờ duyệt.
6. Trang bài học: nội dung + danh sách bài tập; serializer loại bỏ `answer_key`.
7. Graders: multiple_choice, fill_blank (chuẩn hóa hoa thường/khoảng trắng, nhiều đáp án), listening, matching (điểm theo cặp), ordering.
8. Player UI từng loại; nộp → lưu `answers` (attempt_id null) → trả kết quả + đáp án đúng.
9. `lesson_progress` + thanh tiến độ.
10. Writing/speaking trong bài học: để phase 03 (cùng luồng chấm tay).
11. Test graders + enrollment guard; typecheck; lint.

## Todo
- [ ] Auth customer
- [ ] Landing + trang khóa
- [ ] Enrollment + state machine
- [ ] Admin duyệt đăng ký
- [ ] Trang bài học
- [ ] 5 grader + test
- [ ] 5 player UI
- [ ] Tiến độ
- [ ] Test + typecheck

## Success Criteria
- Học viên chưa duyệt không mở được bài học (kể cả gọi thẳng URL/action).
- Đi trọn luồng: đăng ký → xin vào → duyệt → làm bài → thấy điểm.
- Response trước khi nộp không chứa đáp án.

## Risk Assessment
- Kéo thả matching/ordering trên mobile khó → dùng chạm chọn thay kéo thả nếu cần (KISS).
- fill_blank chấm quá chặt → cho teacher nhập nhiều đáp án chấp nhận.

## Security
- Mọi query nội dung khóa lọc theo enrollment approved. Không tin `customer_id` từ client.

## Next Steps
- Phase 03 dùng lại graders + player cho bài kiểm tra.
