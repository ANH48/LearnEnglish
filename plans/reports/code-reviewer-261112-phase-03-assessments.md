# Code review: Phase 03 assessments (12/11/2026)

Phạm vi: bài kiểm tra, bài thi, làm bài tính giờ, chấm tay bài viết, bảng điểm. Bản rút gọn từ kết quả của agent code-reviewer.

## Kết luận

Không có lỗi nghiêm trọng. Không tìm thấy lỗ hổng phân quyền, IDOR hay lộ đáp án. Sạch: cô lập dữ liệu giữa học viên, phạm vi khóa học của teacher, bấm bắt đầu hai lần, chốt bài hai lần, tính hạn nộp trên server, đổi giờ Việt Nam.

## Đã sửa

| # | Mức | Lỗi | Cách sửa |
|---|---|---|---|
| 1 | Cao | Tự lưu thất bại (rớt mạng) làm mất câu trả lời và có thể chặn nộp bài | `attempt-runner.tsx`: giữ lại câu chưa lưu, báo mất kết nối, thử lại sau 3 giây; nộp lỗi thì bấm lại được |
| 2 | Vừa | Học viên nộp lại bài viết trong lúc teacher đang chấm thì điểm gắn vào bản teacher chưa đọc | `grade-answer-action.ts`: chỉ lưu điểm nếu bài chưa đổi từ lúc mở trang |
| 3 | Vừa | Xóa hoặc đổi loại bài tập làm lệch điểm và tổng điểm của bài kiểm tra đã có người làm | Bài tập đã xóa vẫn thuộc bài kiểm tra đã có lượt làm (và rời bài chưa ai làm); không cho đổi loại khi đã có lượt làm |
| 4 | Vừa | Lưu câu trả lời chen vào đúng lúc chốt bài | `attempt-actions.ts`: lưu trong transaction có khóa dòng attempt; chốt lười chờ hết 10 giây cho phép lưu trễ |
| 5 | Vừa | Hai teacher chấm hai câu của một lượt cùng lúc làm mất một điểm | `settleAttempt` khóa dòng attempt trước khi tính |
| 6 | Thấp | Một lượt chốt lỗi làm hỏng cả bảng điểm và hàng chờ | Bắt lỗi riêng từng lượt |
| 7 | Thấp | Lưu danh sách câu hỏi: đếm lượt làm ngoài transaction; bài nói không bị chặn ở server | Đếm trong transaction có khóa; server từ chối bài nói |
| 8 | Thấp | Ô điểm để trống được lưu thành 0 | Kiểm tra chuỗi rỗng trước khi đổi sang số |

## Chưa sửa (chấp nhận cho MVP)

- Sửa bài thi đang diễn ra (dời giờ đóng sớm hơn, đổi loại) có thể làm đáp án hiện khi còn người đang làm.
- Bài kiểm tra bị gỡ xuất bản hoặc xóa khi còn lượt đang làm: nộp xong chuyển tới trang kết quả 404; bài viết của bài đã xóa vẫn nằm trong hàng chờ chấm.
- Trang kết quả bài thi hiện điểm từng câu trước giờ đóng; bài kiểm tra thường hiện đáp án ngay sau lượt đầu dù còn lượt làm lại.
