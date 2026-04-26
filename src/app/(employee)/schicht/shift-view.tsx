"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChecklistWithItems } from "@/lib/time-utils";

type TemplateSlot = {
  id: string;
  time: string | null;
  type: "checklist" | "task";
  checklist: {
    id: string;
    title: string;
    roleName: string;
    roleColor: string | null;
    color?: string | null;
    items: {
      id: string;
      parentId: string | null;
      title: string;
      description: string | null;
      requiresPhoto: boolean;
      sortOrder: number;
      completed: boolean;
      photoUrl: string | null;
      completedByName: string | null;
    }[];
  } | null;
  task: {
    title: string;
    description: string | null;
    requiresPhoto: boolean;
    completed: boolean;
    photoUrl: string | null;
    completedByName: string | null;
    color?: string | null;
  } | null;
};

type TemplateData = {
  id: string;
  name: string;
  slots: TemplateSlot[];
};

type CourseRoomSummary = {
  id: string;
  name: string;
  color: string | null;
  count: number;
  times: string[];
};

type Props = {
  checklists: ChecklistWithItems[];
  template: TemplateData | null;
  employeeId: string;
  employeeName: string;
  today: string;
  courseRoomSummary?: CourseRoomSummary[];
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

export function ShiftView({ checklists: initial, template, employeeId, employeeName, today, courseRoomSummary }: Props) {
  const [checklists, setChecklists] = useState(initial);
  const [tpl, setTpl] = useState<TemplateData | null>(template);
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

  // Toggle slot task (einzel-aufgabe in einem template slot)
  const toggleSlotTask = useCallback(
    async (slotId: string, completed: boolean, photoUrl?: string | null) => {
      setTpl((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: prev.slots.map((s) =>
            s.id === slotId && s.task
              ? {
                  ...s,
                  task: {
                    ...s.task,
                    completed: !completed,
                    photoUrl: photoUrl ?? s.task.photoUrl,
                    completedByName: !completed ? employeeName : null,
                  },
                }
              : s
          ),
        };
      });

      try {
        if (completed) {
          await fetch(`/api/slot-tasks/${slotId}/complete?date=${today}`, { method: "DELETE" });
        } else {
          await fetch(`/api/slot-tasks/${slotId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, photoUrl }),
          });
        }
      } catch {
        // revert
        setTpl((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            slots: prev.slots.map((s) =>
              s.id === slotId && s.task
                ? { ...s, task: { ...s.task, completed, photoUrl: s.task.photoUrl } }
                : s
            ),
          };
        });
      }
    },
    [today, employeeName]
  );

  // Toggle checklist item (inside a template checklist)
  const toggleTemplateChecklistItem = useCallback(
    async (checklistId: string, itemId: string, completed: boolean, photoUrl?: string | null) => {
      setTpl((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: prev.slots.map((s) =>
            s.checklist?.id === checklistId
              ? {
                  ...s,
                  checklist: {
                    ...s.checklist,
                    items: s.checklist.items.map((it) =>
                      it.id === itemId
                        ? {
                            ...it,
                            completed: !completed,
                            photoUrl: photoUrl ?? it.photoUrl,
                            completedByName: !completed ? employeeName : null,
                          }
                        : it
                    ),
                  },
                }
              : s
          ),
        };
      });

      try {
        if (completed) {
          await fetch(`/api/checklist-items/${itemId}/complete?date=${today}`, { method: "DELETE" });
        } else {
          await fetch(`/api/checklist-items/${itemId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, photoUrl }),
          });
        }
      } catch {
        // ignore
      }
    },
    [today, employeeName]
  );

  const handleSlotTaskPhotoUpload = useCallback(
    async (slotId: string) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        setUploading((prev) => ({ ...prev, [slotId]: true }));
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          const { url } = await res.json();
          await toggleSlotTask(slotId, false, url);
        } catch {
          alert("Foto-Upload fehlgeschlagen");
        } finally {
          setUploading((prev) => ({ ...prev, [slotId]: false }));
        }
      };
      input.click();
    },
    [toggleSlotTask]
  );

  const handleTemplatePhotoUpload = useCallback(
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
          if (!res.ok) throw new Error();
          const { url } = await res.json();
          await toggleTemplateChecklistItem(checklistId, itemId, false, url);
        } catch {
          alert("Foto-Upload fehlgeschlagen");
        } finally {
          setUploading((prev) => ({ ...prev, [itemId]: false }));
        }
      };
      input.click();
    },
    [toggleTemplateChecklistItem]
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

  // If a day template exists, render it
  if (tpl) {
    const allCompletables = tpl.slots.reduce((total, s) => {
      if (s.type === "task") return total + 1;
      if (s.checklist) {
        // count parents without children + children
        const parents = s.checklist.items.filter((i) => !i.parentId);
        const children = s.checklist.items.filter((i) => i.parentId);
        const childlessParents = parents.filter(
          (p) => !s.checklist!.items.some((i) => i.parentId === p.id)
        );
        return total + childlessParents.length + children.length;
      }
      return total;
    }, 0);

    const completedCountTpl = tpl.slots.reduce((total, s) => {
      if (s.type === "task" && s.task?.completed) return total + 1;
      if (s.checklist) {
        return (
          total +
          s.checklist.items.filter((i) => {
            if (i.parentId) return i.completed;
            const hasChildren = s.checklist!.items.some((c) => c.parentId === i.id);
            return !hasChildren && i.completed;
          }).length
        );
      }
      return total;
    }, 0);

    const progressTpl = allCompletables > 0 ? Math.round((completedCountTpl / allCompletables) * 100) : 0;

    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Header with template name */}
        <div>
          <h1 className="text-lg font-bold text-white">{tpl.name}</h1>
          <p className="text-xs text-slate-400">Tagesablauf · {tpl.slots.length} Blöcke</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Fortschritt</span>
            <span>{completedCountTpl}/{allCompletables} ({progressTpl}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressTpl}%` }} />
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm">Aktuelle Zeit: {currentTime}</p>

        {/* Course room summary */}
        {courseRoomSummary && courseRoomSummary.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Kurse heute</p>
            <div className="flex flex-wrap gap-2">
              {courseRoomSummary.map((r) => {
                const has = r.count > 0;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                      has ? "bg-slate-900 border border-slate-700" : "bg-slate-900/40 border border-slate-800 opacity-70"
                    }`}
                    title={has ? r.times.join(", ") : "Keine Kurse heute"}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.color || "#64748b" }}
                    />
                    <span className={has ? "text-white font-medium" : "text-slate-500 line-through"}>{r.name}</span>
                    <span className={has ? "text-slate-400" : "text-slate-600"}>
                      {has ? `${r.count} Kurs${r.count === 1 ? "" : "e"}` : "keine"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Slots */}
        <div className="space-y-2">
          {tpl.slots.map((slot, idx) => {
            const isExpanded = expandedId === slot.id;
            // For checklist slots
            if (slot.type === "checklist" && slot.checklist) {
              const cl = slot.checklist;
              const parentsOfCl = cl.items.filter((i) => !i.parentId);
              const isParentAutoComplete = (parentId: string) => {
                const ch = cl.items.filter((i) => i.parentId === parentId);
                if (ch.length === 0) return false;
                return ch.every((c) => c.completed);
              };
              const effectiveCompleted = (item: typeof cl.items[number]) => {
                const hasChildren = cl.items.some((i) => i.parentId === item.id);
                if (hasChildren) return isParentAutoComplete(item.id);
                return !!item.completed;
              };
              const done = cl.items.filter((i) => effectiveCompleted(i)).length;
              const total = cl.items.length;

              const clColor = cl.color || cl.roleColor;
              return (
                <div
                  key={slot.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
                  style={clColor ? { borderLeftWidth: 4, borderLeftColor: clColor } : {}}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : slot.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {slot.time && <span className="text-sm text-slate-400 font-mono">{slot.time}</span>}
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
                        <p className="text-xs text-slate-500">Checkliste · Block {idx + 1}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${done === total && total > 0 ? "text-green-400" : "text-slate-400"}`}
                      >
                        {done}/{total}
                      </span>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
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
                            <div className={`p-4 flex items-start gap-3 ${hasChildren ? "bg-slate-900/40" : ""}`}>
                              <button
                                onClick={() => {
                                  if (hasChildren) return;
                                  if (parent.requiresPhoto && !parent.completed) {
                                    handleTemplatePhotoUpload(cl.id, parent.id);
                                  } else {
                                    toggleTemplateChecklistItem(cl.id, parent.id, !!parent.completed);
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
                                    <span className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">
                                      {getInitials(parent.completedByName)}
                                    </span>
                                  )}
                                </div>
                                {parent.description && (
                                  <p className="text-sm text-slate-400 mt-0.5">{parent.description}</p>
                                )}
                              </div>
                            </div>
                            {children.map((child) => (
                              <div key={child.id} className="px-4 py-3 pl-12 flex items-start gap-3 border-t border-slate-700/30">
                                <button
                                  onClick={() => {
                                    if (child.requiresPhoto && !child.completed) {
                                      handleTemplatePhotoUpload(cl.id, child.id);
                                    } else {
                                      toggleTemplateChecklistItem(cl.id, child.id, !!child.completed);
                                    }
                                  }}
                                  disabled={uploading[child.id]}
                                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    child.completed ? "bg-blue-500 border-blue-500" : "border-slate-500 hover:border-blue-400"
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
                                    <p className={`text-sm ${child.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>{child.title}</p>
                                    {child.completed && child.completedByName && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                                        {getInitials(child.completedByName)}
                                      </span>
                                    )}
                                  </div>
                                  {child.description && (
                                    <p className="text-xs text-slate-400 mt-0.5">{child.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Single task slot
            if (slot.type === "task" && slot.task) {
              const task = slot.task;
              const taskColor = task.color;
              return (
                <div
                  key={slot.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3"
                  style={taskColor ? { borderLeftWidth: 4, borderLeftColor: taskColor } : {}}
                >
                  {slot.time && (
                    <span className="text-sm text-slate-400 font-mono mt-1">{slot.time}</span>
                  )}
                  <button
                    onClick={() => {
                      if (task.requiresPhoto && !task.completed) {
                        handleSlotTaskPhotoUpload(slot.id);
                      } else {
                        toggleSlotTask(slot.id, task.completed);
                      }
                    }}
                    disabled={uploading[slot.id]}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      task.completed ? "bg-blue-500 border-blue-500" : "border-slate-500 hover:border-blue-400"
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium ${task.completed ? "text-slate-500 line-through" : "text-white"}`}>{task.title}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-500/15 text-green-400">
                        Aufgabe
                      </span>
                      {task.completed && task.completedByName && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">
                          {getInitials(task.completedByName)}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-400 mt-0.5">{task.description}</p>
                    )}
                    {task.requiresPhoto && !task.photoUrl && !task.completed && (
                      <p className="text-xs text-amber-400 mt-1">Foto erforderlich</p>
                    )}
                  </div>
                  {uploading[slot.id] && (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  }

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
