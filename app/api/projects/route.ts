import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 20;

interface CreateProjectBody {
  name?: string;
  description?: string;
  batchName?: string;
  configuration?: string | Record<string, unknown>;
  participants?: Array<{ name: string; email: string }>;
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        batches: {
          include: {
            participants: true,
          },
        },
        assessors: {
          include: { assessor: true },
        },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[API] GET /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateProjectBody;
    const { name, description, batchName, configuration, participants } = body;

    if (!name || !description || !batchName) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, batchName" },
        { status: 400 }
      );
    }

    // AC-4 / AC-17: Master data availability check
    const kamusCount = await prisma.kamus.count();
    if (kamusCount === 0) {
      return NextResponse.json(
        {
          error:
            "Master data (Kamus) is not available. Please set up Master Data Setup before creating a project.",
        },
        { status: 400 }
      );
    }

    // AC-14 / AC-16: Backend batch size validation (max 20)
    const participantList = Array.isArray(participants) ? participants : [];
    if (participantList.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Batch cannot contain more than ${MAX_BATCH_SIZE} participants. Please split into multiple batches.`,
        },
        { status: 400 }
      );
    }

    // Validate participant entries (must have name + email)
    for (const p of participantList) {
      if (!p.name || !p.email) {
        return NextResponse.json(
          { error: "Each participant must have name and email" },
          { status: 400 }
        );
      }
    }

    const configString =
      typeof configuration === "string"
        ? configuration
        : JSON.stringify(configuration ?? {});

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          description,
          configuration: configString,
          status: "submitted",
        },
      });

      const batch = await tx.batch.create({
        data: {
          projectId: created.id,
          name: batchName,
        },
      });

      if (participantList.length > 0) {
        await tx.participant.createMany({
          data: participantList.map((p) => ({
            batchId: batch.id,
            name: p.name,
            email: p.email,
          })),
        });
      }

      // AC-2: Generate "Submit Project" event
      await tx.projectEvent.create({
        data: {
          projectId: created.id,
          type: "Submit Project",
          payload: JSON.stringify({
            projectId: created.id,
            name: created.name,
            batchName,
            participantCount: participantList.length,
          }),
        },
      });

      return created;
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        batches: { include: { participants: true } },
        assessors: { include: { assessor: true } },
      },
    });

    return NextResponse.json(
      {
        ...fullProject,
        event: "Submit Project",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
