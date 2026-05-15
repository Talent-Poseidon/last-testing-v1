import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AssignAssessorBody {
  assessorIds?: string[];
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assessors: { include: { assessor: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      projectId: id,
      assessors: project.assessors.map((a) => ({
        id: a.assessor.id,
        name: a.assessor.name,
        email: a.assessor.email,
        expertise: a.assessor.expertise,
        assignedAt: a.assignedAt,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as AssignAssessorBody;
    const { assessorIds } = body;

    if (!assessorIds || !Array.isArray(assessorIds) || assessorIds.length === 0) {
      return NextResponse.json(
        { error: "assessorIds array is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // AC-13: Verify assessors exist in master data
    const validAssessors = await prisma.assessor.findMany({
      where: { id: { in: assessorIds } },
    });

    if (validAssessors.length !== assessorIds.length) {
      const foundIds = validAssessors.map((a) => a.id);
      const missing = assessorIds.filter((aid) => !foundIds.includes(aid));
      return NextResponse.json(
        {
          error:
            "One or more assessors are not in the master data and cannot be assigned.",
          missingIds: missing,
        },
        { status: 400 }
      );
    }

    const created: Array<{ assessorId: string }> = [];

    for (const assessorId of assessorIds) {
      const existing = await prisma.projectAssessor.findUnique({
        where: {
          projectId_assessorId: { projectId: id, assessorId },
        },
      });
      if (existing) continue;

      await prisma.projectAssessor.create({
        data: { projectId: id, assessorId },
      });
      created.push({ assessorId });
    }

    // AC-12: Generate "Assessor Assigned" event when at least one assignment is made
    if (created.length > 0) {
      await prisma.projectEvent.create({
        data: {
          projectId: id,
          type: "Assessor Assigned",
          payload: JSON.stringify({
            projectId: id,
            assessorIds: created.map((c) => c.assessorId),
          }),
        },
      });
    }

    return NextResponse.json(
      {
        message: "Assessors assigned successfully",
        assignedCount: created.length,
        event: "Assessor Assigned",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to assign assessors" },
      { status: 500 }
    );
  }
}
