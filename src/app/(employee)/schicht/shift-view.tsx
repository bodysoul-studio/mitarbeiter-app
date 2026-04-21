"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChecklistWithItems } from "@/lib/time-utils";

type Props = {
  checklists: ChecklistWithItems[];
  employeeId: string;
  employeeName: string;
  today: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getCurrentTime() {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ShiftView({ checklists: initial, employeeId, employeeName, today }: Props) {
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
                  it.id === itemId
                    ? {
                        ...it,
                        completed: !completed,
                        photoUrl: photoUrl ?? it.photoUrl,
                        completedByName: !completed ? employeeName : null,
                      }
                    : it
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
    [today, employeeName]
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
        // For progress, count all items (parents included) - but parents with children use auto-completion
        const parentsOfCl = cl.items.filter((i) => !i.parentId);
        const isParentAutoComplete = (parentId: string) => {
          const children = cl.items.filter((i) => i.parentId === parentId);
          if (children.length === 0) return false;
          return children.every((c) => c.completed);
        };
        // A parent is "completed" if it has children that are all done, OR it's a leaf and user checked it
        const effectiveCompleted = (item: typeof cl.items[number]) => {
          const hasChildren = cl.items.some((i) => i.parentId === item.id);
          if (hasChildren) return isParentAutoComplete(item.id);
          return !!item.completed;
        };
        const clCompleted = cl.items.filter((i) => effectiveCompleted(i)).length;
        const clTotal = cl.items.length;

        return (
          <div key={cl.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : cl.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-white">{cl.title}</h2>
                  {cl.roleName && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: (cl.roleColor || "#3b82f6") + "22",
                        color: cl.roleColor || "#3b82f6",
                      }}
                    >
                      {cl.roleName}
                    </span>
                  )}
                </div>
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
              <div className="border-t border-slate-700">
                {parentsOfCl.map((parent) => {
                  const children = cl.items.filter((i) => i.parentId === parent.id);
                  const hasChildren = children.length > 0;
                  const parentDone = hasChildren ? isParentAutoComplete(parent.id) : !!parent.completed;

                  return (
                    <div key={parent.id} className="border-b border-slate-700/50 last:border-0">
                      {/* Parent row */}
                      <div className={`p-4 flex items-start gap-3 ${hasChildren ? "bg-slate-900/40" : ""}`}>
                        <button
                          onClick={() => {
                            if (hasChildren) return; // Parents with children can't be toggled manually
                            if (parent.requiresPhoto && !parent.completed) {
                              handlePhotoUpload(cl.id, parent.id);
                            } else {
                              toggleItem(cl.id, parent.id, !!parent.completed);
                            }
                          }}
                          disabled={hasChildren || uploading[parent.id]}
                          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            parentDone
                              ? "bg-blue-500 border-blue-500"
                              : hasChildren
                              ? "border-slate-600 cursor-default"
                              : "border-slate-500 hover:border-blue-400"
                          }`}
                        >
                          {parentDone && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium ${hasChildren ? "text-white" : parentDone ? "text-slate-500 line-through" : "text-white"}`}>
                              {parent.title}
                            </p>
                            {hasChildren && (
                              <span className="text-xs text-slate-500">
                                {children.filter((c) => c.completed).length}/{children.length}
                              </span>
                            )}
                            {!hasChildren && parent.completed && parent.completedByName && (
                              <span
                                className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium"
                                title={`Erledigt von ${parent.completedByName}`}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {getInitials(parent.completedByName)}
                              </span>
                            )}
                          </div>
                          {parent.description && (
                            <p className="text-sm text-slate-400 mt-0.5">{parent.description}</p>
                          )}
                        </div>
                        {uploading[parent.id] && (
                          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                        )}
                      </div>

                      {/* Children */}
                      {children.map((child) => (
                        <div key={child.id} className="px-4 py-3 pl-12 flex items-start gap-3 border-t border-slate-700/30">
                          <button
                            onClick={() => {
                              if (child.requiresPhoto && !child.completed) {
                                handlePhotoUpload(cl.id, child.id);
                              } else {
                                toggleItem(cl.id, child.id, !!child.completed);
                              }
                            }}
                            disabled={uploading[child.id]}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              child.completed
                                ? "bg-blue-500 border-blue-500"
                                : "border-slate-500 hover:border-blue-400"
                            }`}
                          >
                            {child.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm ${child.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                {child.title}
                              </p>
                              {child.completed && child.completedByName && (
                                <span
                                  className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-medium"
                                  title={`Erledigt von ${child.completedByName}`}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  {getInitials(child.completedByName)}
                                </span>
                              )}
                            </div>
                            {child.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{child.description}</p>
                            )}
                            {child.requiresPhoto && !child.photoUrl && !child.completed && (
                              <p className="text-xs text-amber-400 mt-0.5">Foto erforderlich</p>
                            )}
                          </div>
                          {uploading[child.id] && (
                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
