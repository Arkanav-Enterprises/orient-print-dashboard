import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const offerId = parseInt(id, 10);
    if (!offerId) return NextResponse.json({ error: "Invalid offer ID" }, { status: 400 });

    const [row] = await sql`SELECT pdf_data, filename FROM offers WHERE id = ${offerId}`;
    if (!row || !row.pdf_data) return NextResponse.json({ error: "PDF not found" }, { status: 404 });

    const filename = row.filename || `Offer_${offerId}.pdf`;
    return new NextResponse(row.pdf_data as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
