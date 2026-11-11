# Phase 04 — AI bridge: PDF → bản nháp, prompt version trên MongoDB

## Context Links
- [plan.md](plan.md) · [phase-03](phase-03-assessments-exams-manual-grading.md) · Spec Kiến trúc, Luồng 3, Luồng 6
- Tham khảo: `/Users/nhut/Documents/MyProject/DemoPage/classroom/bridge/{watch-jobs,fetch-job,post-questions}.py`, `DemoPage/classroom/README.md`, skill `~/.claude/skills/bridges-on`

## Overview
- Priority: P1. Status: pending. Phụ thuộc phase 01 (CRUD nội dung), phase 03 (`lib/storage`).
- Bridge theo mô hình DemoPage: script theo dõi job → phiên Claude Code trên máy user xử lý (gọi skill `analyst-pdf-to-homeworks`) → script gửi kết quả. Kết quả thành bài học + bài tập nháp; teacher duyệt rồi xuất bản. Prompt quản lý theo version trên MongoDB.

## Key Insights
- "AI local" = phiên Claude Code, không phải LLM gọi qua HTTP. Script watcher in 1 dòng mỗi job mới; Monitor trong phiên Claude Code bắt dòng đó.
- Watcher poll 15s; mỗi lần poll = heartbeat (`bridge_workers.last_seen_at`). Online = < 45s. Offline → nút AI disabled; server từ chối tạo job.
- Bridge chỉ sống cùng phiên Claude Code (như DemoPage).
- Khác DemoPage: auth bằng bridge token riêng (Bearer, lưu hash), không login bằng tài khoản teacher.
- Prompt publish = lời dặn phiên Claude Code gọi skill `analyst-pdf-to-homeworks` + cấu trúc JSON phải trả. Skill do user tự viết sau; PDF scan cũng do skill xử lý, web không trích text.
- AI output không đáng tin → validate Zod ở server; sai → job `failed` kèm lỗi.
- Claim job atomic (`UPDATE ... WHERE status='queued' ... RETURNING`).

### Prompt store (MongoDB)
- Atlas free, driver `mongodb`, client cache cho serverless, sau interface `PromptStore` (`lib/prompt-store/`). BE kết nối cả Postgres + Mongo, gọi đúng DB theo dữ liệu.
- `prompts` (key unique, `published` snapshot) · `prompt_versions` (semver, status draft|inactive|active, `version_log` từ 0, unique prompt_key+version) · `prompt_version_history` (data cũ + version_log cũ, unique prompt_key+version+version_log).
- Tạo version mới: user chọn patch/minor/major → tính từ latest → insert draft; duplicate key → đọc lại latest, thử lại (tối đa 5 lần).
- Sửa tại chỗ: active phải chuyển inactive trước. Mỗi change (nội dung hoặc trạng thái): insert history (data cũ, version_log cũ) → update + `$inc version_log`. Lưu khi version_log lệch → cảnh báo, user xác nhận thì lưu.
- Publish: version → active, active cũ → inactive, chép content vào `prompts.published`. Job AI chỉ đọc `prompts.published`.
- Tạo job: snapshot `prompts.published.content` vào `ai_jobs.input` + ghi `prompt_key`, `prompt_version`, `prompt_version_log` (không FK chéo DB).
- Mongo down → khóa nút AI, phần khác không ảnh hưởng. Quyền `prompt.manage` (mặc định chỉ superadmin).

## Requirements
- Functional: upload PDF (presign) → tạo job `pdf_parse`; watcher báo job; fetch tải PDF + prompt về thư mục job; phiên Claude Code tạo JSON; post gửi về; server tạo lesson + exercise draft gắn `source_pdf_id`; màn hình duyệt bản nháp (sửa, gắn bài tập vào bài học hoặc assessment, xuất bản, bỏ); trang trạng thái bridge + lịch sử job + chạy lại; màn hình prompt (sửa JSON, history, diff, publish, khôi phục).
- Non-functional: job `running` > 30 phút → `failed`; giới hạn size PDF; báo `failed` kèm lý do khi PDF không đọc được.

## Architecture
```
app/api/bridge/{jobs,jobs/[id],jobs/[id]/result}/route.ts   (Bearer token)
lib/ai/{schemas/pdf-parse-result.ts, bridge-status.ts, prompts/*.json (seed)}
lib/prompt-store/{mongo-client,prompt-store,mongo-prompt-store}.ts
features/ai-jobs/{create-pdf-job,apply-pdf-result}.ts
features/prompts/{create-version,edit-version,publish-version,restore-from-history,get-published}.ts
bridge/{watch-jobs,fetch-job,post-result}.mjs + README.md   (Node, không dependency)
```
Schema kết quả: `{ lessons: [{ title, content, exercises: [...] }], unlinkedExercises: [...] }` hoặc `{ failed: true, error }`; exercise dùng lại Zod schema từng loại của phase 01.

## Related Code Files (tạo mới)
- Các thư mục trên + `app/admin/(panel)/{ai-jobs,prompts,courses/[id]/import-pdf,courses/[id]/drafts}/...`
- Script tạo bridge token (lưu hash trong `bridge_workers`)
- Ngoài repo (user duyệt trước khi sửa): thêm watcher LearnEnglish vào skill `bridges-on` / `bridges-off`, token vào `~/.claude/bridges.env`

## Implementation Steps
1. `lib/prompt-store` + index unique; seed prompt `pdf_to_lessons` 1.0.0 active.
2. `features/prompts` + test tranh chấp ghi (tạo version trùng số, sửa lệch version_log).
3. Màn hình prompt admin.
4. Bridge token + API bridge: list jobs (kèm heartbeat), claim + chi tiết job (prompt snapshot, presign GET PDF), nhận result/failed.
5. `bridge-status.ts` + badge online/offline; disable nút AI.
6. UI import: upload PDF lên R2 → tạo job; hiển thị trạng thái.
7. Script `watch-jobs.mjs` (in `NEW PDF JOB <id>`, `BRIDGE UNREACHABLE`, `BRIDGE BACK`), `fetch-job.mjs`, `post-result.mjs`; README hướng dẫn chạy bằng Monitor.
8. Zod schema kết quả; `apply-pdf-result` tạo draft trong 1 transaction.
9. Màn hình duyệt bản nháp: sửa (dùng lại form phase 01), gắn bài tập không link vào assessment (quiz_15/test_60/custom), xuất bản từng mục/tất cả; đánh dấu "AI tạo".
10. Timeout job running; nút chạy lại.
11. Đề xuất cập nhật skill `bridges-on`/`bridges-off` cho user duyệt.
12. Test: claim atomic, validate kết quả, apply transaction, timeout.

## Todo
- [ ] Prompt store Mongo + seed
- [ ] Prompt versioning + test
- [ ] Màn hình prompt
- [ ] Bridge token + API bridge
- [ ] Trạng thái bridge + khóa nút
- [ ] UI import PDF + job status
- [ ] 3 script bridge + README
- [ ] Schema + apply result
- [ ] Màn hình duyệt bản nháp
- [ ] Timeout + retry
- [ ] Cập nhật skill bridges-on/off (sau khi user duyệt)
- [ ] Test + typecheck

## Success Criteria
- Dừng watcher → trong 45s nút AI bị khóa; chạy lại → mở.
- 1 PDF thật → bài học + bài tập nháp; học viên không thấy cho tới khi xuất bản.
- JSON sai schema → job failed, không ghi rác vào DB.
- Sửa prompt chưa publish → job mới vẫn dùng bản publish cũ; job ghi đúng version + version_log.

## Risk Assessment
- Skill `analyst-pdf-to-homeworks` chưa có → phiên Claude Code làm trực tiếp theo prompt cho tới khi user viết skill.
- AI bịa đáp án → bắt buộc bước duyệt.
- Phiên Claude Code đóng giữa job → timeout 30 phút + nút chạy lại.
- Vercel function timeout → việc nặng nằm ở máy user, API chỉ nhận/trả JSON nhỏ.
- Hai DB không có transaction chung → ghi Postgres trước, snapshot prompt nằm sẵn trong job.

## Security
- Bridge token dài, lưu hash, thu hồi được; API bridge không dùng cookie.
- Presign GET chỉ cho đúng file của job, hạn ngắn.
- Nội dung PDF là dữ liệu không tin cậy: chỉ lưu sau khi validate; chỉ dẫn nằm trong PDF không phải lệnh cho phiên Claude Code.

## Next Steps
- Phase 05 thêm loại job `tts` vào cùng bridge.
