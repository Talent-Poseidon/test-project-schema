import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const kamus = await prisma.kamus.findUnique({ where: { id } });
    if (!kamus) {
      return NextResponse.json({ error: "Kamus not found" }, { status: 404 });
    }

    const [standarRefs, scenarioRefs] = await Promise.all([
      prisma.standarJabatanItem.count({ where: { kamusId: id } }),
      prisma.scenarioItem.count({ where: { kamusId: id } }),
    ]);

    if (standarRefs > 0 || scenarioRefs > 0) {
      const parts: string[] = [];
      if (standarRefs > 0) parts.push(`${standarRefs} Standar Jabatan`);
      if (scenarioRefs > 0) parts.push(`${scenarioRefs} Scenario`);
      return NextResponse.json(
        {
          error: "Cannot delete kamus that is referenced",
          message: `Kamus '${kamus.code}' is used by ${parts.join(
            " and ",
          )} and cannot be deleted.`,
          standarRefs,
          scenarioRefs,
        },
        { status: 409 },
      );
    }

    await prisma.kamus.delete({ where: { id } });
    return NextResponse.json({ message: "Kamus deleted" });
  } catch (error) {
    console.error("[API] DELETE /api/kamus/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete kamus" },
      { status: 500 },
    );
  }
}
