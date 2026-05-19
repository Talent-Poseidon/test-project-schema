import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKamusFile } from "@/lib/kamus/parser";
import { diffKamus, type KamusSnapshot } from "@/lib/kamus/diff";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let csvContent: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 },
        );
      }
      csvContent = await (file as File).text();
    } else {
      const body = await request.json();
      csvContent = body.content ?? "";
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: "File is empty", errors: [{ rowNumber: 0, message: "File is empty" }] },
        { status: 400 },
      );
    }

    const parsed = parseKamusFile(csvContent);
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors: parsed.errors },
        { status: 400 },
      );
    }

    const existing = await prisma.kamus.findMany({
      select: {
        code: true,
        name: true,
        type: true,
        description: true,
        behavioralIndicators: true,
      },
    });
    const snapshot: KamusSnapshot[] = existing;
    const diff = diffKamus(snapshot, parsed.rows);

    return NextResponse.json({
      summary: {
        toCreate: diff.toCreate.length,
        toUpdate: diff.toUpdate.length,
        toDelete: diff.toDelete.length,
        unchanged: diff.unchanged.length,
      },
      toCreate: diff.toCreate,
      toUpdate: diff.toUpdate,
      toDelete: diff.toDelete,
    });
  } catch (error) {
    console.error("[API] POST /api/kamus/preview failed:", error);
    return NextResponse.json(
      { error: "Failed to preview kamus" },
      { status: 500 },
    );
  }
}
