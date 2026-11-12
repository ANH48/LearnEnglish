# System architecture

Trạng thái: giai đoạn 1, 2, 3 xong. Phần chưa làm ghi rõ "(giai đoạn N)".

## Thành phần

| Thành phần | Vai trò |
|---|---|
| Next.js trên Vercel | Giao diện + server actions. Mọi trang admin render theo request. |
| PostgreSQL (Supabase) | Dữ liệu chính, qua Prisma. `DATABASE_URL` = pooler, `DIRECT_URL` = kết nối trực tiếp cho migration. |
| Lưu file qua S3 API | Bài thu âm; PDF và audio ở giai đoạn sau. Supabase Storage (S3 protocol) cho cả máy dev lẫn deploy, sau này AWS S3 hoặc Cloudflare R2 khi data lớn; chỉ khác các biến `S3_*` |
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

Bài học có hai phần nội dung, dùng riêng hoặc cùng lúc: `content` (markdown) và `blocks` (JSON, danh sách khối theo thứ tự). Sáu loại khối, định nghĩa ở `features/lesson-blocks/lesson-blocks.ts`: `sentences` (danh sách câu + một file audio + mốc giây từng câu), `notes` (cấu trúc cần nhớ), `exercise` (đặt một bài tập của bài học vào giữa các khối), `story` (truyện, audio chậm / thường / nhanh, lời truyện ẩn tới khi bấm xem), `vocabulary` (từ + nghĩa, bấm kiểm tra thì hiện bài tập gõ nghĩa), `translation`. Chữ in đậm trong câu tiếng Anh viết bằng `**...**`. Cột `blocks` hỏng định dạng thì coi như không có khối, không lỗi trang.

Hiện chưa có form soạn khối trong admin: bài theo ngày được nhập bằng `scripts/import-day-lesson.ts` từ một file JSON (chữ + bài tập vào database, mp3 vào bucket); chạy lại thì cập nhật tại chỗ. File JSON và mp3 chỉ là đầu vào tạm, không lưu trong repo. Form bài học trong admin không đụng tới `blocks`. Trang bài học trong admin hiện phần xem thử các khối (kèm player audio), và `/admin/lesson-audio` liệt kê mọi file audio theo bài để teacher nghe kiểm tra (quyền `course.manage`, theo phạm vi khóa học).

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
- Bài viết trong bài học: học viên nộp chữ, lưu vào `answers` chưa có điểm và vào hàng chờ chấm; nộp lại thì xóa điểm cũ.
- Bài nói trong bài học: thu âm xong là nộp, vào hàng chờ chấm; thu lại thì thay bản cũ.
- Bài điền từ có `data.teacherGraded = true` (ô chọn trong form bài tập): làm trong bài học thì lưu chưa có điểm và vào hàng chờ chấm như bài viết; trong bài kiểm tra vẫn chấm tự động.
- Audio của bài học (`/api/lesson-audio/[lessonId]/[mediaId]`): chỉ phát file mà `blocks` của bài đó nhắc tới, cho học viên đã được duyệt vào khóa đã xuất bản hoặc staff vào được khóa; còn lại 404. File nằm ở `lesson-audio/<lesson id>/` trong bucket, có dòng `media_files` loại `audio`.
- Giọng đọc: `bridge/tts/generate-day-lesson-audio.mjs` chạy Kokoro trên máy (giọng Mỹ `af_heart`), mỗi tốc độ sinh riêng một lần (0.8 / 1 / 1.2), không kéo giãn một bản. Chưa nối với nút bấm trong admin.
- Chưa có: audio cho bài tập loại nghe (giai đoạn 5).

## Bài kiểm tra và bài thi

- `assessments` thuộc một khóa học; câu hỏi là bài tập của khóa đó, nối qua `assessment_exercises` (điểm và thứ tự riêng cho từng bài kiểm tra). Một bài tập dùng được ở cả bài học lẫn bài kiểm tra.
- Bốn loại (`lib/assessments/attempt-rules.ts`): 15 phút và 60 phút có thời lượng cố định; tự đặt giờ; bài thi có giờ mở/đóng, đúng 1 lượt, đáp án ẩn tới giờ đóng. Giờ mở/đóng nhập theo giờ Việt Nam, lưu UTC (`lib/datetime/vietnam-time.ts`).
- Bắt đầu làm (`features/attempts/attempt-actions.ts`): server tính `deadline_at = started_at + thời lượng`, bài thi không vượt giờ đóng. Khóa advisory theo học viên + bài để hai lần bấm cùng lúc không tạo hai lượt.
- Trong lúc làm: mỗi thay đổi được tự lưu từng câu (upsert theo `attempt_id + exercise_id`), nên đóng tab rồi mở lại vẫn còn bài và đồng hồ đúng. Server từ chối lưu sau hạn (cho trễ 10 giây vì mạng).
- Nộp bài (`features/attempts/finalize-attempt.ts`): chấm tự động theo điểm của bài kiểm tra; còn bài viết chờ chấm thì lượt ở trạng thái `submitted`, không thì `graded`. Chỉ lần gọi đổi được `in_progress` mới chấm, nên gọi hai lần cùng lúc vẫn an toàn.
- Không có cron: lượt quá hạn chưa nộp được chốt ở lần đọc kế tiếp (học viên mở trang bài kiểm tra, teacher mở hàng chờ chấm hoặc bảng điểm), tính là nộp đúng lúc hết hạn.
- Sau khi có học viên bắt đầu làm, danh sách câu hỏi và điểm từng câu bị khóa.
- Chấm tay (`features/manual-grading/`, quyền `grading.manual`): hàng chờ gồm bài viết từ bài học và từ lượt đã nộp, giới hạn theo phạm vi khóa học. Lưu điểm xong thì tính lại tổng điểm của lượt: điểm cuối = tự động + chấm tay.
- Bài nói (`features/recordings/`, `lib/storage/`): trình duyệt thu bằng MediaRecorder, xin server một URL ký sẵn (5 phút) rồi PUT thẳng file lên bucket. Server tự đặt key `recordings/<customer id>/<uuid>`, sau đó kiểm tra file thật trong bucket (có tồn tại, đúng loại audio, tối đa 15 MB) mới gắn vào câu trả lời qua `media_files`. Thu lại thì xóa file cũ.
- Nghe lại qua `/api/recordings/[answerId]`: chỉ học viên đã thu hoặc teacher có quyền chấm trong khóa đó được chuyển tới URL ký sẵn; người khác nhận 404. Bucket không công khai.
- Bảng điểm (`/admin/gradebook`): theo khóa, mỗi dòng một học viên đã duyệt, mỗi cột một bài kiểm tra, ô là điểm cao nhất trong các lượt đã nộp.

## Cấu trúc thư mục

```
app/admin/login            đăng nhập staff
app/admin/(panel)/...      khu quản trị (layout yêu cầu phiên staff)
app/blocked                trang báo khi vào nhầm khu
app/page.tsx, app/courses  landing và trang khóa học công khai
app/(auth)/                đăng nhập, đăng ký học viên
app/learn/                 khu học viên (layout yêu cầu phiên customer)
app/learn/[courseSlug]/assessments/   trang bài kiểm tra, làm bài, kết quả
lib/assessments/           luật giờ, số lượt, tính điểm của lượt làm
lib/datetime/              đổi giờ Việt Nam ↔ UTC
lib/storage/               lưu file qua S3 API, luật cho bản thu âm
app/api/recordings/        phát lại bản thu sau khi kiểm tra quyền
app/api/lesson-audio/      phát audio của bài học sau khi kiểm tra quyền
features/lesson-blocks/    các khối của bài học (schema + hiển thị)
bridge/tts/                sinh giọng đọc trên máy (package riêng, không thuộc web app)
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
