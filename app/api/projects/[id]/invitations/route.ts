import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const INVITATION_TTL_DAYS = 7;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SendInvitationsBody {
  participantIds?: string[];
  resend?: boolean;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// External email/messaging system stub. In production this would call a real provider.
async function sendExternalNotification(email: string, payload: Record<string, unknown>) {
  console.log(`[Invitation] External notification dispatched to ${email}`, payload);
  return { delivered: true };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        batches: {
          include: {
            participants: {
              include: {
                invitations: { orderBy: { sentAt: "desc" } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const now = new Date();
    const rows: Array<{
      participantId: string;
      participantName: string;
      participantEmail: string;
      latestStatus: string;
      sentAt: string | null;
      expiresAt: string | null;
    }> = [];

    for (const batch of project.batches) {
      for (const participant of batch.participants) {
        const latest = participant.invitations[0];

        let status: string;
        if (!latest) {
          status = "not-sent";
        } else if (
          latest.status !== "accepted" &&
          latest.expiresAt.getTime() < now.getTime()
        ) {
          status = "expired";
        } else {
          status = latest.status;
        }

        rows.push({
          participantId: participant.id,
          participantName: participant.name,
          participantEmail: participant.email,
          latestStatus: status,
          sentAt: latest ? latest.sentAt.toISOString() : null,
          expiresAt: latest ? latest.expiresAt.toISOString() : null,
        });
      }
    }

    return NextResponse.json({ projectId: id, invitations: rows });
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as SendInvitationsBody;
    const { participantIds, resend } = body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { batches: { include: { participants: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const allParticipantIds = project.batches.flatMap((b) =>
      b.participants.map((p) => p.id)
    );

    const targetIds =
      participantIds && participantIds.length > 0
        ? participantIds.filter((pid) => allParticipantIds.includes(pid))
        : allParticipantIds;

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: "No participants available to invite" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = addDays(now, INVITATION_TTL_DAYS);
    const sent: Array<{ participantId: string; invitationId: string }> = [];

    for (const participantId of targetIds) {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { invitations: { orderBy: { sentAt: "desc" } } },
      });
      if (!participant) continue;

      const latest = participant.invitations[0];
      const latestExpired = latest && latest.expiresAt.getTime() < now.getTime();
      const latestActive =
        latest && !latestExpired && latest.status !== "expired";

      // AC-9: Allow resend for expired invitations OR explicit resend flag
      if (latestActive && !resend) {
        // Skip: there is an active invitation already
        continue;
      }

      // Mark previous invitation as expired if applicable
      if (latest && latestExpired && latest.status !== "expired") {
        await prisma.invitation.update({
          where: { id: latest.id },
          data: { status: "expired" },
        });
      }

      const invitation = await prisma.invitation.create({
        data: {
          participantId: participant.id,
          status: "sent",
          sentAt: now,
          expiresAt,
        },
      });

      await sendExternalNotification(participant.email, {
        projectId: project.id,
        projectName: project.name,
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
      });

      sent.push({
        participantId: participant.id,
        invitationId: invitation.id,
      });
    }

    if (sent.length === 0) {
      return NextResponse.json(
        { error: "No invitations sent. All participants already have active invitations." },
        { status: 400 }
      );
    }

    // AC-7: Generate "Assessee Notified" event
    await prisma.projectEvent.create({
      data: {
        projectId: project.id,
        type: "Assessee Notified",
        payload: JSON.stringify({
          projectId: project.id,
          count: sent.length,
          participantIds: sent.map((s) => s.participantId),
        }),
      },
    });

    return NextResponse.json(
      {
        message: "Invitations sent successfully",
        count: sent.length,
        sent,
        event: "Assessee Notified",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
}
