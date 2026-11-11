# Brainstorm: nền tảng học tiếng Anh — phạm vi MVP + tech

Ngày: 2026-11-11. Trạng thái: đã chốt với user, chưa có plan triển khai.

## Bài toán

Web học tiếng Anh cho lớp riêng, miễn phí. Teacher tạo khóa/bài học/bài tập/bài thi; học viên đăng ký khóa, chờ teacher duyệt, rồi học + làm bài. AI local (qua bridge về máy user) phân tích PDF thành bài học/bài tập và sinh voice UK.

## Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Đối tượng | Lớp riêng, miễn phí. Không thanh toán trong MVP |
| Stack | Next.js full-stack, TypeScript, PostgreSQL, shadcn/ui (cài lib, không tự code lại) |
| Hosting | Web + DB trên cloud miễn phí/rẻ; máy user chỉ chạy AI bridge |
| Tài khoản | Tách 2 loại: `staff` và `customer`, 2 session riêng → chặn chéo `/admin` ↔ khu học viên |
| Phân quyền | Superadmin = root. Permission cố định trong code; group = tập permission; chỉ superadmin tạo group + gán group cho staff |
| Phạm vi dữ liệu | Teacher chỉ thao tác khóa mình phụ trách (sửa nội dung, duyệt học viên, xem điểm). Admin/superadmin thấy tất cả |
| Bài tập chấm tự động | Trắc nghiệm, điền từ, nghe, nối cặp, sắp xếp câu |
| Bài viết/nói | Học viên nộp text / thu âm; teacher chấm tay + nhận xét. AI chấm: để sau |
| AI offline | Chỉ chạy khi máy user bật. Server check heartbeat bridge; offline → khóa nút AI, nhập tay vẫn dùng được |
| AI output | Luôn là bản nháp; teacher xem/sửa rồi mới xuất bản |
| Prompt | Hard-code trong code ở MVP; sau này chuyển API trả phí |

## Mô hình nội dung

- Thể loại ↔ Khóa học: nhiều–nhiều.
- Khóa học → nhiều Bài học → nhiều Bài tập.
- Bài tập link với bài học; nếu không link thì thuộc bài kiểm tra: 15 phút / 1 tiếng / tùy chỉnh theo khóa.
- Bài thi: teacher đặt ngày mở, thời lượng, bộ câu hỏi; chỉ học viên của khóa vào thi.
- Đăng ký khóa: chờ → duyệt / từ chối / hủy. Người duyệt = teacher của khóa.

## Permission (danh sách cố định)

1. Tạo/sửa/xóa group quyền — chỉ superadmin
2. Gán group cho account staff — chỉ superadmin
3. CRUD thể loại, khóa học, bài học, bài tập, bài thi, bài test nhẹ
4. CRUD user
5. Tạo + đặt lịch bài thi cho học viên của mình

## Voice

- Giọng UK, 3 tốc độ (chậm / bản xứ / nhanh), sinh 3 bản riêng — không tua 1 bản.
- Sinh sẵn 1 lần qua bridge, lưu file trên object storage, DB lưu đường dẫn.
- Rủi ro: chất lượng nối âm phụ thuộc model TTS local, prompt không ép được. Cần nghe thử 2–3 model trước khi chốt.

## Thứ tự làm

1. Nền: auth 2 phía, group quyền, CRUD thể loại → khóa → bài học → bài tập (nhập tay), UI admin
2. Học viên: landing, đăng ký, xin vào khóa → duyệt → học, làm bài, chấm tự động, tiến độ
3. Thi: quiz 15p / 1h / tùy chỉnh, đặt lịch thi, bảng điểm, chấm tay viết/nói
4. AI: PDF → bản nháp bài học + bài tập qua bridge
5. Voice: audio UK 3 tốc độ cho bài nghe

Lý do AI để sau: AI chỉ là cách nhập liệu nhanh hơn; luồng nhập tay phải chạy trước.

## Phương án đã cân nhắc và loại

- NestJS + React tách riêng: 2 project, nhiều việc lặp cho 1 người làm. Chỉ đáng khi có app mobile.
- Laravel/Django + React: 2 ngôn ngữ.
- Chạy hết trên máy user: máy tắt thì học viên không vào được.
- Hàng đợi AI khi máy tắt / dự phòng API trả phí: user chọn đơn giản hơn (khóa nút khi offline).

## Rủi ro

- TTS local không đạt chất lượng nối âm UK mong muốn → cần spike sớm, có thể phải đổi sang API trả phí.
- AI phân tích PDF sai đáp án / chia bài sai → bắt buộc bước teacher duyệt.
- PDF scan (ảnh) cần OCR.
- PDF giáo trình có bản quyền — chấp nhận được khi lớp riêng, phải xem lại nếu public.
- Rớt mạng khi đang thi → cần lưu bài làm liên tục phía server.

## Tiêu chí thành công MVP

- Teacher tạo được 1 khóa đầy đủ bằng tay, học viên đăng ký → được duyệt → học + làm bài → thấy điểm.
- Customer không vào được `/admin`; staff không vào được khu học viên.
- Teacher A không sửa/xem được khóa của teacher B.
- 1 PDF → bản nháp bài học + bài tập, teacher sửa và xuất bản được.
- Bài nghe có audio UK 3 tốc độ.

## Câu hỏi còn mở

- Bridge hiện có trên máy user: giao thức/endpoint thế nào, dùng lại hay viết worker mới?
- Chọn model TTS local nào (cần nghe thử)?
- Ngôn ngữ giao diện: chỉ tiếng Việt hay cả Việt + Anh?
- Bài học có khóa tuần tự (xong bài 1 mới mở bài 2) không?
- Bài thi: cho làm mấy lần, khi nào được xem đáp án?
- Thông báo cho học viên khi được duyệt: email hay chỉ hiện trong web?
- Xác thực email khi đăng ký có cần không (lớp riêng)?
- Cloud cụ thể: Vercel + Postgres managed, hay 1 VPS nhỏ?
