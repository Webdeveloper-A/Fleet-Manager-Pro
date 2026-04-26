import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_SECRET_ACCESS_KEY,
  STORAGE_DRIVER,
} from "./env";

export type StoredDocumentFile = {
  storedName: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};

const uploadRoot = path.join(process.cwd(), "uploads", "documents");

function ensureLocalUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function objectKey(storedName: string) {
  const safeName = path.basename(storedName);
  return `documents/${safeName}`;
}

export async function saveDocumentFile(params: {
  buffer: Buffer;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}): Promise<StoredDocumentFile> {
  const fileUrl = `/api/uploads/document/${params.storedName}`;
console.log("[storage] driver:", STORAGE_DRIVER);

  if (STORAGE_DRIVER === "r2") {
    if (!R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }

    const client = getR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey(params.storedName),
        Body: params.buffer,
        ContentType: params.mimeType,
        Metadata: {
          originalName: encodeURIComponent(params.originalName),
        },
      }),
    );

    return {
      storedName: params.storedName,
      fileUrl,
      fileName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
    };
  }

  ensureLocalUploadRoot();

  const filePath = path.join(uploadRoot, path.basename(params.storedName));
  await fs.promises.writeFile(filePath, params.buffer);

  return {
    storedName: params.storedName,
    fileUrl,
    fileName: params.originalName,
    mimeType: params.mimeType,
    size: params.size,
  };
}

export async function sendDocumentFile(params: {
  storedName: string;
  res: import("express").Response;
}) {
  const safeName = path.basename(params.storedName);

  if (STORAGE_DRIVER === "r2") {
    if (!R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }

    const client = getR2Client();

    const object = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey(safeName),
      }),
    );

    if (!object.Body) {
      params.res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }

    if (object.ContentType) {
      params.res.setHeader("Content-Type", object.ContentType);
    }

    params.res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName.replace(/"/g, "")}"`,
    );

    const stream = object.Body as Readable;
    stream.pipe(params.res);
    return;
  }

  ensureLocalUploadRoot();

  const filePath = path.join(uploadRoot, safeName);

  if (!fs.existsSync(filePath)) {
    params.res.status(404).json({ error: "Fayl topilmadi." });
    return;
  }

  params.res.sendFile(filePath);
}

export async function deleteDocumentFile(storedName: string) {
  const safeName = path.basename(storedName);

  if (STORAGE_DRIVER === "r2") {
    if (!R2_BUCKET_NAME) return;

    const client = getR2Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey(safeName),
      }),
    );

    return;
  }

  const filePath = path.join(uploadRoot, safeName);

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}