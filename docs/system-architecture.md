# System architecture

Trạng thái: giai đoạn 1 và 2 xong. Phần chưa làm ghi rõ "(giai đoạn N)".

## Thành phần

| Thành phần | Vai trò |
|---|---|
| Next.js trên Vercel | Giao diện + server actions. Mọi trang admin render theo request. |
| PostgreSQL (Supabase) | Dữ liệu chính, qua Prisma. `DATABASE_URL` = pooler, `DIRECT_URL` = kết nối trực tiếp cho migration. |
| Cloudflare R2 | PDF, audio, bài thu âm (giai đoạn 3) |
| MongoDB Atlas | Prompt, version, history (giai đoạn 4) |
| Bridge trên máy user | Script theo dõi job + phiên Claude Code (giai đoạn 4) |

## Đăng nhập

- Hai loại tài khoản, hai bảng: `staff`, `customers`. Hai cookie: `staff_token`, `customer_token`, ký bằng hai secret khác nhau.
- JWT chỉ chứa `sub`, `kind`, `tv` (token_version). Không chứa quyền.
- `proxy.ts` chỉ kiểm tra chữ ký để chuyển hướng sớm và chặn chéo hai khu. Không truy vấn database.
- `lib/auth/current-staff.ts` đọc tài khoản từ database ở mỗi request: tài khoản bị khóa, bị xóa, hoặc lệch `token_version` được coi là chưa đăng nhập.
- Đổi mật khẩu hoặc khóa tài khoản tăng `token_version`, vô hiệu mọi token cũ.
- Sai mật khẩu 5 lần khóa đăng nhập 15 phút (lưu trong dòng tài khoản).

## Phân quyền

- 12 permission cố định trong `lib/permissions/permission-keys.ts`. Group lưu trong database là tập các key đó.
- Superadmin bỏ qua mọi kiểm tra. `group.manage` và `staff.assign_group` chỉ superadmin có, group không cấp được.
- Phạm vi khóa học: staff không có `course.view_all` chỉ thấy khóa có mình trong `course_teachers` (`lib/permissions/course-scope.ts`). Khóa ngoài phạm vi trả 404.
- Mọi server action và trang admin bắt đầu bằng `requirePermission`, `requireSuperadmin` hoặc `requireCourseAccess`.

## Nội dung

Thể loại ↔ Khóa học (nhiều–nhiều) → Bài học → Bài tập. Bài tập có `lesson_id` rỗng chỉ dùng trong bài kiểm tra.

Bài tập lưu hai cột JSON: `data` (học viên được thấy) và `answer_key` (không gửi cho học viên trước khi nộp). Chuyển đổi giữa form soạn và hai cột này nằm ở `features/exercises/exercise-content.ts`.

Tài khoản và nội dung dùng xóa mềm (`deleted_at`); email và slug của bản đã xóa được đổi tên để dùng lại được.

## Khu học viên

- Trang công khai: `/` (landing, khóa đã xuất bản, lọc theo thể loại), `/courses/[slug]` (mô tả, tên bài học, nút đăng ký khóa). Không hiện nội dung bài học hay bài tập.
- Đăng ký, đăng nhập: `/register`, `/login`. Dùng chung `lib/auth/password-login.ts` với staff; mỗi loại tài khoản đọc đúng bảng của mình.
- Đăng ký khóa (`features/enrollments/`): `pending → approved | rejected | cancelled`, `rejected/cancelled → pending`, `approved → cancelled` (teacher gỡ). Bảng chuyển trạng thái ở `enrollment-state.ts`. Teacher duyệt ở `/admin/enrollments`, giới hạn theo phạm vi khóa học.
- Cổng nội dung: `requireApprovedCourse` (`lib/auth/current-customer.ts`). Khóa phải đã xuất bản và đăng ký phải `approved`; mọi trường hợp khác trả 404. Bài học và bài tập nháp không hiện.
- Bài tập gửi xuống trình duyệt qua `toLearnerExercise` (`features/exercise-player/learner-exercise.ts`), dựng từng trường từ cột `data`, không bao giờ kèm `answer_key`.
- Chấm tự động (`lib/grading/grade-exercise.ts`): trắc nghiệm, nghe và sắp xếp câu là đúng hết mới có điểm; điền từ và nối cặp tính điểm theo từng phần. Bỏ qua hoa thường, khoảng trắng thừa, dấu nháy cong.
- Bài luyện trong bài học lưu vào `answers` với `attempt_id` rỗng, mỗi học viên một dòng mới nhất cho mỗi bài tập.
- Tiến độ: `lesson_progress`, học viên tự đánh dấu học xong. Bài học không khóa tuần tự.
- Chưa có: bài viết và nói (giai đoạn 3), audio bài nghe (giai đoạn 5).

## Cấu trúc thư mục

```
app/admin/login            đăng nhập staff
app/admin/(panel)/...      khu quản trị (layout yêu cầu phiên staff)
app/blocked                trang báo khi vào nhầm khu
app/page.tsx, app/courses  landing và trang khóa học công khai
app/(auth)/                đăng nhập, đăng ký học viên
app/learn/                 khu học viên (layout yêu cầu phiên customer)
lib/grading/               chấm tự động
components/site/           header trang công khai và khu học viên
features/<tên>/            server actions, form, bảng của từng thực thể
lib/auth/                  JWT, cookie, mật khẩu, tài khoản hiện tại
lib/permissions/           danh sách quyền, kiểm tra quyền, phạm vi khóa học
lib/forms/                 kiểu trả về của form action, slugify
components/admin/          khung form, nút xác nhận, sidebar
components/ui/             shadcn (không sửa tay)
prisma/                    schema, migration, seed
scripts/                   kiểm tra end-to-end
proxy.ts                   chặn route (Next.js 16 gọi middleware là proxy)
```
