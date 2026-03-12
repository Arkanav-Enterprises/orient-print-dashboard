"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GeneratorPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");

  // Pick up text from template generator via sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("fromTemplate") === "1") {
        const templateText = sessionStorage.getItem("templateText");
        if (templateText) {
          setText(templateText);
          setFileName("Generated Master Plan");
          sessionStorage.removeItem("templateText");
          // Clean URL
          window.history.replaceState({}, "", "/new");
        }
      }
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboardHtml, setDashboardHtml] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const extractTextFromDocx = useCallback(async (file: File): Promise<string> => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) throw new Error("Could not read document.xml from .docx");
    return docXml
      .replace(/<w:br[^>]*\/>/gi, "\n")
      .replace(/<w:p[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      setFileName(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "docx") {
        try {
          const extracted = await extractTextFromDocx(file);
          setText(extracted);
        } catch (e) {
          setError(
            `Failed to extract text from .docx: ${e instanceof Error ? e.message : "Unknown error"}`
          );
        }
      } else if (ext === "txt" || ext === "md") {
        const content = await file.text();
        setText(content);
      } else {
        setError(
          "Unsupported file type. Use .docx, .txt, or .md. For .pages files, copy-paste the text below."
        );
      }
    },
    [extractTextFromDocx]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const generate = async () => {
    if (!text.trim()) {
      setError("Please upload a file or paste text first.");
      return;
    }
    setLoading(true);
    setError("");
    setDashboardHtml("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const dashboardData = await res.json();
      const { generateDashboardHTML } = await import("@/lib/dashboard-template");
      const html = generateDashboardHTML(dashboardData);

      // Persist to Supabase, then redirect to new dashboard
      const saveRes = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: dashboardData.companyName,
          companyShort: dashboardData.companyShort,
          data: dashboardData,
          html,
        }),
      });
      const row = await saveRes.json();
      if (row?.id) {
        router.push(`/dashboard/${row.id}`);
        return;
      }
      // Fallback: show preview locally if save failed
      setDashboardHtml(html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([dashboardHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI_Rollout_Dashboard_Generated.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-neutral-800">
        <h1 className="text-lg font-semibold text-white">Dashboard Generator</h1>
        <p className="text-sm text-neutral-500">Upload a document to generate an interactive AI rollout dashboard</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Upload */}
        <div className="lg:w-[480px] border-r border-neutral-800 p-6 flex flex-col gap-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-blue-500 bg-blue-500/10"
                : "border-neutral-700 hover:border-neutral-500"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div className="text-neutral-400 mb-2">
              <svg
                className="w-10 h-10 mx-auto mb-3 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm font-medium">
                Drop a file here or click to upload
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                .docx, .txt, .md supported. For .pages, paste text below.
              </p>
            </div>
            {fileName && (
              <p className="text-xs text-blue-400 mt-2">{fileName}</p>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs text-neutral-500 mb-2 font-medium">
              Or paste document text:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your AI integration plan text here..."
              className="flex-1 min-h-[200px] bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-sm text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-600 transition-colors"
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

          <div className="flex gap-3">
            <button
              onClick={generate}
              disabled={loading || !text.trim()}
              className="flex-1 bg-white text-black font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
                "Generate Dashboard"
              )}
            </button>
            {dashboardHtml && (
              <button
                onClick={download}
                className="bg-neutral-800 text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-700 border border-neutral-700 transition-all"
              >
                Download .html
              </button>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col">
          {dashboardHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={dashboardHtml}
              className="flex-1 w-full border-0"
              title="Dashboard Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-600">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <p className="text-sm">Dashboard preview will appear here</p>
                <p className="text-xs mt-1 text-neutral-700">
                  Upload a document and click Generate
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
