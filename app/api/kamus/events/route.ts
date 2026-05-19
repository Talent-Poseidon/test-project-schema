import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await prisma.kamusEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("[API] GET /api/kamus/events failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
