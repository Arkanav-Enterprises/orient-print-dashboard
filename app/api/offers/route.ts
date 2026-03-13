import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboardId = parseInt(searchParams.get("dashboardId") || "0", 10);
    if (!dashboardId) return NextResponse.json({ error: "dashboardId required" }, { status: 400 });

    const rows = await sql`
      SELECT id, customer_name, series, proforma_no, order_type, total_price, filename,
             (pdf_data IS NOT NULL) as has_pdf, created_at
      FROM offers WHERE dashboard_id = ${dashboardId}
      ORDER BY created_at DESC LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dashboardId, customerName, series, proformaNo, orderType, totalPrice, filename, pdfBase64 } = body;
    if (!dashboardId) return NextResponse.json({ error: "dashboardId required" }, { status: 400 });

    const pdfBuffer = pdfBase64 ? Buffer.from(pdfBase64, "base64") : null;

    const [row] = await sql`
      INSERT INTO offers (dashboard_id, customer_name, series, proforma_no, order_type, total_price, filename, pdf_data)
      VALUES (${dashboardId}, ${customerName || ""}, ${series || ""}, ${proformaNo || ""},
              ${orderType || "DOMESTIC"}, ${totalPrice || 0}, ${filename || ""}, ${pdfBuffer})
      RETURNING id, customer_name, series, proforma_no, order_type, total_price, filename, (pdf_data IS NOT NULL) as has_pdf, created_at
    `;
    return NextResponse.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
