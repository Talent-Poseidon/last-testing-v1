import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// AC-8: Mark invitations as expired when past the 7-day TTL.
// Production setup would call this via a cron job. The endpoint is idempotent.
export async function POST() {
  try {
    const now = new Date();
    const result = await prisma.invitation.updateMany({
      where: {
        status: "sent",
        expiresAt: { lt: now },
      },
      data: { status: "expired" },
    });

    return NextResponse.json({
      expiredCount: result.count,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[API] POST /api/invitations/sweep failed:", error);
    return NextResponse.json(
      { error: "Failed to sweep invitations" },
      { status: 500 }
    );
  }
}
