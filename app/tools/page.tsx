import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/offer-generator",
    name: "Offer Generator",
    description:
      "Generate branded 8-page offer proposals from Claude Enterprise pricing output",
    status: "LIVE",
  },
];

export default function ToolsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white">Tools</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Internal tools powered by the AI rollout pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-sm font-semibold text-white group-hover:bg-neutral-700 transition-colors">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H2v12h12V2z" />
                  <path d="M5 6h6M5 9h4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  {t.name}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 border border-green-800/50">
                    {t.status}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {t.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
