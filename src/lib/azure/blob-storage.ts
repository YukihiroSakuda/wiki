import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "@/lib/env";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

export interface UploadResult {
  url: string;
  filename: string;
}

/**
 * Upload a file buffer to Azure Blob Storage.
 * Falls back to local filesystem when Azure Storage is not configured.
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${randomUUID()}${ext}`;

  if (env.isAzureStorageConfigured()) {
    return uploadToAzure(buffer, filename, mimeType);
  }

  return uploadToLocal(buffer, filename);
}

async function uploadToAzure(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const client = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = client.getContainerClient(env.AZURE_STORAGE_CONTAINER_NAME);

  // Ensure container exists with public blob access
  await containerClient.createIfNotExists({ access: "blob" });

  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return { url: blockBlobClient.url, filename };
}

async function uploadToLocal(buffer: Buffer, filename: string): Promise<UploadResult> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}`, filename };
}
