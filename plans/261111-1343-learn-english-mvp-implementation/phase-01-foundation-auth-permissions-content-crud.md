# Phase 01 — Nền: setup, auth, quyền, CRUD nội dung

## Context Links
- [plan.md](plan.md) · Spec mục Tech, Phân quyền, Database, Luồng 1

## Overview
- Priority: P0. Status: complete (2026-11-11). DB hiện là Postgres tạm trên máy; chưa migrate lên Supabase.
- Dựng project, schema DB đầy đủ, đăng nhập 2 phía, group quyền, CRUD nội dung nhập tay, khung admin.

## Key Insights
- Staff/customer tách bảng → không bao giờ nhầm phiên. 2 cookie (`staff_token`, `customer_token`), 2 secret.
- JWT chỉ chứa `sub`, `kind`, `tv` (token_version). Middleware chỉ verify chữ ký; quyền + `status` + `tv` đọc DB ở mỗi thao tác server.
- Permission cố định trong code (12 key, gồm `prompt.manage`); group lưu DB. Prompt nằm ở MongoDB (phase 04), không thuộc schema Prisma.
- Scope "khóa của mình" = `course_teachers`; `course.view_all` mở rộng thành tất cả.
- Viết schema Prisma đủ mọi bảng ngay phase này (kể cả enrollment, assessment, ai_jobs) → tránh migration vỡ về sau; logic làm ở phase sau.

## Requirements
- Functional: staff login `/admin/login`; superadmin seed; CRUD group + gán group (chỉ superadmin); CRUD staff, customer, category, course, lesson, exercise (7 loại, form theo loại); gán teacher cho khóa; draft/published; audit log.
- Non-functional: chặn chéo 2 chiều; check quyền ở server; argon2id; cookie httpOnly + Secure + SameSite=Lax; rate limit login.

## Architecture
```
middleware.ts  → verify JWT theo prefix route (jose, edge-safe), redirect
lib/auth/      → jwt sign/verify, password hash, requireStaff(), requireCustomer()
lib/permissions/ → keys, can(staff, key), canAccessCourse(staff, courseId)
app/admin/(panel)/layout → sidebar lọc theo quyền
features/<entity>/ → actions.ts (server actions), schema.ts (zod), components/
```
Một trình duyệt một phiên: login bên này bị từ chối nếu đang có cookie bên kia.

## Related Code Files (tạo mới)
- `prisma/schema.prisma`, `prisma/seed.ts`
- `middleware.ts`
- `lib/db.ts`, `lib/auth/{jwt,password,require-staff,require-customer,cookies}.ts`
- `lib/permissions/{permission-keys,check-permission,course-scope}.ts`
- `lib/audit/write-audit-log.ts`
- `app/admin/login/page.tsx`, `app/admin/(panel)/layout.tsx`, `app/admin/(panel)/{dashboard,categories,courses,customers,staff,groups}/...`
- `features/{auth,groups,staff,customers,categories,courses,lessons,exercises}/...`
- `components/ui/*` (shadcn CLI), `components/admin/{sidebar,data-table,confirm-dialog}.tsx`
- `.env.example`, `README.md`, `docs/{code-standards,system-architecture,codebase-summary}.md`

## Implementation Steps
1. `git init`; `create-next-app` (TS, App Router, Tailwind, ESLint); cài shadcn, prisma, zod, jose, argon2, vitest. `.gitignore` chặn `.env*`.
2. Viết `schema.prisma` đủ mọi bảng theo spec mục Database; migrate lên Supabase (`DATABASE_URL` = pooler, `DIRECT_URL` = direct).
3. `seed.ts`: superadmin từ env, 2 group mẫu (Admin, Teacher).
4. `lib/auth`: sign/verify JWT (2 secret), argon2id, set/clear cookie, `requireStaff` (load DB, check `status`, `tv`).
5. `middleware.ts`: `/admin/*` cần `staff_token`; `/learn/*` cần `customer_token`; có token bên kia → trang chặn.
6. `lib/permissions`: 11 key, `can()`, `canAccessCourse()`, helper `assertPermission`.
7. Admin login + logout + layout sidebar lọc theo quyền + trang 403.
8. CRUD group + gán permission; gán group cho staff (superadmin only).
9. CRUD staff, customer (kèm đặt lại mật khẩu → tăng `token_version`, khóa tài khoản).
10. CRUD category; course (nhiều category, nhiều teacher, status).
11. CRUD lesson (position, kéo sắp xếp hoặc nút lên/xuống, nội dung markdown).
12. CRUD exercise: form + Zod schema riêng từng loại (`data`, `answer_key` jsonb); gắn/bỏ gắn lesson.
13. Audit log cho xóa, đổi quyền, đặt lại mật khẩu.
14. Unit test: jwt, permission, scope. `tsc --noEmit`, lint.

## Todo
- [x] Setup project + git + shadcn
- [x] Prisma schema + migrate + seed
- [x] Auth lib + middleware chặn chéo
- [x] Permission lib + scope
- [x] Admin login/layout/403
- [x] Group + gán group
- [x] CRUD staff, customer
- [x] CRUD category, course, lesson
- [x] CRUD exercise 7 loại
- [x] Audit log
- [x] Test + typecheck + docs

## Success Criteria
- Customer token không vào được `/admin`; staff token không vào được `/learn`.
- Teacher A không thấy/sửa được khóa của teacher B (test tự động).
- Staff thiếu quyền gọi thẳng server action → bị từ chối.
- Khóa staff / đặt lại mật khẩu → token cũ hết hiệu lực ngay.

## Risk Assessment
- argon2 native trên Vercel: nếu build lỗi → dùng `@node-rs/argon2`.
- Middleware edge không chạy Prisma → chỉ verify chữ ký ở đó.
- Form exercise 7 loại dễ phình → mỗi loại 1 component + 1 schema.

## Security
- Không lưu permission trong JWT. Secret riêng từng loại. CSRF: SameSite=Lax + server actions kiểm origin.
- Không lộ khác biệt "sai email" vs "sai mật khẩu".

## Next Steps
- Phase 02 dùng schema + auth lib cho phía customer.
