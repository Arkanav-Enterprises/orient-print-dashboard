"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardSettingsProps {
  id: number;
  companyName: string;
  companyShort: string;
  createdAt: string;
}

export function DashboardSettings({ id, companyName, companyShort, createdAt }: DashboardSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(companyName);
  const [short, setShort] = useState(companyShort);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const hasChanges = name !== companyName || short !== companyShort;

  const save = async () => {
    if (!name.trim()) {
      setError("Company name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, companyShort: short }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-neutral-500 hover:text-neutral-300 transition-colors p-1.5 rounded hover:bg-neutral-800"
        title="Dashboard settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M6.5 1.5h3l.5 2 1.5.7 1.8-1 2.1 2.1-1 1.8.7 1.5 2 .5v3l-2 .5-0.7 1.5 1 1.8-2.1 2.1-1.8-1-1.5.7-.5 2h-3l-.5-2-1.5-.7-1.8 1-2.1-2.1 1-1.8-.7-1.5-2-.5v-3l2-.5.7-1.5-1-1.8 2.1-2.1 1.8 1 1.5-.7z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpen(false); setConfirmDelete(false); }} />

          {/* Panel */}
          <div className="ml-auto relative w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <h2 className="text-sm font-semibold text-white">Dashboard Settings</h2>
              <button
                onClick={() => { setOpen(false); setConfirmDelete(false); }}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Rename */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">General</h3>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Company Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Short Name</label>
                  <input
                    value={short}
                    onChange={(e) => setShort(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
                {hasChanges && (
                  <button
                    onClick={save}
                    disabled={saving}
                    className="bg-white text-black font-medium text-xs py-2 px-4 rounded-lg hover:bg-neutral-200 disabled:opacity-40 transition-all"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Info</h3>
                <div className="text-xs text-neutral-500 space-y-1">
                  <p>Dashboard ID: <span className="text-neutral-400">{id}</span></p>
                  <p>Created: <span className="text-neutral-400">{new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></p>
                </div>
              </div>

              {/* Export */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Export</h3>
                <a
                  href={`/api/dashboards/${id}/html`}
                  download={`${(name || "Dashboard").replace(/\s+/g, "_")}.html`}
                  className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white border border-neutral-800 rounded-lg px-3 py-2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 2v8M4 7l3 3 3-3" />
                    <path d="M2 11h10" />
                  </svg>
                  Download as .html
                </a>
              </div>

              {/* Danger Zone */}
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <h3 className="text-xs font-medium text-red-400/70 uppercase tracking-wider">Danger Zone</h3>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 rounded-lg px-3 py-2 transition-colors"
                  >
                    Delete Dashboard
                  </button>
                ) : (
                  <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-red-300">
                      This will permanently delete <strong>{companyName}</strong> and all associated data. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-600 text-white font-medium text-xs py-2 px-4 rounded-lg hover:bg-red-500 disabled:opacity-40 transition-all"
                      >
                        {deleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-neutral-400 hover:text-white py-2 px-4 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
