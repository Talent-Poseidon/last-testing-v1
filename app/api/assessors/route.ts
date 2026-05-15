import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assessors = await prisma.assessor.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(assessors);
  } catch (error) {
    console.error("[API] GET /api/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessors" },
      { status: 500 }
    );
  }
}
