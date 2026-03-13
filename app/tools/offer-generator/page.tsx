"use client";

import { useState } from "react";

export default function OfferGeneratorPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const generate = async () => {
    if (!text.trim()) {
      setError("Please paste the structured output first.");
      return;
    }
    setLoading(true);
    setError("");
    setDownloadUrl("");

    try {
      const res = await fetch("/api/tools/offer-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Generation failed (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      const name = nameMatch ? nameMatch[1] : "Orient_Jet_Offer.docx";

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setFileName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Offer Generator</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Paste the structured output (Sections A–E) from the Claude Enterprise
          Pricing Project below, then click Generate.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-neutral-500 mb-2 block font-medium">
            Claude Enterprise Output
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`SECTION A: COVER PAGE DATA\n\`\`\`\nSERIES: C SERIES\nDATE: 13/03/2026\nPROFORMA_NO: 26128\nCUSTOMER_NAME: [Customer Name]\nORDER_TYPE: DOMESTIC\n\`\`\`\n\nSECTION B: MACHINE SPECIFICATION\n...`}
            rows={20}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-sm text-neutral-300 placeholder-neutral-600 resize-y focus:outline-none focus:border-neutral-600 transition-colors font-mono"
          />
          <p className="text-xs text-neutral-600 mt-1 text-right">
            {text.length.toLocaleString()} characters
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 items-center">
          <button
            onClick={generate}
            disabled={loading || !text.trim()}
            className="bg-white text-black font-medium text-sm py-2.5 px-6 rounded-lg hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Offer"
            )}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={fileName}
              className="flex items-center gap-2 bg-neutral-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-700 border border-neutral-700 transition-all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 2v8M4 7l3 3 3-3" />
                <path d="M2 11h10" />
              </svg>
              Download {fileName}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
