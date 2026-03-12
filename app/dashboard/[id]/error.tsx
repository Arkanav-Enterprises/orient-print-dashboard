"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-neutral-500 mb-4 max-w-md">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-white text-black font-medium text-sm py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/"
            className="text-neutral-500 hover:text-neutral-300 text-sm py-2 px-4 rounded-lg border border-neutral-800 transition-colors"
          >
            Back to dashboards
          </Link>
        </div>
      </div>
    </div>
  );
}
