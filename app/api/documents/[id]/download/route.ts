import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);
    if (!docId) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });

    const [row] = await sql`SELECT file_data, filename FROM documents WHERE id = ${docId}`;
    if (!row || !row.file_data) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const filename = row.filename || `document_${docId}`;
    return new NextResponse(row.file_data as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
