import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKamusFile } from "@/lib/kamus/parser";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

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
        {
          error: "Validation failed",
          errors: parsed.errors,
        },
        { status: 400 },
      );
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No rows to import",
          errors: [{ rowNumber: 0, message: "No rows to import" }],
        },
        { status: 400 },
      );
    }

    const codes = parsed.rows.map((r) => r.code);
    const existing = await prisma.kamus.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    if (existing.length > 0) {
      const existingCodes = new Set(existing.map((e) => e.code));
      const errors = parsed.rows
        .filter((r) => existingCodes.has(r.code))
        .map((r) => ({
          rowNumber: r.rowNumber,
          field: "code",
          message: `Kamus with code '${r.code}' already exists. Use the update flow to modify it.`,
        }));
      return NextResponse.json(
        { error: "Duplicate codes", errors },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(
      parsed.rows.map((row) =>
        prisma.kamus.create({
          data: {
            code: row.code,
            name: row.name,
            type: row.type,
            description: row.description,
            behavioralIndicators: row.behavioralIndicators,
            createdBy: userId,
            updatedBy: userId,
          },
        }),
      ),
    );

    await prisma.kamusEvent.create({
      data: {
        eventType: "Kamus Submitted",
        payload: JSON.stringify({
          count: created.length,
          codes: created.map((c) => c.code),
        }),
        createdBy: userId,
      },
    });

    return NextResponse.json(
      {
        message: "Kamus uploaded successfully",
        count: created.length,
        event: "Kamus Submitted",
        items: created,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API] POST /api/kamus/upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload kamus" },
      { status: 500 },
    );
  }
}
