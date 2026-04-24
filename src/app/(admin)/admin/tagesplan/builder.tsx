"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
export type ChecklistRef = { id: string; title: string; roleId: string; roleName?: string };
export type CourseRoomRef = { id: string; name: string; color: string };

export type Slot = {
  clientId: string;
  time: string;
  type: "checklist" | "task";
  checklistId: string | null;
  checklistTitle?: string;
  taskTitle: string;
  taskDescription: string;
  taskRequiresPhoto: boolean;
  courseRoomId: string | null;
  leadMinutes: number;
};

export type Template = {
  id?: string;
  name: string;
  roleId: string | null;
  shiftType: string;
  slots: Slot[];
};

function makeId() {
  return Math.random().toString(36).slice(2);
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
        {/* Drag handle */}
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
          {/* Time/Room toggle + Type */}
          <div className="flex items-center gap-2 flex-wrap">
            {slot.type === "task" && (
              <div className="flex gap-1 bg-slate-900 border border-slate-600 rounded p-0.5">
                <button
                  type="button"
                  onClick={() => onEdit((s) => ({ ...s, courseRoomId: null }))}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    !slot.courseRoomId ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  Feste Zeit
                </button>
                <button
                  type="button"
                  onClick={() => onEdit((s) => ({ ...s, courseRoomId: courseRooms[0]?.id || "" }))}
                  disabled={courseRooms.length === 0}
                  className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-30 ${
                    slot.courseRoomId ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  Pro Kurs
                </button>
              </div>
            )}
            {(!slot.courseRoomId || slot.type === "checklist") && (
              <input
                type="time"
                value={slot.time}
                onChange={(e) => onEdit((s) => ({ ...s, time: e.target.value }))}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 w-24"
              />
            )}
            {slot.courseRoomId && slot.type === "task" && (
              <>
                <select
                  value={slot.courseRoomId}
                  onChange={(e) => onEdit((s) => ({ ...s, courseRoomId: e.target.value }))}
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                >
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
                  <span className="text-xs text-slate-400">Min. vorher</span>
                </div>
              </>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                slot.type === "checklist"
                  ? "bg-blue-500/15 text-blue-400"
                  : slot.courseRoomId
                  ? "bg-purple-500/15 text-purple-400"
                  : "bg-green-500/15 text-green-400"
              }`}
            >
              {slot.type === "checklist" ? "Checkliste" : slot.courseRoomId ? "Pro Kurs" : "Einzel-Aufgabe"}
            </span>
          </div>

          {/* Content */}
          {slot.type === "checklist" ? (
            <p className="text-sm text-white font-medium">
              {slot.checklistTitle || "Checkliste nicht gefunden"}
            </p>
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
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 mt-1"
        >
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
        taskTitle: "",
        taskDescription: "",
        taskRequiresPhoto: false,
        courseRoomId: null,
        leadMinutes: 15,
      },
    ]);
  }

  function addTaskSlot() {
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
        courseRoomId: null,
        leadMinutes: 15,
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
        courseRoomId: s.courseRoomId || null,
        leadMinutes: s.leadMinutes ?? 15,
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

  // Filter checklists by selected role (show all if no role selected)
  const availableChecklists = roleId
    ? checklists.filter((c) => c.roleId === roleId)
    : checklists;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-6xl">
      {/* Left: Config + library */}
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

        {/* Library */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400">Hinzufügen</h2>
          <button
            type="button"
            onClick={addTaskSlot}
            className="w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Einzel-Aufgabe
          </button>

          <div className="border-t border-slate-700/50 pt-3">
            <p className="text-xs text-slate-400 mb-2">Checkliste einfügen:</p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {availableChecklists.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3">Keine Checklisten</p>
              ) : (
                availableChecklists.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addChecklistSlot(c.id)}
                    className="w-full text-left px-3 py-2 bg-slate-900/50 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/50 rounded text-sm text-white transition-colors"
                  >
                    <span className="block font-medium">{c.title}</span>
                    {c.roleName && <span className="block text-xs text-slate-400">{c.roleName}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Builder */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tagesablauf</h2>
          <span className="text-sm text-slate-400">{slots.length} Blöcke</span>
        </div>

        {slots.length === 0 ? (
          <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-12 text-center">
            <p className="text-slate-500 text-sm">
              Füge Einzel-Aufgaben oder Checklisten aus der linken Leiste hinzu.
            </p>
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
    </div>
  );
}
