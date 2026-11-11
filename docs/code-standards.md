# Code standards

- YAGNI, KISS, DRY. File code dưới 200 dòng; tên file kebab-case, mô tả rõ việc file làm.
- Giao diện tiếng Việt. Comment và tên biến tiếng Anh.
- Dùng component shadcn trong `components/ui/` (bản Base UI, không có `asChild`). Link dạng nút: `className={buttonVariants()}`. Select và checkbox trong form dùng thẻ gốc của trình duyệt.

## Server action

Mọi action ghi dữ liệu theo đúng thứ tự:

1. Kiểm tra quyền: `requirePermission` / `requireSuperadmin` / `requireCourseAccess` (`lib/auth/current-staff.ts`).
2. Validate bằng Zod; lỗi trả về `validationFailed(error)`.
3. Với dữ liệu thuộc khóa học: luôn lọc theo `courseId` trong câu truy vấn, không tin id từ form.
4. Ghi database; bắt lỗi trùng unique bằng `isUniqueViolation`.
5. `revalidatePath` rồi `redirect`.

Action của form trả `ActionState` và dùng qua `<ActionForm>`. Action của nút (xóa, di chuyển) trả `void` và dùng qua `<ConfirmActionButton>`.

## Dữ liệu

- Không gửi `answer_key` xuống trình duyệt của học viên.
- Xóa tài khoản và nội dung là xóa mềm.
- Thao tác xóa, đổi quyền, đặt lại mật khẩu ghi `audit_logs`.
- Sửa schema: `npm run db:migrate`, commit thư mục `prisma/migrations`.

## Trước khi commit

`npm run typecheck && npm run lint && npm test && npm run build`. Không commit `.env` hay file `*.env`.
