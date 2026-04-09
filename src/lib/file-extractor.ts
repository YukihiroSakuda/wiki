/**
 * File → Markdown extraction via Vision LLM.
 *
 * All file types are converted to images first, then fed to GPT Vision.
 *
 * PDF       → pdfjs-dist renders each page as PNG → Vision (batched, 5 pages/call)
 * Office    → embedded images extracted from ZIP + text extracted → Vision (one call)
 * Images    → uploaded to Blob → Vision for alt text + description
 */

import { generateText, type ImagePart, type TextPart } from "ai";
import { getAzureClient } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { PROMPTS } from "@/lib/ai/prompts";
import { fileToImages } from "@/lib/file-to-images";

type ContentPart = ImagePart | TextPart;

export type SupportedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.ms-powerpoint"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export const SUPPORTED_TYPES: Record<SupportedMimeType, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "image/jpeg": "Image",
  "image/png": "Image",
  "image/gif": "Image",
  "image/webp": "Image",
};

export function isSupportedType(mimeType: string): mimeType is SupportedMimeType {
  return mimeType in SUPPORTED_TYPES;
}

const PAGES_PER_BATCH = 5;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function guessMediaType(buf: Buffer): ImageMediaType {
  // Check magic bytes
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  return "image/png"; // safe default for canvas-rendered pages
}

// ── Vision helpers ────────────────────────────────────────────────────────────

/** Send a batch of page images to Vision and return Markdown. */
async function visionPageBatch(
  images: Buffer[],
  filename: string,
  fileType: string,
  pageStart: number,
  totalPages: number
): Promise<string> {
  const azure = getAzureClient();
  if (!azure) return "";

  const pageEnd = pageStart + images.length - 1;

  const content: ContentPart[] = [
    ...images.map(
      (img): ImagePart => ({
        type: "image",
        image: img,
        mediaType: guessMediaType(img),
      })
    ),
    {
      type: "text",
      text: PROMPTS.documentPagesVision(filename, fileType, pageStart, pageEnd, totalPages),
    },
  ];

  const { text } = await generateText({
    model: azure(MODELS.GPT_FAST),
    messages: [{ role: "user", content }],
    maxOutputTokens: 4096,
  });

  return text;
}

/** Send extracted text + embedded images to Vision for Office documents. */
async function visionOfficeDocument(
  extractedText: string,
  embeddedImages: Buffer[],
  filename: string,
  fileType: string
): Promise<string> {
  const azure = getAzureClient();
  if (!azure) return extractedText;

  const content: ContentPart[] = [
    ...embeddedImages.map(
      (img): ImagePart => ({
        type: "image",
        image: img,
        mediaType: guessMediaType(img),
      })
    ),
    {
      type: "text",
      text: PROMPTS.documentWithImagesVision(filename, fileType, extractedText),
    },
  ];

  const { text } = await generateText({
    model: azure(MODELS.GPT_FAST),
    messages: [{ role: "user", content }],
    maxOutputTokens: 4096,
  });

  return text;
}

/** Single image → alt text + description. */
async function visionSingleImage(
  buffer: Buffer,
  mimeType: ImageMediaType,
  filename: string,
  imageUrl?: string
): Promise<string> {
  const azure = getAzureClient();
  if (!azure) return imageUrl ? `![${filename}](${imageUrl})` : `<!-- Image: ${filename} -->`;

  const { text } = await generateText({
    model: azure(MODELS.GPT_FAST),
    messages: [
      {
        role: "user",
        content: [
          { type: "image" as const, image: buffer, mediaType: mimeType },
          { type: "text" as const, text: PROMPTS.imageDescription(filename) },
        ],
      },
    ],
    maxOutputTokens: 1024,
  });

  const altMatch = text.match(/^ALT:\s*(.+)/m);
  const descMatch = text.match(/^DESCRIPTION:\s*\n([\s\S]+)/m);
  const alt = altMatch ? altMatch[1].trim() : filename;
  const description = descMatch ? descMatch[1].trim() : "";
  const imgLine = imageUrl ? `![${alt}](${imageUrl})` : `<!-- Image: ${filename} -->`;
  return description ? `${imgLine}\n\n${description}` : imgLine;
}

// ── Office text extraction (for context alongside embedded images) ─────────────

async function extractOfficeText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  try {
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? "";
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
        lines.push(`[Sheet: ${sheetName}]`);
        for (const row of rows) {
          lines.push(row.map((c) => String(c ?? "")).join("\t"));
        }
        lines.push("");
      }
      return lines.join("\n");
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint"
    ) {
      const { parseOffice } = await import("officeparser");
      const ast = await parseOffice(buffer as unknown as string);
      return (ast as unknown as { toText: () => string }).toText() ?? "";
    }
  } catch (err) {
    console.warn(`[file-extractor] text extraction warning for ${filename}:`, err);
  }
  return "";
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function extractFileToMarkdown(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  imageUrl?: string // blob URL for uploaded plain images
): Promise<string> {
  const fileType = SUPPORTED_TYPES[mimeType as SupportedMimeType] ?? "File";

  try {
    // ── Plain images ──
    if (mimeType.startsWith("image/")) {
      return await visionSingleImage(buffer, mimeType as ImageMediaType, filename, imageUrl);
    }

    const { pageImages, embeddedImages, isRendered } = await fileToImages(buffer, mimeType);

    // ── PDF: batch rendered pages ──
    if (isRendered && pageImages.length > 0) {
      const chunks: string[] = [];
      for (let i = 0; i < pageImages.length; i += PAGES_PER_BATCH) {
        const batch = pageImages.slice(i, i + PAGES_PER_BATCH);
        const md = await visionPageBatch(batch, filename, fileType, i + 1, pageImages.length);
        chunks.push(md);
      }
      return chunks.join("\n\n");
    }

    // ── Office: text + embedded images ──
    const extractedText = await extractOfficeText(buffer, mimeType, filename);

    if (embeddedImages.length > 0 || extractedText.trim()) {
      return await visionOfficeDocument(extractedText, embeddedImages, filename, fileType);
    }

    return `> **${fileType}: ${filename}**\n>\n> Failed to extract content.`;
  } catch (err) {
    console.error(`[file-extractor] Error processing ${filename}:`, err);
    throw new Error(`Failed to process ${filename}.`);
  }
}
