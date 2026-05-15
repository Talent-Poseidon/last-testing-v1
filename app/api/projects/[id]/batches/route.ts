import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 20;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CreateBatchBody {
  name?: string;
  participants?: Array<{ name: string; email: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const batches = await prisma.batch.findMany({
      where: { projectId: id },
      include: { participants: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(batches);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/batches failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateBatchBody;
    const { name, participants } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Batch name is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const participantList = Array.isArray(participants) ? participants : [];

    // AC-14 / AC-16: Backend validation — max 20 per batch
    if (participantList.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Batch cannot contain more than ${MAX_BATCH_SIZE} participants. Please split into multiple batches.`,
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

    const batch = await prisma.batch.create({
      data: {
        projectId: id,
        name,
        participants: {
          create: participantList.map((p) => ({
            name: p.name,
            email: p.email,
          })),
        },
      },
      include: { participants: true },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/batches failed:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
