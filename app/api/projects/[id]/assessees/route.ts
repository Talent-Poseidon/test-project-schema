import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const MAX_ASSESSEES_PER_BATCH = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { batchId, name, email } = body ?? {};

    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 },
      );
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Assessee name is required" },
        { status: 400 },
      );
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid assessee email is required" },
        { status: 400 },
      );
    }

    const batch = await prisma.projectBatch.findFirst({
      where: { id: batchId, projectId },
    });
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found for this project" },
        { status: 404 },
      );
    }

    // AC-14 / AC-16: enforce the per-batch 20-entry limit on the backend.
    const existingCount = await prisma.projectAssessee.count({
      where: { batchId },
    });
    if (existingCount >= MAX_ASSESSEES_PER_BATCH) {
      return NextResponse.json(
        {
          error: `Batch is full. Maximum ${MAX_ASSESSEES_PER_BATCH} entries per batch. Please create a new batch.`,
        },
        { status: 400 },
      );
    }

    const assessee = await prisma.projectAssessee.create({
      data: { batchId, name: name.trim(), email: email.trim() },
    });

    return NextResponse.json(assessee, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/assessees failed:", error);
    return NextResponse.json(
      { error: "Failed to add assessee" },
      { status: 500 },
    );
  }
}
