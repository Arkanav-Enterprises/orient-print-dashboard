import Link from "next/link";
import { notFound } from "next/navigation";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  const [row] = await sql`
    SELECT id, company_name, company_short
    FROM dashboards WHERE id = ${numericId}
  `;
  if (!row) notFound();

  const name = row.company_name || "Dashboard";

  return (
    <div className="h-[calc(100vh-49px)]">
      <iframe
        src={`/api/dashboards/${numericId}/html`}
        className="w-full h-full border-0"
        title={name}
      />
    </div>
  );
}
