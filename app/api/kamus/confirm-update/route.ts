import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKamusFile } from "@/lib/kamus/parser";
import { diffKamus, type KamusSnapshot } from "@/lib/kamus/diff";
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
        { error: "File is empty" },
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

    const existing = await prisma.kamus.findMany();
    const snapshot: KamusSnapshot[] = existing.map((e) => ({
      code: e.code,
      name: e.name,
      type: e.type,
      description: e.description,
      behavioralIndicators: e.behavioralIndicators,
    }));
    const diff = diffKamus(snapshot, parsed.rows);

    const deleteCodes = diff.toDelete.map((d) => d.code);
    if (deleteCodes.length > 0) {
      const referencedInStandar = await prisma.standarJabatanItem.findMany({
        where: { kamus: { code: { in: deleteCodes } } },
        select: { kamus: { select: { code: true } } },
      });
      const referencedInScenario = await prisma.scenarioItem.findMany({
        where: { kamus: { code: { in: deleteCodes } } },
        select: { kamus: { select: { code: true } } },
      });
      const blockedCodes = new Set([
        ...referencedInStandar.map((r) => r.kamus.code),
        ...referencedInScenario.map((r) => r.kamus.code),
      ]);
      if (blockedCodes.size > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete kamus that are referenced",
            blockedCodes: Array.from(blockedCodes),
            message: `The following kamus codes are referenced by Standar Jabatan or Scenario and cannot be deleted: ${Array.from(
              blockedCodes,
            ).join(", ")}`,
          },
          { status: 409 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const row of diff.toCreate) {
        await tx.kamus.create({
          data: {
            code: row.code,
            name: row.name,
            type: row.type,
            description: row.description,
            behavioralIndicators: row.behavioralIndicators,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
      for (const item of diff.toUpdate) {
        await tx.kamus.update({
          where: { code: item.existing.code },
          data: {
            name: item.incoming.name,
            type: item.incoming.type,
            description: item.incoming.description,
            behavioralIndicators: item.incoming.behavioralIndicators,
            updatedBy: userId,
          },
        });
      }
      for (const item of diff.toDelete) {
        await tx.kamus.delete({ where: { code: item.code } });
      }
      await tx.kamusEvent.create({
        data: {
          eventType: "Kamus Submitted",
          payload: JSON.stringify({
            created: diff.toCreate.length,
            updated: diff.toUpdate.length,
            deleted: diff.toDelete.length,
          }),
          createdBy: userId,
        },
      });
    });

    return NextResponse.json({
      message: "Kamus updated successfully",
      summary: {
        toCreate: diff.toCreate.length,
        toUpdate: diff.toUpdate.length,
        toDelete: diff.toDelete.length,
      },
      event: "Kamus Submitted",
    });
  } catch (error) {
    console.error("[API] POST /api/kamus/confirm-update failed:", error);
    return NextResponse.json(
      { error: "Failed to apply kamus update" },
      { status: 500 },
    );
  }
}
