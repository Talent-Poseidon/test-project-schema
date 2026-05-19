import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const INVITATION_EXPIRY_DAYS = 7;

function buildExpiresAt(sentAt: Date): Date {
  const expires = new Date(sentAt);
  expires.setUTCDate(expires.getUTCDate() + INVITATION_EXPIRY_DAYS);
  return expires;
}

// Mock external system delivery — in production this would call email/messaging provider.
async function notifyExternalSystem(email: string, projectId: string) {
  console.log(
    `[ExternalSystem] Sending invitation to ${email} for project ${projectId}`,
  );
  return { delivered: true };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    // Apply rolling expiry: anything past expiresAt should be marked expired.
    const now = new Date();
    await prisma.projectInvitation.updateMany({
      where: { projectId, status: { not: "expired" }, expiresAt: { lt: now } },
      data: { status: "expired" },
    });

    const invitations = await prisma.projectInvitation.findMany({
      where: { projectId },
      include: { assessee: true },
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json(invitations);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
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
    const body = await request.json().catch(() => ({}));
    const { assesseeIds } = body ?? {};

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { batches: { include: { assessees: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const allAssessees = project.batches.flatMap((b) => b.assessees);
    const targets =
      Array.isArray(assesseeIds) && assesseeIds.length > 0
        ? allAssessees.filter((a) => assesseeIds.includes(a.id))
        : allAssessees;

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No assessees to invite. Add participants first." },
        { status: 400 },
      );
    }

    const sentAt = new Date();
    const expiresAt = buildExpiresAt(sentAt);
    const created: Array<{ id: string }> = [];

    for (const a of targets) {
      await notifyExternalSystem(a.email, projectId);
      const invitation = await prisma.$transaction(async (tx) => {
        const inv = await tx.projectInvitation.create({
          data: {
            projectId,
            assesseeId: a.id,
            email: a.email,
            status: "sent",
            sentAt,
            expiresAt,
          },
        });

        // AC-7: emit Assessee Notified event for each successful send.
        await tx.projectEvent.create({
          data: {
            projectId,
            eventType: "Assessee Notified",
            payload: JSON.stringify({
              invitationId: inv.id,
              assesseeId: a.id,
              email: a.email,
            }),
          },
        });
        return inv;
      });
      created.push({ id: invitation.id });
    }

    return NextResponse.json(
      { count: created.length, invitations: created },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    );
  }
}
