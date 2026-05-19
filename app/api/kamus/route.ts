import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (type === "potensi" || type === "kompetensi") {
      where.type = type;
    }
    if (q && q.trim().length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.kamus.findMany({
      where,
      orderBy: { code: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API] GET /api/kamus failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch kamus" },
      { status: 500 },
    );
  }
}
