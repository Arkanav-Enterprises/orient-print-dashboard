import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Dashboard not found</h2>
        <p className="text-sm text-neutral-500 mb-4">
          This dashboard may have been deleted or doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="bg-white text-black font-medium text-sm py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Back to dashboards
        </Link>
      </div>
    </div>
  );
}
