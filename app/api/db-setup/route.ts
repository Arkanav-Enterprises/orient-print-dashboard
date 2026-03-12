import { NextResponse } from "next/server";
import { setupTables } from "@/lib/db-setup";

export async function POST() {
  try {
    await setupTables();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("DB setup error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
