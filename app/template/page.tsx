"use client";

import { useState, useCallback } from "react";
import {
  type ClientProfile,
  DEFAULT_CLIENT,
  COMMON_DEPARTMENTS,
  INDUSTRY_PRESETS,
} from "@/lib/template-schema";

export default function TemplatePage() {
  const [client, setClient] = useState<ClientProfile>({ ...DEFAULT_CLIENT });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [step, setStep] = useState<"form" | "result">("form");

  const update = useCallback(
    (field: keyof ClientProfile, value: string | string[]) => {
      setClient((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleDept = useCallback((dept: string) => {
    setClient((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  }, []);

  const applyPreset = useCallback((industry: string) => {
    const preset = INDUSTRY_PRESETS[industry];
    if (preset) {
      setClient((prev) => ({
        ...prev,
        industry,
        departments: preset.departments,
        painPoints: prev.painPoints || preset.painPoints,
      }));
    } else {
      setClient((prev) => ({ ...prev, industry }));
    }
  }, []);

  const generate = async () => {
    if (!client.companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (client.departments.length === 0) {
      setError("Select at least one department.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const { markdown: md } = await res.json();
      setMarkdown(md);
      setStep("result");

      // Persist to Supabase
      fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: client.companyName,
          industry: client.industry,
          clientProfile: client,
          markdown: md,
        }),
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Integration_Master_Plan_${client.companyName.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
  };

  // Feed into dashboard generator — redirect to / with the markdown as context
  const feedToDashboard = () => {
    // Store in sessionStorage so the main page can pick it up
    sessionStorage.setItem("templateText", markdown);
    window.location.href = "/new?fromTemplate=1";
  };

  if (step === "result") {
    return (
      <div className="min-h-[calc(100vh-49px)] flex flex-col">
        <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">
              Master Plan: {client.companyName}
            </h1>
            <p className="text-sm text-neutral-500">
              {client.industry} · {client.departments.length} departments
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("form")}
              className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-md hover:bg-neutral-700 border border-neutral-700 transition-colors"
            >
              Back to form
            </button>
            <button
              onClick={copyToClipboard}
              className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-md hover:bg-neutral-700 border border-neutral-700 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={downloadMarkdown}
              className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-md hover:bg-neutral-700 border border-neutral-700 transition-colors"
            >
              Download .md
            </button>
            <button
              onClick={feedToDashboard}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 transition-colors"
            >
              Generate Dashboard from this
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-lg p-8">
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer text={markdown} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-49px)] flex items-start justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Client Template Generator
          </h1>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            Generate a customized AI Integration Master Plan for any client.
            Fill in their details and get a complete rollout document.
          </p>
        </div>

        {/* Company basics */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Company Profile
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Company Name *
              </label>
              <input
                value={client.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Acme Corporation"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Industry *
              </label>
              <select
                value={client.industry}
                onChange={(e) => applyPreset(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
              >
                <option value="">Select industry...</option>
                {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
              {client.industry === "Other" && (
                <input
                  onChange={(e) => update("industry", e.target.value)}
                  placeholder="Type industry..."
                  className="w-full mt-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Employee Count
              </label>
              <input
                value={client.employeeCount}
                onChange={(e) => update("employeeCount", e.target.value)}
                placeholder="e.g., 50-200"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                ERP / Systems
              </label>
              <input
                value={client.erp}
                onChange={(e) => update("erp", e.target.value)}
                placeholder="e.g., SAP, Custom, Tally"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Claude Plan
              </label>
              <select
                value={client.claudePlan}
                onChange={(e) => update("claudePlan", e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
              >
                <option value="Enterprise">Enterprise</option>
                <option value="Team">Team</option>
                <option value="Pro">Pro (individual)</option>
                <option value="API Only">API Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Departments */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Departments *
          </h3>
          <p className="text-xs text-neutral-600">
            Select all departments that will use AI. Industry presets auto-select common ones.
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => toggleDept(dept)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  client.departments.includes(dept)
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-neutral-500 border-neutral-700 hover:border-neutral-500 hover:text-neutral-300"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </section>

        {/* Context */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Additional Context
          </h3>
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">
              Key Pain Points / Goals
            </label>
            <textarea
              value={client.painPoints}
              onChange={(e) => update("painPoints", e.target.value)}
              placeholder="What problems should AI solve? What processes are slowest?"
              className="w-full h-24 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 resize-y focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Existing AI Usage
              </label>
              <input
                value={client.existingAI}
                onChange={(e) => update("existingAI", e.target.value)}
                placeholder="e.g., ChatGPT for emails, none"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                Target Timeline
              </label>
              <input
                value={client.timeline}
                onChange={(e) => update("timeline", e.target.value)}
                placeholder="e.g., 6 months, 3 months"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-white text-black font-medium text-sm py-3 px-4 rounded-lg hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
              Generating Master Plan...
            </span>
          ) : (
            "Generate Master Plan"
          )}
        </button>
      </div>
    </div>
  );
}

// Simple markdown renderer — converts markdown to HTML inline
function MarkdownRenderer({ text }: { text: string }) {
  const html = text
    // Headers
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-white mt-6 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-white mt-10 mb-3 pb-2 border-b border-neutral-800">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mb-1">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-800 px-1 py-0.5 rounded text-xs text-blue-300">$1</code>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-neutral-800 my-6" />')
    // Table handling
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        return "<!-- table-separator -->";
      }
      const isHeader = match.includes("---");
      const tag = isHeader ? "th" : "td";
      const cellClass =
        tag === "th"
          ? 'class="text-left text-xs font-medium text-neutral-400 px-3 py-2 border-b border-neutral-700 bg-neutral-900/50"'
          : 'class="text-xs text-neutral-400 px-3 py-2 border-b border-neutral-800"';
      return `<tr>${cells.map((c) => `<${tag} ${cellClass}>${c}</${tag}>`).join("")}</tr>`;
    })
    // Wrap table rows
    .replace(
      /(<tr>[\s\S]*?<\/tr>\n?)(?:<!-- table-separator -->\n?)?(<tr>[\s\S]*?<\/tr>(?:\n<tr>[\s\S]*?<\/tr>)*)/g,
      '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-neutral-800 rounded-lg overflow-hidden">$1$2</table></div>'
    )
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="text-sm text-neutral-400 ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-neutral-400 ml-4 list-decimal">$1</li>')
    // Paragraphs (lines that aren't already tagged)
    .replace(/^(?!<[hludtrc]|<!--)(.+)$/gm, '<p class="text-sm text-neutral-400 mb-3 leading-relaxed">$1</p>')
    // Clean up empty paragraphs
    .replace(/<p[^>]*>\s*<\/p>/g, "")
    // Clean up table separators
    .replace(/<!-- table-separator -->/g, "");

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
