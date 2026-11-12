// Creates the storage bucket named in S3_BUCKET if it does not exist yet.
// Needed once for local MinIO. On Supabase create the bucket in the dashboard instead
// (private, size limit 15 MB, MIME types audio/webm, audio/ogg, audio/mp4).
// Run from the repo root: npx tsx --env-file=.env scripts/create-storage-bucket.ts
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

async function main() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) throw new Error("Set the S3_* variables in .env first.");
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION || "auto",
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Bucket "${S3_BUCKET}" already exists.`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Created bucket "${S3_BUCKET}".`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
