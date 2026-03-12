"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-neutral-500 mb-4 max-w-md">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="bg-white text-black font-medium text-sm py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
