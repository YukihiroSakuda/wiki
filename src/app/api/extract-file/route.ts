import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/azure/blob-storage";
import { extractFileToMarkdown, isSupportedType, SUPPORTED_TYPES } from "@/lib/file-extractor";

const MAX_SIZE = 30 * 1024 * 1024; // 30MB

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// POST /api/extract-file — multipart form with "file" field
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    if (!isSupportedType(file.type)) {
      const supported = Object.values(SUPPORTED_TYPES)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ");
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${supported}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds the 30MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // For images, upload to blob first so the markdown can reference the URL
    let imageUrl: string | undefined;
    if (IMAGE_TYPES.has(file.type)) {
      const uploaded = await uploadFile(buffer, file.name, file.type);
      imageUrl = uploaded.url;
    }

    const markdown = await extractFileToMarkdown(buffer, file.type, file.name, imageUrl);

    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("POST /api/extract-file error:", error);
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
