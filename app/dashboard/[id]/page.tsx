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
    <div className="flex flex-col h-[calc(100vh-49px)]">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[rgba(237,236,236,0.08)] shrink-0">
        <Link href="/" className="text-[rgba(237,236,236,0.4)] hover:text-[rgba(237,236,236,0.7)] text-sm transition-colors">
          &larr; All Dashboards
        </Link>
        <span className="text-[rgba(237,236,236,0.15)]">/</span>
        <span className="text-sm text-[#edecec] font-medium">{name}</span>
        <a
          href={`/api/dashboards/${numericId}/html`}
          download={`${name.replace(/\s+/g, "_")}_Dashboard.html`}
          className="ml-auto text-xs text-[rgba(237,236,236,0.4)] hover:text-[rgba(237,236,236,0.7)] border border-[rgba(237,236,236,0.08)] rounded-lg px-3 py-1.5 transition-colors"
        >
          Download .html
        </a>
      </div>
      <iframe
        src={`/api/dashboards/${numericId}/html`}
        className="flex-1 w-full border-0"
        title={name}
      />
    </div>
  );
}
