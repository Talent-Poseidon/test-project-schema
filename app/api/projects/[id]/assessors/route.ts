import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const assessors = await prisma.projectAssessor.findMany({
      where: { projectId },
      include: { assessor: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assessors);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch project assessors" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { assessorId } = body ?? {};

    if (!assessorId || typeof assessorId !== "string") {
      return NextResponse.json(
        { error: "assessorId is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // AC-13: assessor must come from valid master data and be active.
    const master = await prisma.assessorMaster.findUnique({
      where: { id: assessorId },
    });
    if (!master || !master.active) {
      return NextResponse.json(
        { error: "Assessor is not in valid master data" },
        { status: 400 },
      );
    }

    const existing = await prisma.projectAssessor.findUnique({
      where: { projectId_assessorId: { projectId, assessorId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Assessor already assigned to this project" },
        { status: 409 },
      );
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.projectAssessor.create({
        data: { projectId, assessorId },
        include: { assessor: true },
      });

      // AC-12: emit Assessor Assigned event.
      await tx.projectEvent.create({
        data: {
          projectId,
          eventType: "Assessor Assigned",
          payload: JSON.stringify({
            assessorId,
            assessorEmail: master.email,
          }),
        },
      });

      return created;
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to assign assessor" },
      { status: 500 },
    );
  }
}
