import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        batches: { include: { assessees: true } },
        assessors: { include: { assessor: true } },
        invitations: true,
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[API] GET /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, configuration, batchName } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Project description is required" },
        { status: 400 },
      );
    }
    if (!batchName || typeof batchName !== "string" || !batchName.trim()) {
      return NextResponse.json(
        { error: "Batch name is required" },
        { status: 400 },
      );
    }

    // AC-4 / AC-17: master data must exist before a project can be created.
    const kamusCount = await prisma.kamus.count();
    if (kamusCount === 0) {
      return NextResponse.json(
        {
          error:
            "Master Data not available. Please configure Kamus before creating a project.",
        },
        { status: 400 },
      );
    }

    const configString =
      typeof configuration === "string"
        ? configuration
        : JSON.stringify(configuration ?? {});

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: name.trim(),
          description,
          configuration: configString,
          status: "submitted",
        },
      });

      await tx.projectBatch.create({
        data: {
          projectId: project.id,
          name: batchName.trim(),
        },
      });

      // AC-2: generate Submit Project event.
      await tx.projectEvent.create({
        data: {
          projectId: project.id,
          eventType: "Submit Project",
          payload: JSON.stringify({
            projectId: project.id,
            name: project.name,
          }),
        },
      });

      return project;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
