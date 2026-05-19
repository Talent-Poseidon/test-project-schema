import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const INVITATION_EXPIRY_DAYS = 7;

function buildExpiresAt(sentAt: Date): Date {
  const expires = new Date(sentAt);
  expires.setUTCDate(expires.getUTCDate() + INVITATION_EXPIRY_DAYS);
  return expires;
}

export async function POST(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; invitationId: string }> },
) {
  try {
    const { id: projectId, invitationId } = await params;
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
      include: { assessee: true },
    });

    if (!invitation || invitation.projectId !== projectId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    const now = new Date();
    const isExpiredByDate = invitation.expiresAt.getTime() <= now.getTime();
    const isExpiredByStatus = invitation.status === "expired";

    // AC-9: only expired invitations can be resent.
    if (!isExpiredByDate && !isExpiredByStatus) {
      return NextResponse.json(
        { error: "Only expired invitations can be resent" },
        { status: 400 },
      );
    }

    const sentAt = new Date();
    const expiresAt = buildExpiresAt(sentAt);

    const resent = await prisma.$transaction(async (tx) => {
      // Mark the old one as expired (already is, but be explicit) and create a new one.
      await tx.projectInvitation.update({
        where: { id: invitationId },
        data: { status: "expired" },
      });

      const fresh = await tx.projectInvitation.create({
        data: {
          projectId,
          assesseeId: invitation.assesseeId,
          email: invitation.email,
          status: "sent",
          sentAt,
          expiresAt,
        },
      });

      await tx.projectEvent.create({
        data: {
          projectId,
          eventType: "Assessee Notified",
          payload: JSON.stringify({
            invitationId: fresh.id,
            resentFrom: invitation.id,
            email: invitation.email,
          }),
        },
      });
      return fresh;
    });

    console.log(
      `[ExternalSystem] Resending invitation to ${invitation.email} for project ${projectId}`,
    );

    return NextResponse.json(resent, { status: 201 });
  } catch (error) {
    console.error(
      "[API] POST /api/projects/[id]/invitations/[invitationId]/resend failed:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 },
    );
  }
}
