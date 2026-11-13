// End-to-end check of "photo of a handwritten answer → text" against a running app (next dev),
// the real database, bucket, MongoDB prompt store and Groq. Creates its own course, learner and
// writing exercise, and deletes all of it (and the photo) at the end.
// Run from the repo root: npx tsx --env-file=.env scripts/e2e-writing-ocr-check.ts <photo.jpg>
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "../lib/auth/session-constants";
import { signSessionToken } from "../lib/auth/session-jwt";
import { writingImageExpiry, writingImageKey } from "../lib/storage/writing-image-rules";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3457";
const db = new PrismaClient();
const e = process.env;
const s3 = new S3Client({ endpoint: e.S3_ENDPOINT, region: e.S3_REGION || "auto", credentials: { accessKeyId: e.S3_ACCESS_KEY_ID!, secretAccessKey: e.S3_SECRET_ACCESS_KEY! }, forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED" });
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`);
};

async function main() {
  const photo = readFileSync(process.argv[2]);
  const admin = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true, deletedAt: null } });
  const slug = `e2e-ocr-${Date.now()}`;
  const course = await db.course.create({ data: { title: slug, slug, status: "published", createdBy: admin.id } });
  try {
    const lesson = await db.lesson.create({ data: { courseId: course.id, title: "e2e OCR", status: "published" } });
    const exercise = await db.exercise.create({ data: { courseId: course.id, lessonId: lesson.id, type: "writing", prompt: "Write about your weekend.", points: 10, status: "published", data: { minWords: 10 }, answerKey: {} } });
    const customer = await db.customer.create({ data: { email: `${slug}@example.test`, fullName: "E2E OCR", passwordHash: "x", status: "active" } });
    await db.enrollment.create({ data: { customerId: customer.id, courseId: course.id, status: "approved" } });
    const cookie = `${SESSION_COOKIE_NAME.customer}=${await signSessionToken({ sub: customer.id, kind: "customer", tv: customer.tokenVersion })}`;

    // Same as requestWritingImageUploadAction: reserve the row, then the browser PUTs to a signed URL.
    const key = writingImageKey(customer.id, randomUUID(), "image/jpeg");
    const now = new Date();
    await db.writingImage.create({ data: { customerId: customer.id, exerciseId: exercise.id, attemptId: null, storageKey: key, mime: "image/jpeg", sizeBytes: 0, createdAt: now, expiresAt: writingImageExpiry(now) } });
    const putUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: e.S3_BUCKET, Key: key, ContentType: "image/jpeg" }), { expiresIn: 300, signableHeaders: new Set(["content-type"]) });
    check("photo uploads to the bucket", (await fetch(putUrl, { method: "PUT", body: photo, headers: { "Content-Type": "image/jpeg" } })).ok);

    const read = (body: object, withCookie = true) =>
      fetch(`${BASE}/api/writing-ocr`, { method: "POST", headers: { "Content-Type": "application/json", ...(withCookie ? { cookie } : {}) }, body: JSON.stringify(body) });
    const body = { attemptId: null, exerciseId: exercise.id, keys: [key] };

    check("signed-out request is refused", (await read(body, false)).status === 401);
    check("another learner's key is refused", (await read({ ...body, keys: [writingImageKey(randomUUID(), randomUUID(), "image/jpeg")] })).status === 403);

    const started = Date.now();
    const response = await read(body);
    const result = (await response.json()) as { ok: boolean; text?: string; error?: string };
    check("text comes back", response.ok && result.ok, `HTTP ${response.status} in ${((Date.now() - started) / 1000).toFixed(1)}s${result.error ? ` · ${result.error}` : ""}`);
    if (result.text) {
      console.log(`--- text ---\n${result.text}\n------------`);
      for (const mistake of ["goed", "freind", "eated", "becuase", "wether"]) check(`keeps the mistake "${mistake}"`, result.text.includes(mistake));
      check("leaves out the Vietnamese note", !/nộp|Ghi chú/i.test(result.text));
    }
    const row = await db.writingImage.findUniqueOrThrow({ where: { storageKey: key } });
    check("photo recorded with its size, read count and 3-day expiry", row.sizeBytes === photo.length && row.readCount === 1 && row.expiresAt.getTime() - row.createdAt.getTime() === 3 * 86_400_000);

    await db.writingImage.update({ where: { id: row.id }, data: { readCount: 3 } });
    check("a photo read 3 times is not read again", (await read(body)).status === 429);

    // Daily clean-up: wrong secret refused; with the secret, an expired photo goes (row and file).
    const cron = (secret: string) => fetch(`${BASE}/api/cron/clear-writing-images`, { headers: { authorization: `Bearer ${secret}` } });
    check("clean-up refuses a wrong secret", (await cron("wrong")).status === 401);
    await db.writingImage.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const cleaned = await cron(e.CRON_SECRET!);
    check("clean-up deletes expired photos", cleaned.ok && (await db.writingImage.count({ where: { id: row.id } })) === 0, JSON.stringify(await cleaned.json()));
    const gone = await fetch(await getSignedUrl(s3, new (await import("@aws-sdk/client-s3")).GetObjectCommand({ Bucket: e.S3_BUCKET, Key: key }), { expiresIn: 60 }));
    check("the file is gone from the bucket", gone.status === 404 || gone.status === 400, `HTTP ${gone.status}`);
  } finally {
    await db.enrollment.deleteMany({ where: { courseId: course.id } });
    await db.customer.deleteMany({ where: { email: `${slug}@example.test` } });
    await db.course.delete({ where: { id: course.id } });
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
