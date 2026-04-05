/**
 * Converts documents to image buffers for Vision LLM processing.
 *
 * PDF  → pdfjs-dist + @napi-rs/canvas → per-page PNG buffers
 * Office (DOCX/XLSX/PPTX) → adm-zip extracts embedded images from the ZIP archive
 *                          + text extracted via existing libs
 * Images → returned as-is
 */

import path from "path";

export const MAX_PDF_PAGES = 20;
export const MAX_EMBEDDED_IMAGES = 12;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

/** ZIP-internal folder where Office formats store embedded media */
const OFFICE_MEDIA_PREFIX: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word/media/",
  "application/msword": "word/media/",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xl/media/",
  "application/vnd.ms-excel": "xl/media/",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt/media/",
  "application/vnd.ms-powerpoint": "ppt/media/",
};

export interface DocumentImages {
  /** Full-page renders (PDF).  For Office files this is empty. */
  pageImages: Buffer[];
  /** Images embedded inside the document (Office ZIP media folder). */
  embeddedImages: Buffer[];
  /** true when pageImages are full visual renders (PDF / plain images). */
  isRendered: boolean;
}

// ── PDF rendering ─────────────────────────────────────────────────────────────

async function pdfToPageImages(buffer: Buffer): Promise<Buffer[]> {
  const { createCanvas } = await import("@napi-rs/canvas");

  // pdfjs-dist legacy build works in Node.js without a DOM
  const pdfjsLib = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs" as string
  )) as typeof import("pdfjs-dist");

  // Disable the Web Worker — not available in Node
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = Math.min(pdfDoc.numPages, MAX_PDF_PAGES);
  const images: Buffer[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2× for legibility

    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;

    images.push(canvas.toBuffer("image/png"));
    page.cleanup();
  }

  await pdfDoc.destroy();
  return images;
}

// ── Office embedded image extraction ─────────────────────────────────────────

function extractOfficeEmbeddedImages(buffer: Buffer, mediaPrefix: string): Buffer[] {
  try {
    // Dynamic require — adm-zip is a CJS module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require("adm-zip") as new (buf: Buffer) => {
      getEntries: () => { entryName: string; getData: () => Buffer }[];
    };

    const zip = new AdmZip(buffer);
    const images: Buffer[] = [];

    for (const entry of zip.getEntries()) {
      const name = entry.entryName.toLowerCase();
      if (!name.startsWith(mediaPrefix.toLowerCase())) continue;
      if (!IMAGE_EXTS.has(path.extname(name))) continue;
      images.push(entry.getData());
      if (images.length >= MAX_EMBEDDED_IMAGES) break;
    }

    return images;
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fileToImages(buffer: Buffer, mimeType: string): Promise<DocumentImages> {
  // Plain images: return as single-item rendered image
  if (mimeType.startsWith("image/")) {
    return { pageImages: [buffer], embeddedImages: [], isRendered: true };
  }

  // PDF: render each page
  if (mimeType === "application/pdf") {
    const pageImages = await pdfToPageImages(buffer);
    return { pageImages, embeddedImages: [], isRendered: true };
  }

  // Office formats: extract embedded images from ZIP
  const mediaPrefix = OFFICE_MEDIA_PREFIX[mimeType];
  const embeddedImages = mediaPrefix ? extractOfficeEmbeddedImages(buffer, mediaPrefix) : [];
  return { pageImages: [], embeddedImages, isRendered: false };
}
