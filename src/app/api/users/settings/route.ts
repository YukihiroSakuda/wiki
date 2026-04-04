import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/users/settings — persist accent color & theme preference
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accentColor, theme } = await req.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(accentColor && { accentColor }),
        ...(theme && { theme }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/users/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/users/settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accentColor: true, theme: true },
    });

    return NextResponse.json({ accentColor: user?.accentColor, theme: user?.theme });
  } catch (error) {
    console.error("GET /api/users/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
