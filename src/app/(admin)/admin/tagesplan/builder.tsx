"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type Role = { id: string; name: string };
export type ChecklistRef = {
  id: string;
  title: string;
  roleId: string;
  roleName?: string;
  itemCount?: number;
  color?: string | null;
};
export type CourseRoomRef = { id: string; name: string; color: string };

export type Anchor = "fixed" | "first" | "last" | "each" | "recurring";

export type Slot = {
  clientId: string;
  time: string;
  type: "checklist" | "task";
  checklistId: string | null;
  checklistTitle?: string;
  checklistColor?: string | null;
  taskTitle: string;
  taskDescription: string;
  taskRequiresPhoto: boolean;
  courseRoomId: string | null;
  leadMinutes: number;
  anchor: Anchor;
  repeatTimes: string;
  color: string | null;
};

export type Template = {
  id?: string;
  name: string;
  roleId: string | null;
  shiftType: string;
  slots: Slot[];
};

type BsportOffer = { id: number; activityName: string; startTime: string; date: string };

function makeId() {
  return Math.random().toString(36).slice(2);
}

function getShiftWindow(shiftType: string): { start: string; end: string } {
  if (shiftType === "frueh") return { start: "00:00", end: "13:00" };
  if (shiftType === "spaet") return { start: "13:00", end: "23:59" };
  return { start: "00:00", end: "23:59" };
}

function adjustTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + minutes;
  if (total < 0) total = 0;
  if (total >= 24 * 60) total = 23 * 60 + 59;
  const newH = Math.floor(total / 60).toString().padStart(2, "0");
  const newM = (total % 60).toString().padStart(2, "0");
  return `${newH}:${newM}`;
}

function SortableSlot({
  slot,
  index,
  courseRooms,
  onEdit,
  onRemove,
}: {
  slot: Slot;
  index: number;
  courseRooms: CourseRoomRef[];
  onEdit: (updater: (s: Slot) => Slot) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.clientId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800 border border-slate-700 rounded-lg p-3 ${isDragging ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="mt-1 p-1 text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing"
          aria-label="Ziehen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <span className="text-xs text-slate-500 mt-2 w-6">#{index + 1}</span>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={slot.anchor}
              onChange={(e) => {
                const newAnchor = e.target.value as Anchor;
                onEdit((s) => ({
                  ...s,
                  anchor: newAnchor,
                  // clear courseRoomId when switching to fixed
                  courseRoomId: newAnchor === "fixed" ? null : s.courseRoomId,
                }));
              }}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="fixed">Feste Zeit</option>
              {slot.type === "task" && <option value="recurring">Mehrere Zeiten</option>}
              <option value="first">Vor erstem Kurs</option>
              <option value="last">Nach letztem Kurs</option>
              {slot.type === "task" && <option value="each">Pro Kurs</option>}
            </select>

            {slot.anchor === "fixed" && (
              <input
                type="time"
                value={slot.time}
                onChange={(e) => onEdit((s) => ({ ...s, time: e.target.value }))}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 w-24"
              />
            )}

            {slot.anchor === "recurring" && (
              <input
                type="text"
                value={slot.repeatTimes}
                onChange={(e) => onEdit((s) => ({ ...s, repeatTimes: e.target.value }))}
                placeholder="10:00, 14:00, 18:00"
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[180px]"
              />
            )}

            {slot.anchor !== "fixed" && slot.anchor !== "recurring" && (
              <>
                <select
                  value={slot.courseRoomId || ""}
                  onChange={(e) => onEdit((s) => ({ ...s, courseRoomId: e.target.value || null }))}
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Alle Kurse</option>
                  {courseRooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={slot.leadMinutes}
                    onChange={(e) => onEdit((s) => ({ ...s, leadMinutes: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 w-16"
                  />
                  <span className="text-xs text-slate-400">
                    Min. {slot.anchor === "last" ? "danach" : "vorher"}
                  </span>
                </div>
              </>
            )}

            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              slot.type === "checklist"
                ? "bg-blue-500/15 text-blue-400"
                : slot.anchor === "each"
                ? "bg-purple-500/15 text-purple-400"
                : slot.anchor !== "fixed"
                ? "bg-indigo-500/15 text-indigo-400"
                : "bg-green-500/15 text-green-400"
            }`}>
              {slot.type === "checklist" ? "Checkliste" : slot.anchor === "each" ? "Pro Kurs" : "Aufgabe"}
            </span>
          </div>

          {slot.type === "checklist" ? (
            <p className="text-sm text-white font-medium">{slot.checklistTitle || "Checkliste nicht gefunden"}</p>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Aufgaben-Titel"
                value={slot.taskTitle}
                onChange={(e) => onEdit((s) => ({ ...s, taskTitle: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Beschreibung (optional)"
                value={slot.taskDescription}
                onChange={(e) => onEdit((s) => ({ ...s, taskDescription: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={slot.taskRequiresPhoto}
                  onChange={(e) => onEdit((s) => ({ ...s, taskRequiresPhoto: e.target.checked }))}
                />
                Foto erforderlich
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Farbe:</span>
                <input
                  type="color"
                  value={slot.color || "#10b981"}
                  onChange={(e) => onEdit((s) => ({ ...s, color: e.target.value }))}
                  className="w-8 h-6 bg-slate-900 border border-slate-600 rounded cursor-pointer"
                />
                {slot.color && (
                  <button
                    type="button"
                    onClick={() => onEdit((s) => ({ ...s, color: null }))}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Standard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 mt-1">
          Entfernen
        </button>
      </div>
    </div>
  );
}

export function DayTemplateBuilder({
  roles,
  checklists,
  courseRooms,
  template,
}: {
  roles: Role[];
  checklists: ChecklistRef[];
  courseRooms: CourseRoomRef[];
  template?: Template;
}) {
  const router = useRouter();
  const [name, setName] = useState(template?.name || "");
  const [roleId, setRoleId] = useState(template?.roleId || "");
  const [shiftType, setShiftType] = useState(template?.shiftType || "");
  const [slots, setSlots] = useState<Slot[]>(
    template?.slots.map((s) => ({ ...s, clientId: makeId() })) || []
  );
  const [saving, setSaving] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"task" | "checklist">("task");
  const [bsportOffers, setBsportOffers] = useState<BsportOffer[]>([]);
  const [previewDate, setPreviewDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  });
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [roomActivities, setRoomActivities] = useState<Record<string, string[]>>({});

  // Load bsport offers for preview date (live preview)
  useEffect(() => {
    setLoadingOffers(true);
    fetch(`/api/admin/bsport-today?date=${previewDate}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BsportOffer[]) => setBsportOffers(data))
      .catch(() => setBsportOffers([]))
      .finally(() => setLoadingOffers(false));
  }, [previewDate]);

  // Load course room activities once
  useEffect(() => {
    fetch("/api/admin/course-rooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((rooms: { id: string; activities: { activityName: string }[] }[]) => {
        const map: Record<string, string[]> = {};
        for (const r of rooms) {
          map[r.id] = r.activities.map((a) => a.activityName);
        }
        setRoomActivities(map);
      })
      .catch(() => {});
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = slots.findIndex((s) => s.clientId === active.id);
    const newIdx = slots.findIndex((s) => s.clientId === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setSlots(arrayMove(slots, oldIdx, newIdx));
  }

  function addChecklistSlot(checklistId: string) {
    const cl = checklists.find((c) => c.id === checklistId);
    if (!cl) return;
    setSlots([
      ...slots,
      {
        clientId: makeId(),
        time: "",
        type: "checklist",
        checklistId,
        checklistTitle: cl.title,
        checklistColor: cl.color,
        taskTitle: "",
        taskDescription: "",
        taskRequiresPhoto: false,
        courseRoomId: null,
        leadMinutes: 15,
        anchor: "fixed",
        repeatTimes: "",
        color: null,
      },
    ]);
  }

  function addTaskSlot(presetRoomId?: string) {
    setSlots([
      ...slots,
      {
        clientId: makeId(),
        time: "",
        type: "task",
        checklistId: null,
        taskTitle: "",
        taskDescription: "",
        taskRequiresPhoto: false,
        courseRoomId: presetRoomId || null,
        leadMinutes: 15,
        anchor: presetRoomId ? "each" : "fixed",
        repeatTimes: "",
        color: null,
      },
    ]);
  }

  function updateSlot(clientId: string, updater: (s: Slot) => Slot) {
    setSlots(slots.map((s) => (s.clientId === clientId ? updater(s) : s)));
  }

  function removeSlot(clientId: string) {
    setSlots(slots.filter((s) => s.clientId !== clientId));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name,
      roleId: roleId || null,
      shiftType,
      slots: slots.map((s) => ({
        type: s.type,
        time: s.time || null,
        checklistId: s.checklistId,
        taskTitle: s.taskTitle || null,
        taskDescription: s.taskDescription || null,
        taskRequiresPhoto: s.taskRequiresPhoto,
        courseRoomId: s.anchor === "fixed" || s.anchor === "recurring" ? null : s.courseRoomId || null,
        leadMinutes: s.leadMinutes ?? 15,
        anchor: s.anchor === "fixed" ? null : s.anchor,
        repeatTimes: s.anchor === "recurring" ? s.repeatTimes || null : null,
        color: s.color || null,
      })),
    };

    const url = template?.id ? `/api/admin/day-templates/${template.id}` : "/api/admin/day-templates";
    const method = template?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/tagesplan");
      router.refresh();
    } else {
      alert("Fehler beim Speichern");
      setSaving(false);
    }
  }

  const availableChecklists = roleId ? checklists.filter((c) => c.roleId === roleId) : checklists;

  // Preview slots (sorted + expanded with bsport courses)
  const previewSlots = useMemo(() => {
    type PSlot = {
      key: string;
      time: string | null;
      type: "checklist" | "task";
      title: string;
      description?: string;
      badge: string;
      badgeColor: string;
      itemCount?: number;
      isEmpty?: boolean;
      requiresPhoto?: boolean;
      accentColor?: string | null;
    };
    const out: PSlot[] = [];

    const window = getShiftWindow(shiftType);
    const filteredOffers = bsportOffers.filter(
      (o) => o.startTime >= window.start && o.startTime < window.end
    );

    function offersFor(courseRoomId: string | null) {
      if (!courseRoomId) return [...filteredOffers].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const actNames = roomActivities[courseRoomId] || [];
      return filteredOffers
        .filter((o) => actNames.includes(o.activityName))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    function getEndTime(o: BsportOffer): string {
      // Offers don't include endTime, assume 45min default — best we have client-side
      const [h, m] = o.startTime.split(":").map(Number);
      const total = h * 60 + m + 45;
      const h2 = Math.floor(total / 60).toString().padStart(2, "0");
      const m2 = (total % 60).toString().padStart(2, "0");
      return `${h2}:${m2}`;
    }

    for (const s of slots) {
      const roomName = s.courseRoomId
        ? courseRooms.find((r) => r.id === s.courseRoomId)?.name || "Raum"
        : "allen Kursen";

      // Recurring: multiple fixed times (tasks only)
      if (s.anchor === "recurring" && s.type === "task") {
        const times = (s.repeatTimes || "")
          .split(",")
          .map((t) => t.trim())
          .filter((t) => /^\d{1,2}:\d{2}$/.test(t));
        if (times.length === 0) {
          out.push({
            key: `${s.clientId}:empty`,
            time: null,
            type: "task",
            title: `${s.taskTitle || "Aufgabe"} — keine Zeiten definiert`,
            badge: "Mehrere Zeiten",
            badgeColor: "bg-teal-500/15 text-teal-400",
            isEmpty: true,
            accentColor: s.color,
          });
        } else {
          for (const t of times) {
            out.push({
              key: `${s.clientId}:t:${t}`,
              time: t,
              type: "task",
              title: s.taskTitle || "Aufgabe",
              description: s.taskDescription || undefined,
              badge: "Wiederkehrend",
              badgeColor: "bg-teal-500/15 text-teal-400",
              requiresPhoto: s.taskRequiresPhoto,
              accentColor: s.color,
            });
          }
        }
        continue;
      }

      // Per-course expansion (tasks only)
      if (s.anchor === "each" && s.type === "task") {
        const matching = offersFor(s.courseRoomId);
        if (matching.length === 0) {
          out.push({
            key: `${s.clientId}:empty`,
            time: null,
            type: "task",
            title: `${s.taskTitle || "Aufgabe"} — keine Kurse heute`,
            badge: "Pro Kurs",
            badgeColor: "bg-purple-500/15 text-purple-400",
            isEmpty: true,
            accentColor: s.color,
          });
        } else {
          for (const offer of matching) {
            out.push({
              key: `${s.clientId}:${offer.id}`,
              time: adjustTime(offer.startTime, -s.leadMinutes),
              type: "task",
              title: `${s.taskTitle || "Aufgabe"} (${offer.startTime} ${offer.activityName})`,
              description: s.taskDescription || undefined,
              badge: "Pro Kurs",
              badgeColor: "bg-purple-500/15 text-purple-400",
              requiresPhoto: s.taskRequiresPhoto,
              accentColor: s.color,
            });
          }
        }
        continue;
      }

      // First/Last anchor
      if (s.anchor === "first" || s.anchor === "last") {
        const matching = offersFor(s.courseRoomId);
        const cl = s.type === "checklist" ? checklists.find((c) => c.id === s.checklistId) : null;
        const title = s.type === "checklist" ? cl?.title || s.checklistTitle || "Checkliste" : s.taskTitle || "Aufgabe";

        const accent = s.type === "checklist" ? cl?.color || s.checklistColor || null : s.color;
        if (matching.length === 0) {
          out.push({
            key: s.clientId,
            time: null,
            type: s.type,
            title: `${title} — keine Kurse heute`,
            badge: s.anchor === "first" ? "Vor 1. Kurs" : "Nach letztem Kurs",
            badgeColor: "bg-indigo-500/15 text-indigo-400",
            itemCount: cl?.itemCount,
            isEmpty: true,
            accentColor: accent,
          });
        } else {
          const resolvedTime =
            s.anchor === "first"
              ? adjustTime(matching[0].startTime, -s.leadMinutes)
              : adjustTime(getEndTime(matching[matching.length - 1]), s.leadMinutes);
          const ref = s.anchor === "first" ? matching[0].startTime : getEndTime(matching[matching.length - 1]);
          out.push({
            key: s.clientId,
            time: resolvedTime,
            type: s.type,
            title,
            description: s.type === "task" ? s.taskDescription || undefined : undefined,
            badge: `${s.anchor === "first" ? "Vor 1. Kurs" : "Nach letztem Kurs"} (${roomName}, ${ref})`,
            badgeColor: "bg-indigo-500/15 text-indigo-400",
            itemCount: cl?.itemCount,
            requiresPhoto: s.type === "task" ? s.taskRequiresPhoto : undefined,
            accentColor: accent,
          });
        }
        continue;
      }

      // Fixed time
      if (s.type === "checklist") {
        const cl = checklists.find((c) => c.id === s.checklistId);
        out.push({
          key: s.clientId,
          time: s.time || null,
          type: "checklist",
          title: cl?.title || s.checklistTitle || "Checkliste",
          badge: "Checkliste",
          badgeColor: "bg-blue-500/15 text-blue-400",
          itemCount: cl?.itemCount,
          accentColor: cl?.color || s.checklistColor || null,
        });
      } else {
        out.push({
          key: s.clientId,
          time: s.time || null,
          type: "task",
          title: s.taskTitle || "(leere Aufgabe)",
          description: s.taskDescription || undefined,
          badge: "Aufgabe",
          badgeColor: "bg-green-500/15 text-green-400",
          requiresPhoto: s.taskRequiresPhoto,
          accentColor: s.color,
        });
      }
    }

    // Filter by shift window — exclude slots outside the time window
    const filtered = out.filter((slot) => {
      if (!slot.time) return true; // keep empty/placeholder slots
      if (slot.isEmpty) return true;
      return slot.time >= window.start && slot.time < window.end;
    });

    filtered.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
    return filtered;
  }, [slots, bsportOffers, roomActivities, checklists, courseRooms, shiftType]);

  // Per-course-room summary for the preview date
  const previewRoomSummary = useMemo(() => {
    const window = getShiftWindow(shiftType);
    const filtered = bsportOffers.filter((o) => o.startTime >= window.start && o.startTime < window.end);
    const seen = new Set<string>();
    for (const s of slots) {
      if (s.courseRoomId) seen.add(s.courseRoomId);
    }
    return Array.from(seen)
      .map((id) => {
        const room = courseRooms.find((r) => r.id === id);
        if (!room) return null;
        const actNames = roomActivities[id] || [];
        const matching = filtered
          .filter((o) => actNames.includes(o.activityName))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return {
          id: room.id,
          name: room.name,
          color: room.color,
          count: matching.length,
          times: matching.map((o) => o.startTime),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [slots, bsportOffers, roomActivities, courseRooms, shiftType]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_360px] gap-4">
      {/* Left: Settings + Library */}
      <div className="space-y-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400">Einstellungen</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="z.B. Check-In Früh Wochentag"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rolle</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Alle Rollen</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Schichttyp</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Alle Schichten</option>
              <option value="frueh">Frühschicht</option>
              <option value="spaet">Spätschicht</option>
              <option value="ganztag">Ganztag</option>
            </select>
          </div>
        </div>

        {/* Library Tabs */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="flex border-b border-slate-700">
            <button
              type="button"
              onClick={() => setLibraryTab("task")}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                libraryTab === "task" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Einzel-Aufgaben
            </button>
            <button
              type="button"
              onClick={() => setLibraryTab("checklist")}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                libraryTab === "checklist" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Checklisten
            </button>
          </div>

          <div className="p-3 space-y-2">
            {libraryTab === "task" ? (
              <>
                <button
                  type="button"
                  onClick={() => addTaskSlot()}
                  className="w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Aufgabe (feste Zeit)
                </button>
                {courseRooms.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2">Pro-Kurs-Aufgabe (bsport):</p>
                    <div className="space-y-1">
                      {courseRooms.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => addTaskSlot(r.id)}
                          className="w-full text-left px-3 py-2 bg-slate-900/50 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500/50 rounded text-sm text-white transition-colors flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                          <span>{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {availableChecklists.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Keine Checklisten verfügbar</p>
                ) : (
                  availableChecklists.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addChecklistSlot(c.id)}
                      style={c.color ? { borderLeftWidth: 4, borderLeftColor: c.color } : undefined}
                      className="w-full text-left px-3 py-2 bg-slate-900/50 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/50 rounded text-sm text-white transition-colors"
                    >
                      <span className="block font-medium">{c.title}</span>
                      {c.roleName && <span className="block text-xs text-slate-400">{c.roleName}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Builder */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tagesablauf</h2>
          <span className="text-sm text-slate-400">{slots.length} Blöcke</span>
        </div>

        {slots.length === 0 ? (
          <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-8 text-center">
            <p className="text-slate-500 text-sm">Füge Blöcke aus der linken Leiste hinzu.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slots.map((s) => s.clientId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {slots.map((slot, idx) => (
                  <SortableSlot
                    key={slot.clientId}
                    slot={slot}
                    index={idx}
                    courseRooms={courseRooms}
                    onEdit={(updater) => updateSlot(slot.clientId, updater)}
                    onRemove={() => removeSlot(slot.clientId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "Speichern..." : template?.id ? "Aktualisieren" : "Erstellen"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/tagesplan")}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div>
        <div className="sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Mitarbeiter-Ansicht</h2>
            <span className="text-xs text-slate-500">{loadingOffers ? "Lade Kurse..." : `${bsportOffers.length} Kurse`}</span>
          </div>

          {/* Date picker for preview */}
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const [y, m, d] = previewDate.split("-").map(Number);
                const dt = new Date(y, m - 1, d - 1);
                setPreviewDate(`${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt.getDate().toString().padStart(2, "0")}`);
              }}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs hover:bg-slate-700"
            >
              ←
            </button>
            <input
              type="date"
              value={previewDate}
              onChange={(e) => setPreviewDate(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                const [y, m, d] = previewDate.split("-").map(Number);
                const dt = new Date(y, m - 1, d + 1);
                setPreviewDate(`${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt.getDate().toString().padStart(2, "0")}`);
              }}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs hover:bg-slate-700"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                setPreviewDate(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`);
              }}
              className="px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded text-xs"
            >
              Heute
            </button>
          </div>

          <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                {new Date(previewDate).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
              <span className="text-[10px] text-slate-500">Vorschau</span>
            </div>
            <div className="p-3 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-white">{name || "Ohne Name"}</h3>
                <p className="text-[10px] text-slate-400">{previewSlots.length} Blöcke</p>
              </div>

              {previewRoomSummary.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 space-y-1.5">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Kurse heute</p>
                  <div className="flex flex-wrap gap-1">
                    {previewRoomSummary.map((r) => {
                      const has = r.count > 0;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                            has ? "bg-slate-900 border border-slate-700" : "bg-slate-900/40 border border-slate-800 opacity-70"
                          }`}
                          title={has ? r.times.join(", ") : "Keine Kurse heute"}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.color || "#64748b" }}
                          />
                          <span className={has ? "text-white font-medium" : "text-slate-500 line-through"}>{r.name}</span>
                          <span className={has ? "text-slate-400" : "text-slate-600"}>
                            {has ? r.count : "0"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {previewSlots.length === 0 ? (
                <p className="text-slate-500 text-center py-6 text-xs">Keine Blöcke</p>
              ) : (
                previewSlots.map((slot) => (
                  <div
                    key={slot.key}
                    style={slot.accentColor ? { borderLeftWidth: 4, borderLeftColor: slot.accentColor } : undefined}
                    className={`bg-slate-800 border rounded-lg p-2 ${
                      slot.isEmpty
                        ? "border-slate-700/50 opacity-60"
                        : slot.badge === "Checkliste"
                        ? "border-blue-500/30"
                        : slot.badge === "Pro Kurs"
                        ? "border-purple-500/30"
                        : "border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded border-2 border-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {slot.time && <span className="text-xs text-slate-400 font-mono">{slot.time}</span>}
                          <span className={`text-xs font-medium ${slot.isEmpty ? "text-slate-500" : "text-white"}`}>
                            {slot.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${slot.badgeColor}`}>
                            {slot.badge}
                          </span>
                          {slot.itemCount !== undefined && (
                            <span className="text-[10px] text-slate-500 ml-auto">{slot.itemCount} Punkte</span>
                          )}
                        </div>
                        {slot.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{slot.description}</p>
                        )}
                        {slot.requiresPhoto && (
                          <p className="text-[10px] text-amber-400 mt-0.5">Foto erforderlich</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
