"use client";

import { useEffect, useState, useCallback } from "react";

type Employee = {
  id: string;
  name: string;
  role: { id: string; name: string; color: string | null };
};

type ShiftTemplate = {
  id: string;
  name: string;
  defaultStart: string;
  defaultEnd: string;
  color: string;
};

type Role = {
  id: string;
  name: string;
  color: string | null;
};

type ShiftAssignment = {
  id: string;
  employeeId: string;
  date: string;
  label: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
  shiftTemplateId: string | null;
  roleId: string | null;
  shiftTemplate: ShiftTemplate | null;
  role: Role | null;
  employee: { id: string; name: string };
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  employeeId: string;
  date: string;
  assignmentId?: string;
  templateId: string;
  label: string;
  startTime: string;
  endTime: string;
  roleId: string;
  notes: string;
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_LABELS_FULL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtShort(d: Date) {
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export default function SchichtplanPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState("");

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNum = getWeekNumber(weekStart);
  const weekEnd = addDays(weekStart, 6);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const ws = formatDate(weekStart);
    const [empRes, assRes, tplRes, roleRes] = await Promise.all([
      fetch("/api/admin/employees"),
      fetch(`/api/admin/shift-assignments?weekStart=${ws}`),
      fetch("/api/admin/shift-templates"),
      fetch("/api/admin/roles"),
    ]);
    const [empData, assData, tplData, roleData] = await Promise.all([
      empRes.json(),
      assRes.json(),
      tplRes.json(),
      roleRes.json(),
    ]);
    setEmployees(empData);
    setAssignments(assData);
    setTemplates(tplData);
    setRoles(roleData);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getAssignmentsForDay(date: string) {
    return assignments
      .filter((a) => a.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function openCreateModal(date: string) {
    setModal({
      open: true,
      mode: "create",
      employeeId: employees[0]?.id || "",
      date,
      templateId: "",
      label: "",
      startTime: "",
      endTime: "",
      roleId: "",
      notes: "",
    });
  }

  function openEditModal(assignment: ShiftAssignment) {
    setModal({
      open: true,
      mode: "edit",
      employeeId: assignment.employeeId,
      date: assignment.date,
      assignmentId: assignment.id,
      templateId: assignment.shiftTemplateId || "",
      label: assignment.label || "",
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      roleId: assignment.roleId || "",
      notes: assignment.notes || "",
    });
  }

  function handleTemplateSelect(templateId: string) {
    if (!modal) return;
    const tpl = templates.find((t) => t.id === templateId);
    setModal({
      ...modal,
      templateId,
      startTime: tpl ? tpl.defaultStart : modal.startTime,
      endTime: tpl ? tpl.defaultEnd : modal.endTime,
    });
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    const body = {
      employeeId: modal.employeeId,
      date: modal.date,
      label: modal.label || null,
      startTime: modal.startTime,
      endTime: modal.endTime,
      shiftTemplateId: modal.templateId || null,
      roleId: modal.roleId || null,
      notes: modal.notes || null,
    };

    if (modal.mode === "create") {
      await fetch("/api/admin/shift-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`/api/admin/shift-assignments/${modal.assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setModal(null);
    fetchData();
  }

  async function handleDelete() {
    if (!modal?.assignmentId) return;
    if (!confirm("Schicht wirklich löschen?")) return;
    await fetch(`/api/admin/shift-assignments/${modal.assignmentId}`, {
      method: "DELETE",
    });
    setModal(null);
    fetchData();
  }

  async function handleEmployeeChange(assignmentId: string, newEmployeeId: string) {
    await fetch(`/api/admin/shift-assignments/${assignmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: newEmployeeId }),
    });
    fetchData();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Schichtplan</h1>
        <button
          onClick={async () => {
            setGenerating(true);
            setGenerateMsg("");
            try {
              const res = await fetch("/api/admin/shift-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ weekStart: formatDate(weekStart) }),
              });
              const data = await res.json();
              if (!res.ok) {
                setGenerateMsg(data.error || "Fehler");
              } else {
                setGenerateMsg(data.message);
                fetchData();
              }
            } catch {
              setGenerateMsg("Verbindungsfehler");
            }
            setGenerating(false);
            setTimeout(() => setGenerateMsg(""), 5000);
          }}
          disabled={generating}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {generating ? "Generiere..." : "Aus Kursplan generieren"}
        </button>
      </div>

      {generateMsg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${generateMsg.includes("Fehler") || generateMsg.includes("Keine") ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
          {generateMsg}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">KW {weekNum}</p>
          <p className="text-sm text-slate-400">
            {fmtShort(weekStart)} – {fmtShort(weekEnd)}
          </p>
        </div>
        <button
          onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d);
            const dayShifts = getAssignmentsForDay(dateStr);
            const isToday = formatDate(new Date()) === dateStr;

            return (
              <div
                key={i}
                className={`bg-slate-800 border rounded-xl overflow-hidden ${
                  isToday ? "border-blue-500" : "border-slate-700"
                }`}
              >
                {/* Day header */}
                <div className={`px-4 py-2.5 border-b ${isToday ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-800 border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{DAY_LABELS_FULL[i]}</span>
                      <span className="text-sm text-slate-400 ml-2">{fmtShort(d)}</span>
                    </div>
                    <span className="text-xs text-slate-500">{DAY_LABELS[i]}</span>
                  </div>
                </div>

                {/* Shifts */}
                <div className="p-3 space-y-2">
                  {dayShifts.length === 0 && (
                    <p className="text-sm text-slate-600 text-center py-2">Keine Schichten</p>
                  )}

                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="rounded-lg p-3 space-y-2"
                      style={{
                        borderLeft: `3px solid ${shift.shiftTemplate?.color || shift.role?.color || "#3b82f6"}`,
                        backgroundColor: `${shift.shiftTemplate?.color || shift.role?.color || "#3b82f6"}10`,
                      }}
                    >
                      {/* Shift info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {shift.label || shift.shiftTemplate?.name || shift.role?.name || "Schicht"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {shift.startTime} – {shift.endTime}
                            {shift.role && <span className="ml-1.5 text-slate-500">· {shift.role.name}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => openEditModal(shift)}
                          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      {/* Employee dropdown */}
                      <select
                        value={shift.employeeId}
                        onChange={(e) => handleEmployeeChange(shift.id, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900/80 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Person zuweisen...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role?.name})
                          </option>
                        ))}
                      </select>

                      {shift.notes && (
                        <p className="text-xs text-slate-500 italic">{shift.notes}</p>
                      )}
                    </div>
                  ))}

                  {/* Add shift button */}
                  <button
                    onClick={() => openCreateModal(dateStr)}
                    className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-500 hover:border-slate-400 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-lg leading-none">+</span> Schicht hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal?.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal.mode === "create" ? "Schicht hinzufügen" : "Schicht bearbeiten"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Datum</label>
                <p className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm">
                  {modal.date}
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Bezeichnung</label>
                <input
                  type="text"
                  placeholder="z.B. Check-In Morgens, Check-In Wochenende"
                  value={modal.label}
                  onChange={(e) => setModal({ ...modal, label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Mitarbeiter</label>
                <select
                  value={modal.employeeId}
                  onChange={(e) => setModal({ ...modal, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Person wählen...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Vorlage</label>
                <select
                  value={modal.templateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Keine Vorlage</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.defaultStart}–{t.defaultEnd})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Startzeit</label>
                  <input
                    type="time"
                    value={modal.startTime}
                    onChange={(e) => setModal({ ...modal, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Endzeit</label>
                  <input
                    type="time"
                    value={modal.endTime}
                    onChange={(e) => setModal({ ...modal, endTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Rolle</label>
                <select
                  value={modal.roleId}
                  onChange={(e) => setModal({ ...modal, roleId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Keine Rolle</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Notizen (optional)</label>
                <textarea
                  value={modal.notes}
                  onChange={(e) => setModal({ ...modal, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !modal.startTime || !modal.endTime}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
              {modal.mode === "edit" && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-medium rounded-lg transition-colors"
                >
                  Löschen
                </button>
              )}
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
