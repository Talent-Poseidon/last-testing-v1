import { KAMUS_TEMPLATE_CSV } from "@/lib/kamus/template";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(KAMUS_TEMPLATE_CSV, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kamus-template.csv"',
    },
  });
}
