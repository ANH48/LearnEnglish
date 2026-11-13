# Code standards

- YAGNI, KISS, DRY. File code dưới 200 dòng; tên file kebab-case, mô tả rõ việc file làm.
- Giao diện tiếng Việt. Comment và tên biến tiếng Anh.
- Dùng component shadcn trong `components/ui/` (bản Base UI, không có `asChild`). Link dạng nút: `className={buttonVariants()}`. Select và checkbox trong form dùng thẻ gốc của trình duyệt.

## Đọc và ghi database

Tách đọc và ghi theo từng feature, không có lớp repository chung:

- **Đọc (query):** hàm trong `features/<tên>/<tên>-queries.ts`, bắt đầu bằng `import "server-only"`. Tên hàm nói rõ ai đọc và đọc gì (`listLearnerLessons`, `findLessonForEdit`).
- **Ghi (command):** server action trong `features/<tên>/<tên>-actions.ts`, theo thứ tự ở mục dưới.
- File trong `app/` không import `@/lib/db` (ESLint chặn). Page kiểm tra quyền, gọi hàm query, rồi render.
- Hàm query không tự kiểm tra quyền: page hoặc action gọi `require...` trước, rồi truyền `staff`, `customerId`, `courseId` vào để hàm lọc.
- Luật lọc viết một lần và dùng lại: `visible` (`lib/visible-content-filter.ts`) cho nội dung học viên được thấy, `courseScopeWhere(staff)` cho phạm vi khóa học của staff, `manualAnswerWhere(staff)` cho bài chấm tay.

## Server action

Mọi action ghi dữ liệu theo đúng thứ tự:

1. Kiểm tra quyền: `requirePermission` / `requireSuperadmin` / `requireCourseAccess` (`lib/auth/current-staff.ts`).
2. Validate bằng Zod; lỗi trả về `validationFailed(error)`.
3. Với dữ liệu thuộc khóa học: luôn lọc theo `courseId` trong câu truy vấn, không tin id từ form.
4. Ghi database; bắt lỗi trùng unique bằng `isUniqueViolation`.
5. `revalidatePath` rồi `redirect`.

Action của form trả `ActionState` và dùng qua `<ActionForm>`. Action của nút (xóa, di chuyển) trả `void` và dùng qua `<ConfirmActionButton>`.

## Trạng thái chờ

- Chuyển trang: `NavigationProgressBar` (root layout) tự hiện thanh tiến trình, không cần làm gì thêm ở từng link.
- Khu vực có layout riêng (`app/learn`, `app/admin/(panel)`) có `loading.tsx` dùng `PageLoading`.
- Nút submit của `<form action>` dùng `<SubmitButton>` (`components/shared/submit-button.tsx`) thay cho `<Button type="submit">` để có spinner và khóa nút khi action đang chạy.

## Dữ liệu

- Không gửi `answer_key` xuống trình duyệt của học viên.
- Xóa tài khoản và nội dung là xóa mềm.
- Thao tác xóa, đổi quyền, đặt lại mật khẩu ghi `audit_logs`.
- Sửa schema: `npm run db:migrate`, commit thư mục `prisma/migrations`.

## Trước khi commit

`npm run typecheck && npm run lint && npm test && npm run build`. Không commit `.env` hay file `*.env`.
