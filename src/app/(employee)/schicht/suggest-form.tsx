"use client";

import { useState } from "react";

type ParentOption = { id: string; title: string };

export function SuggestForm({
  checklistId,
  parents,
}: {
  checklistId: string;
  parents: ParentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [parentItemId, setParentItemId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/checklist-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checklistId,
        parentItemId: parentItemId || null,
        title: title.trim(),
        description: description.trim() || null,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSent(true);
      setTitle("");
      setDescription("");
      setParentItemId("");
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1500);
    } else {
      alert("Fehler beim Senden");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-4 py-2.5 text-sm text-slate-400 hover:text-blue-400 hover:bg-slate-700/30 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Punkt vorschlagen
      </button>
    );
  }

  return (
    <div className="p-4 bg-slate-900/40 space-y-2 border-t border-slate-700/50">
      {sent ? (
        <p className="text-sm text-green-400 text-center py-3">Vorschlag gesendet — danke!</p>
      ) : (
        <>
          <p className="text-xs text-slate-400">Neuen Punkt vorschlagen</p>
          {parents.length > 0 && (
            <select
              value={parentItemId}
              onChange={(e) => setParentItemId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Als neuer Hauptpunkt</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>Unter „{p.title}"</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was soll geprüft werden?"
            maxLength={200}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            rows={2}
            maxLength={1000}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !title.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
            >
              {submitting ? "Senden..." : "Senden"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTitle("");
                setDescription("");
                setParentItemId("");
              }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
