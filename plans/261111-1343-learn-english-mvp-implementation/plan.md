---
title: LearnEnglish MVP implementation
status: in-progress
created: 2026-11-11
priority: high
---

# LearnEnglish MVP

Web học tiếng Anh lớp riêng, miễn phí. Spec: https://claude.ai/artifact/EnxAZbYYD3DC9anqxANu8x
Brainstorm: [../reports/brainstorm-261111-learn-english-platform-mvp-scope-and-tech.md](../reports/brainstorm-261111-learn-english-platform-mvp-scope-and-tech.md)

## Stack

Next.js App Router + TS · shadcn/ui + Tailwind · PostgreSQL (Supabase, chỉ dùng DB; pooler URL cho app, direct URL cho migrate) + Prisma · MongoDB (Atlas) cho prompt version + history · Zod · JWT cookie httpOnly (2 cookie, 2 secret, `token_version`) + argon2 · Cloudflare R2 presigned upload · Vercel · bridge theo mô hình DemoPage `classroom/bridge` (3 script poll + phiên Claude Code + skill `analyst-pdf-to-homeworks`) · TTS local en-GB.

## Phases

| # | Phase | Status | File |
|---|---|---|---|
| 1 | Nền: setup, auth 2 phía, group quyền, CRUD nội dung, khung admin | complete | [phase-01](phase-01-foundation-auth-permissions-content-crud.md) |
| 2 | Học viên: landing, đăng ký, xin vào khóa, duyệt, học, chấm tự động | pending | [phase-02](phase-02-learner-enrollment-lessons-auto-grading.md) |
| 3 | Kiểm tra + thi: tính giờ, lịch thi, chấm tay, bảng điểm | pending | [phase-03](phase-03-assessments-exams-manual-grading.md) |
| 4 | AI: bridge worker, PDF → bản nháp | pending | [phase-04](phase-04-ai-bridge-pdf-to-draft.md) |
| 5 | Voice UK 3 tốc độ | pending | [phase-05](phase-05-uk-voice-tts-three-speeds.md) |

Thứ tự tuần tự 1 → 5. Ngoại lệ: spike nghe thử TTS (phase 5, bước 1) làm song song bất kỳ lúc nào.

## Dependencies ngoài

- Tài khoản Supabase, Vercel, Cloudflare R2, MongoDB Atlas (user tạo, cấp env). Supabase free tạm dừng project khi lâu không truy cập — cần xác minh lại.
- AI local + TTS local chạy được trên máy user (phase 4, 5).

## Quy ước chung

- File code < 200 dòng, tên kebab-case mô tả rõ.
- Mọi mutation: Server Action/Route Handler → Zod validate → `requireStaff/requireCustomer` → check permission + scope → Prisma.
- Xóa mềm (`deleted_at`) cho tài khoản + nội dung.
- Sau mỗi phase: `tsc --noEmit`, lint, test, code review, cập nhật `docs/`.

## Quyết định đã chốt (user duyệt 11/11/2026)

Bridge theo DemoPage · MVP không khóa bài học · bài thi 1 lần, xem đáp án sau khi đóng · không email, không xác thực email · staff đặt lại mật khẩu học viên · UI tiếng Việt · PDF (kể cả scan) do skill xử lý · 1 khóa nhiều teacher · BE kết nối cả Postgres + Mongo.

## Câu hỏi chưa giải quyết

- Model TTS nào đạt chất lượng nối âm UK? Chỉ biết sau spike.
- Skill `analyst-pdf-to-homeworks`: user tự viết, chưa có lịch.
