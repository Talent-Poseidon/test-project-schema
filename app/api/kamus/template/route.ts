import { NextResponse } from "next/server";
import { buildEmptyTemplateCsv } from "@/lib/kamus/template";

export const dynamic = "force-dynamic";

export async function GET() {
  const csv = buildEmptyTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kamus-template.csv"',
    },
  });
}
