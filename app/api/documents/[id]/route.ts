import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);
    if (!docId) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });

    const [row] = await sql`DELETE FROM documents WHERE id = ${docId} RETURNING id`;
    if (!row) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
