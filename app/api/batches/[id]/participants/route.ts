import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 20;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AddParticipantsBody {
  participants?: Array<{ name: string; email: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as AddParticipantsBody;
    const participantList = Array.isArray(body.participants)
      ? body.participants
      : [];

    if (participantList.length === 0) {
      return NextResponse.json(
        { error: "No participants provided" },
        { status: 400 }
      );
    }

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { participants: true } } },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const currentCount = batch._count.participants;
    const totalAfter = currentCount + participantList.length;

    // AC-14 / AC-16: Backend validation
    if (totalAfter > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Batch cannot contain more than ${MAX_BATCH_SIZE} participants. This batch already has ${currentCount}. Please create a new batch for additional participants.`,
        },
        { status: 400 }
      );
    }

    for (const p of participantList) {
      if (!p.name || !p.email) {
        return NextResponse.json(
          { error: "Each participant must have name and email" },
          { status: 400 }
        );
      }
    }

    const created = await prisma.participant.createMany({
      data: participantList.map((p) => ({
        batchId: id,
        name: p.name,
        email: p.email,
      })),
    });

    return NextResponse.json({ added: created.count }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/batches/[id]/participants failed:", error);
    return NextResponse.json(
      { error: "Failed to add participants" },
      { status: 500 }
    );
  }
}
