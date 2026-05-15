import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const kamus = await prisma.kamus.findUnique({
      where: { id },
      include: {
        standarJabatans: { include: { standarJabatan: true } },
        scenarios: { include: { scenario: true } },
      },
    });

    if (!kamus) {
      return NextResponse.json({ error: "Kamus not found" }, { status: 404 });
    }

    const usedInStandar = kamus.standarJabatans.length;
    const usedInScenario = kamus.scenarios.length;

    if (usedInStandar > 0 || usedInScenario > 0) {
      const refs: string[] = [];
      if (usedInStandar > 0) {
        refs.push(
          `Standar Jabatan: ${kamus.standarJabatans
            .map((s) => s.standarJabatan.name)
            .join(", ")}`
        );
      }
      if (usedInScenario > 0) {
        refs.push(
          `Scenario: ${kamus.scenarios
            .map((s) => s.scenario.name)
            .join(", ")}`
        );
      }
      return NextResponse.json(
        {
          error: `Cannot delete kamus "${kamus.code}" because it is in use by ${refs.join(" and ")}`,
        },
        { status: 409 }
      );
    }

    await prisma.kamus.delete({ where: { id } });
    return NextResponse.json({ message: "Kamus deleted" });
  } catch (error) {
    console.error("[API] DELETE /api/kamus/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete kamus" },
      { status: 500 }
    );
  }
}
