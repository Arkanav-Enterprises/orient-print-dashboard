import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboardId = parseInt(searchParams.get("dashboardId") || "0", 10);
    const projectNumber = parseInt(searchParams.get("projectNumber") || "0", 10);
    if (!dashboardId) return NextResponse.json({ error: "dashboardId required" }, { status: 400 });

    const rows = await sql`
      SELECT id, filename, uploaded_at
      FROM documents
      WHERE dashboard_id = ${dashboardId}
        AND (${projectNumber} = 0 OR project_number = ${projectNumber})
      ORDER BY uploaded_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const dashboardId = parseInt(formData.get("dashboardId") as string || "0", 10);
    const projectNumber = parseInt(formData.get("projectNumber") as string || "0", 10);
    const file = formData.get("file") as File | null;

    if (!dashboardId) return NextResponse.json({ error: "dashboardId required" }, { status: 400 });
    if (!projectNumber) return NextResponse.json({ error: "projectNumber required" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "untitled";

    const [row] = await sql`
      INSERT INTO documents (dashboard_id, project_number, filename, file_data)
      VALUES (${dashboardId}, ${projectNumber}, ${filename}, ${buffer})
      RETURNING id, filename, uploaded_at
    `;
    return NextResponse.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
