import { NextResponse } from "next/server";
import sql from "@/lib/db";

// Serves raw HTML directly — used as iframe src to avoid JSON-encoding 125KB+ of HTML
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return new NextResponse("Invalid dashboard ID", { status: 400 });
    }
    const [row] = await sql`
      SELECT html FROM dashboards WHERE id = ${numericId}
    `;
    if (!row || !row.html) {
      return new NextResponse("Dashboard not found", { status: 404 });
    }
    return new NextResponse(row.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }
}
