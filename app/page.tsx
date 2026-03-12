import Link from "next/link";
import sql from "@/lib/db";

interface Dashboard {
  id: number;
  company_name: string;
  company_short: string;
  created_at: string;
  updated_at: string;
}

export default async function HomePage() {
  let dashboards: Dashboard[] = [];
  let error = "";

  try {
    dashboards = await sql`
      SELECT id, company_name, company_short, created_at, updated_at
      FROM dashboards ORDER BY created_at DESC
    `;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboards";
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboards</h1>
          <p className="text-sm text-neutral-500 mt-1">
            AI integration rollout dashboards for your clients
          </p>
        </div>
        <Link
          href="/new"
          className="bg-white text-black font-medium text-sm py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Dashboard
        </Link>
      </div>

      {error ? (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          Failed to load dashboards. Please refresh the page.
        </div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 mb-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-neutral-500 text-sm">No dashboards yet</p>
          <p className="text-neutral-600 text-xs mt-1">Create your first dashboard to get started</p>
          <Link
            href="/new"
            className="mt-4 bg-white text-black font-medium text-sm py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Create Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/${d.id}`}
              className="group border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-sm font-semibold text-white group-hover:bg-neutral-700 transition-colors">
                  {(d.company_short || d.company_name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {d.company_name}
                  </div>
                  {d.company_short && d.company_short !== d.company_name && (
                    <div className="text-xs text-neutral-500 truncate">
                      {d.company_short}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <time className="text-xs text-neutral-600" dateTime={d.created_at}>
                  {new Date(d.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <span className="text-xs text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
