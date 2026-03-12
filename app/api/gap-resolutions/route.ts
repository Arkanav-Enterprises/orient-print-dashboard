import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get("dashboardId");
    if (!dashboardId) return NextResponse.json({ error: "dashboardId required" }, { status: 400 });
    const rows = await sql`
      SELECT gap_id, status, owner, current_state, proposed_solution,
             required_data, notes, linked_skill_slugs, updated_at
      FROM gap_resolutions WHERE dashboard_id = ${parseInt(dashboardId)}
    `;
    const resolutions = rows.map((r) => ({
      gapId: r.gap_id,
      status: r.status,
      owner: r.owner,
      currentState: r.current_state,
      proposedSolution: r.proposed_solution,
      requiredData: r.required_data,
      notes: r.notes,
      linkedSkillSlugs: r.linked_skill_slugs,
      updatedAt: r.updated_at,
    }));
    return NextResponse.json(resolutions);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.dashboardId == null || !body.gapId) {
      return NextResponse.json({ error: "dashboardId and gapId required" }, { status: 400 });
    }
    await sql`
      INSERT INTO gap_resolutions (dashboard_id, gap_id, status, owner, current_state,
                                   proposed_solution, required_data, notes, linked_skill_slugs, updated_at)
      VALUES (${body.dashboardId}, ${body.gapId}, ${body.status || "open"},
              ${body.owner || ""}, ${body.currentState || ""},
              ${body.proposedSolution || ""}, ${body.requiredData || ""},
              ${body.notes || ""}, ${JSON.stringify(body.linkedSkillSlugs || [])}, NOW())
      ON CONFLICT (dashboard_id, gap_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        current_state = EXCLUDED.current_state,
        proposed_solution = EXCLUDED.proposed_solution,
        required_data = EXCLUDED.required_data,
        notes = EXCLUDED.notes,
        linked_skill_slugs = EXCLUDED.linked_skill_slugs,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
