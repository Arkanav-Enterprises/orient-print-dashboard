export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-neutral-800 shrink-0">
        <div className="w-24 h-4 bg-neutral-800 rounded animate-pulse" />
        <span className="text-neutral-700">/</span>
        <div className="w-40 h-4 bg-neutral-800 rounded animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-neutral-500 text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading dashboard...
        </div>
      </div>
    </div>
  );
}
