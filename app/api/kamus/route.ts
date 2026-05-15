import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKamusCsv } from "@/lib/kamus/parser";
import { diffKamus } from "@/lib/kamus/diff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    const where: { type?: string; OR?: unknown[] } = {};
    if (type === "potensi" || type === "kompetensi") {
      where.type = type;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.kamus.findMany({
      where: where as object,
      orderBy: { code: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API] GET /api/kamus failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch kamus" },
      { status: 500 }
    );
  }
}

interface UploadBody {
  content?: string;
  mode?: "preview" | "commit";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UploadBody;
    const content = body.content;
    const mode = body.mode ?? "commit";

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "File content is required" },
        { status: 400 }
      );
    }

    const { rows, errors } = parseKamusCsv(content);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid file format or content", details: errors },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in file" },
        { status: 400 }
      );
    }

    const existing = await prisma.kamus.findMany();
    const diff = diffKamus(existing, rows);

    if (mode === "preview") {
      return NextResponse.json({ diff, totalRows: rows.length });
    }

    // Commit: upsert each row, then emit event.
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.kamus.upsert({
          where: { code: row.code },
          update: {
            name: row.name,
            type: row.type,
            description: row.description,
            behavioralIndicators: row.behavioralIndicators,
          },
          create: {
            code: row.code,
            name: row.name,
            type: row.type,
            description: row.description,
            behavioralIndicators: row.behavioralIndicators,
          },
        });
      }
      await tx.kamusEvent.create({
        data: {
          type: "Kamus Submitted",
          payload: JSON.stringify({
            totalRows: rows.length,
            added: diff.added.length,
            updated: diff.updated.length,
            removed: diff.removed.length,
          }),
        },
      });
    });

    return NextResponse.json(
      {
        message: "Kamus submitted successfully",
        totalRows: rows.length,
        added: diff.added.length,
        updated: diff.updated.length,
        removed: diff.removed.length,
        event: "Kamus Submitted",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/kamus failed:", error);
    return NextResponse.json(
      { error: "Failed to submit kamus" },
      { status: 500 }
    );
  }
}
