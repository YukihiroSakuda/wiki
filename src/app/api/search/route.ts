import { searchPages, semanticSearch } from "@/lib/search";
import { NextRequest, NextResponse } from "next/server";

// GET /api/search?q=xxx&tag=xxx&mode=fulltext|semantic&limit=20&offset=0
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? undefined;
  const mode = searchParams.get("mode") ?? "fulltext";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    const response =
      mode === "semantic"
        ? await semanticSearch(q, { limit })
        : await searchPages(q, { tag, limit, offset });
    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
