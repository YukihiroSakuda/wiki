import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/pages/map — returns { [title]: slug } for all pages
// Used by client components to resolve [[wiki links]] in PageContent.
export async function GET() {
  const pages = await prisma.page.findMany({ select: { title: true, slug: true } });
  const map = Object.fromEntries(pages.map((p) => [p.title, p.slug]));
  return NextResponse.json(map);
}
