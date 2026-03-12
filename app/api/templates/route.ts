import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, company_name, industry, created_at
      FROM templates ORDER BY created_at DESC
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
    const [row] = await sql`
      INSERT INTO templates (company_name, industry, client_profile, markdown)
      VALUES (${body.companyName}, ${body.industry || ""}, ${JSON.stringify(body.clientProfile)}, ${body.markdown})
      RETURNING id, company_name, created_at
    `;
    return NextResponse.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
