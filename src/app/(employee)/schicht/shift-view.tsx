"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChecklistWithItems } from "@/lib/time-utils";

type Props = {
  checklists: ChecklistWithItems[];
  employeeId: string;
  today: string;
};

function getCurrentTime() {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ShiftView({ checklists: initial, employeeId, today }: Props) {
  const [checklists, setChecklists] = useState(initial);
  const [currentTime, setCurrentTime] = useState(getCurrentTime);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getCurrentTime()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Filter active checklists by time (or show all in preview mode)
  const activeChecklists = checklists
    .filter((c) => showAll || currentTime >= c.startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Auto-expand the most recent checklist
  useEffect(() => {
    if (activeChecklists.length > 0 && expandedId === null) {
      setExpandedId(activeChecklists[activeChecklists.length - 1].id);
    }
  }, [activeChecklists, expandedId]);

  // Progress calculation
  const totalItems = activeChecklists.reduce((s, c) => s + c.items.length, 0);
  const completedCount = activeChecklists.reduce(
    (s, c) => s + c.items.filter((i) => i.completed).length,
    0
  );
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const toggleItem = useCallback(
    async (checklistId: string, itemId: string, completed: boolean, photoUrl?: string | null) => {
      // Optimistic update
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? {
                ...cl,
                items: cl.items.map((it) =>
                  it.id === itemId ? { ...it, completed: !completed, photoUrl: photoUrl ?? it.photoUrl } : it
                ),
              }
            : cl
        )
      );

      try {
        if (completed) {
          await fetch(`/api/checklist-items/${itemId}/complete?date=${today}`, {
            method: "DELETE",
          });
        } else {
          await fetch(`/api/checklist-items/${itemId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, photoUrl }),
          });
        }
      } catch {
        // Revert on error
        setChecklists((prev) =>
          prev.map((cl) =>
            cl.id === checklistId
              ? {
                  ...cl,
                  items: cl.items.map((it) =>
                    it.id === itemId ? { ...it, completed, photoUrl: it.photoUrl } : it
                  ),
                }
              : cl
          )
        );
      }
    },
    [today]
  );

  const handlePhotoUpload = useCallback(
    async (checklistId: string, itemId: string) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        setUploading((prev) => ({ ...prev, [itemId]: true }));
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Upload failed");
          const { url } = await res.json();
          await toggleItem(checklistId, itemId, false, url);
        } catch {
          alert("Foto-Upload fehlgeschlagen");
        } finally {
          setUploading((prev) => ({ ...prev, [itemId]: false }));
        }
      };
      input.click();
    },
    [toggleItem]
  );

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Fortschritt</span>
          <span>
            {completedCount}/{totalItems} ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Current time + preview toggle */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Aktuelle Zeit: {currentTime}</span>
        <button
          onClick={() => setShowAll(!showAll)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            showAll
              ? "bg-orange-500/20 text-orange-400"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {showAll ? "Vorschau aktiv" : "Alle anzeigen"}
        </button>
      </div>

      {activeChecklists.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Noch keine Checklisten verfügbar</p>
          <p className="text-sm mt-1">Checklisten werden zur Startzeit freigeschaltet</p>
        </div>
      )}

      {activeChecklists.map((cl) => {
        const isExpanded = expandedId === cl.id;
        const clCompleted = cl.items.filter((i) => i.completed).length;
        const clTotal = cl.items.length;

        return (
          <div key={cl.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : cl.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <h2 className="font-semibold text-white">{cl.title}</h2>
                <p className="text-sm text-slate-400">
                  {cl.startTime} – {cl.endTime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    clCompleted === clTotal && clTotal > 0 ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  {clCompleted}/{clTotal}
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                {cl.items.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-3">
                    <button
                      onClick={() => {
                        if (item.requiresPhoto && !item.completed) {
                          handlePhotoUpload(cl.id, item.id);
                        } else {
                          toggleItem(cl.id, item.id, !!item.completed);
                        }
                      }}
                      disabled={uploading[item.id]}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? "bg-blue-500 border-blue-500"
                          : "border-slate-500 hover:border-blue-400"
                      }`}
                    >
                      {item.completed && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${item.completed ? "text-slate-500 line-through" : "text-white"}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>
                      )}
                      {item.requiresPhoto && (
                        <div className="flex items-center gap-2 mt-1">
                          {item.photoUrl ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Foto vorhanden
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Foto erforderlich
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {uploading[item.id] && (
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
