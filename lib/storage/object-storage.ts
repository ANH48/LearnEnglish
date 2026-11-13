import "server-only";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * File storage through the S3 API: MinIO on a developer machine, Supabase Storage
 * (S3 protocol) when deployed; AWS S3 or Cloudflare R2 later if data grows.
 * Which one is decided only by the S3_* environment variables.
 * Browsers upload and download directly with short-lived signed URLs.
 */

const URL_LIFETIME_SECONDS = 300;

function readConfig() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) {
    throw new Error("File storage is not configured: set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_BUCKET.");
  }
  return { endpoint: S3_ENDPOINT, region: S3_REGION || "auto", accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, bucket: S3_BUCKET };
}

let cached: { client: S3Client; bucket: string } | undefined;

function storage() {
  if (!cached) {
    const config = readConfig();
    cached = {
      bucket: config.bucket,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        // MinIO and Supabase need the bucket in the path; S3 and R2 accept it too.
        forcePathStyle: true,
        // Without this the signed URL demands a checksum header a browser upload does not send.
        requestChecksumCalculation: "WHEN_REQUIRED",
      }),
    };
  }
  return cached;
}

/** URL the browser PUTs the file to. The content type is part of the signature. */
export function presignUpload(key: string, mime: string): Promise<string> {
  const { client, bucket } = storage();
  // Without signableHeaders the SDK leaves Content-Type out of the signature, so the same URL
  // would accept any file type (checked against MinIO).
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mime }), {
    expiresIn: URL_LIFETIME_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });
}

/** `lifetimeSeconds` is for files a page keeps playing long after it loaded, such as lesson audio. */
export function presignDownload(key: string, lifetimeSeconds = URL_LIFETIME_SECONDS): Promise<string> {
  const { client, bucket } = storage();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: lifetimeSeconds });
}

/** Size and type of a stored file, or null when it was never uploaded. */
export async function statObject(key: string): Promise<{ sizeBytes: number; mime: string } | null> {
  const { client, bucket } = storage();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { sizeBytes: head.ContentLength ?? 0, mime: head.ContentType ?? "" };
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

/** Best effort: a file that cannot be deleted only wastes space, so failures are logged, not thrown. */
export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = storage();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`Could not delete stored file ${key}`, error);
  }
}

/** Deletes up to 1000 files in one request. Best effort like deleteObject: failures are logged, not thrown. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, bucket } = storage();
  try {
    const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
    if (result.Errors?.length) console.error(`Could not delete ${result.Errors.length} stored files`, result.Errors.slice(0, 5));
  } catch (error) {
    console.error(`Could not delete ${keys.length} stored files`, error);
  }
}
