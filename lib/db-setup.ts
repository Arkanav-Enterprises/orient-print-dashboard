import sql from "./db";

export async function setupTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'custom',
      department TEXT DEFAULT '',
      tier TEXT NOT NULL DEFAULT 't2',
      description TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      input_fields JSONB DEFAULT '[]'::jsonb,
      output_format TEXT DEFAULT '',
      examples JSONB DEFAULT '[]'::jsonb,
      knowledge_files JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dashboards (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      company_short TEXT DEFAULT '',
      data JSONB NOT NULL,
      html TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      industry TEXT DEFAULT '',
      client_profile JSONB NOT NULL,
      markdown TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS kanban_state (
      id SERIAL PRIMARY KEY,
      dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE,
      epic_id TEXT NOT NULL,
      col TEXT NOT NULL DEFAULT 'backlog',
      checked JSONB DEFAULT '[]'::jsonb,
      UNIQUE(dashboard_id, epic_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      dashboard_id INTEGER NOT NULL,
      customer_name TEXT DEFAULT '',
      series TEXT DEFAULT '',
      proforma_no TEXT DEFAULT '',
      order_type TEXT DEFAULT 'DOMESTIC',
      total_price NUMERIC DEFAULT 0,
      filename TEXT DEFAULT '',
      pdf_data BYTEA,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Migration: add pdf_data column if missing (for existing databases)
  await sql`
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS pdf_data BYTEA
  `;

  // No FK — dashboard_id 0 is reserved for the static Printers Houst dashboard
  await sql`
    CREATE TABLE IF NOT EXISTS gap_resolutions (
      id SERIAL PRIMARY KEY,
      dashboard_id INTEGER NOT NULL DEFAULT 0,
      gap_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      owner TEXT DEFAULT '',
      current_state TEXT DEFAULT '',
      proposed_solution TEXT DEFAULT '',
      required_data TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      linked_skill_slugs JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(dashboard_id, gap_id)
    )
  `;
}
