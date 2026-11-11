# LearnEnglish

Web học tiếng Anh cho lớp riêng: teacher soạn khóa học, bài học, bài tập; học viên xin vào khóa và học sau khi được duyệt.

- Đặc tả: https://claude.ai/artifact/EnxAZbYYD3DC9anqxANu8x
- Plan triển khai: `plans/261111-1343-learn-english-mvp-implementation/plan.md`
- Tài liệu kỹ thuật: `docs/`

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Đăng nhập staff, group quyền, CRUD thể loại / khóa học / bài học / bài tập, khung admin | Xong |
| 2 | Landing, đăng ký học viên, xin vào khóa, học, chấm tự động | Xong |
| 3 | Bài kiểm tra, bài thi, chấm tay, bảng điểm | Chưa làm |
| 4 | AI bridge, PDF thành bản nháp, prompt version (MongoDB) | Chưa làm |
| 5 | Giọng đọc UK 3 tốc độ | Chưa làm |

## Stack

Next.js 16 (App Router, TypeScript) · shadcn/ui + Tailwind 4 · PostgreSQL (Supabase) + Prisma 6 · Zod · JWT trong cookie httpOnly (`jose`) · argon2id.

## Chạy trên máy

```bash
npm install
cp .env.example .env        # điền chuỗi kết nối database và hai secret JWT
npm run db:deploy           # tạo bảng
npm run db:seed             # tạo superadmin đầu tiên và 2 group mẫu
npm run dev                 # http://localhost:3000 (học viên), /admin/login (staff)
```

`.env` và mọi file `*.env` đều bị git bỏ qua. Không commit thông tin đăng nhập.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy bản phát triển |
| `npm run build` | Sinh Prisma client và build bản production |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test (vitest) |
| `npm run db:migrate` | Tạo migration mới khi sửa `prisma/schema.prisma` |
| `npx tsx --env-file=.env scripts/e2e-guard-check.ts` | Kiểm tra chặn route và phạm vi khóa học trên app đang chạy (mặc định cổng 3457, đổi bằng `E2E_BASE_URL`) |
| `npx tsx --env-file=.env scripts/e2e-learner-check.ts` | Kiểm tra khu học viên: trang công khai, cổng đăng ký khóa, đáp án không lộ ra trình duyệt |

## Lưu ý về Next.js 16

`middleware.ts` đã đổi tên thành `proxy.ts`. Trước khi viết code dùng API của Next, đọc tài liệu đi kèm trong `node_modules/next/dist/docs/` (xem `AGENTS.md`).
