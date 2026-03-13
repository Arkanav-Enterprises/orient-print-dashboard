import { NextResponse } from "next/server";
import sql from "@/lib/db";

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return isNaN(n) ? null : n;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = parseId((await params).id);
    if (!numericId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [row] = await sql`
      SELECT id, company_name, company_short, created_at, updated_at
      FROM dashboards WHERE id = ${numericId}
    `;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = parseId((await params).id);
    if (!numericId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const updates: string[] = [];

    // Build dynamic update — only touch fields that were sent
    const companyName = body.companyName?.trim();
    const companyShort = body.companyShort?.trim();

    if (!companyName && companyName !== undefined) {
      return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
    }

    let row;
    if (companyName !== undefined && companyShort !== undefined) {
      [row] = await sql`
        UPDATE dashboards
        SET company_name = ${companyName}, company_short = ${companyShort}, updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING id, company_name, company_short, updated_at
      `;
    } else if (companyName !== undefined) {
      [row] = await sql`
        UPDATE dashboards
        SET company_name = ${companyName}, updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING id, company_name, company_short, updated_at
      `;
    } else if (companyShort !== undefined) {
      [row] = await sql`
        UPDATE dashboards
        SET company_short = ${companyShort}, updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING id, company_name, company_short, updated_at
      `;
    } else {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const numericId = parseId((await params).id);
    if (!numericId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [row] = await sql`
      DELETE FROM dashboards WHERE id = ${numericId} RETURNING id
    `;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
