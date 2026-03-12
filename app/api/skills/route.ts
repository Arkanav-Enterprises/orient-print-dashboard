import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET all skills
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, slug, name, category, department, tier, description,
             instructions, input_fields, output_format, examples, knowledge_files,
             created_at, updated_at
      FROM skills ORDER BY created_at ASC
    `;
    const skills = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      department: r.department,
      tier: r.tier,
      description: r.description,
      instructions: r.instructions,
      inputFields: r.input_fields,
      outputFormat: r.output_format,
      examples: r.examples,
      knowledgeFiles: r.knowledge_files,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return NextResponse.json(skills);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST create a new skill
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [row] = await sql`
      INSERT INTO skills (slug, name, category, department, tier, description,
                          instructions, input_fields, output_format, examples, knowledge_files)
      VALUES (${body.slug}, ${body.name}, ${body.category || "custom"},
              ${body.department || ""}, ${body.tier || "t2"}, ${body.description || ""},
              ${body.instructions || ""}, ${JSON.stringify(body.inputFields || [])},
              ${body.outputFormat || ""}, ${JSON.stringify(body.examples || [])},
              ${JSON.stringify(body.knowledgeFiles || [])})
      RETURNING id, slug, name, category, department, tier, description,
                instructions, input_fields, output_format, examples, knowledge_files,
                created_at, updated_at
    `;
    return NextResponse.json({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      department: row.department,
      tier: row.tier,
      description: row.description,
      instructions: row.instructions,
      inputFields: row.input_fields,
      outputFormat: row.output_format,
      examples: row.examples,
      knowledgeFiles: row.knowledge_files,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT update a skill
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const [row] = await sql`
      UPDATE skills SET
        slug = ${body.slug},
        name = ${body.name},
        category = ${body.category || "custom"},
        department = ${body.department || ""},
        tier = ${body.tier || "t2"},
        description = ${body.description || ""},
        instructions = ${body.instructions || ""},
        input_fields = ${JSON.stringify(body.inputFields || [])},
        output_format = ${body.outputFormat || ""},
        examples = ${JSON.stringify(body.examples || [])},
        knowledge_files = ${JSON.stringify(body.knowledgeFiles || [])},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING id
    `;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE a skill
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await sql`DELETE FROM skills WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
