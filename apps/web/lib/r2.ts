import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireEnv } from "@/lib/env";

let client: S3Client | undefined;

function getR2Client() {
  client ??= new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY")
    }
  });

  return client;
}

function bucket() {
  return requireEnv("R2_BUCKET");
}

export function mediaExpiresAt(minutes = env.R2_MEDIA_RETENTION_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function buildR2Key(input: {
  userId: string;
  jobId?: string;
  assetId: string;
  kind: "uploads" | "processed" | "chunks" | "outputs";
  fileName: string;
}) {
  const safeName = basename(input.fileName).replace(/[^a-zA-Z0-9._-]+/g, "-");
  const jobPart = input.jobId ?? "unassigned";
  return `users/${input.userId}/jobs/${jobPart}/${input.kind}/${input.assetId}/${safeName}`;
}

export async function createPresignedPut(input: {
  key: string;
  mimeType: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: input.key,
    ContentType: input.mimeType
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: input.expiresIn ?? env.R2_PRESIGNED_PUT_TTL_SECONDS
  });
}

export async function createPresignedGet(key: string, expiresIn = env.R2_PRESIGNED_GET_TTL_SECONDS) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function putFileToR2(input: { path: string; key: string; mimeType?: string }) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      Body: await readFile(input.path),
      ContentType: input.mimeType ?? "application/octet-stream"
    })
  );

  return { key: input.key, url: await createPresignedGet(input.key) };
}

export async function deleteR2Objects(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  for (let start = 0; start < keys.length; start += 1000) {
    await getR2Client().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: {
          Objects: keys.slice(start, start + 1000).map((Key) => ({ Key })),
          Quiet: true
        }
      })
    );
  }
}
