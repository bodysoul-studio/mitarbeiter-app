"use client";

import { useEffect, useState } from "react";

type Role = { id: string; name: string; color: string | null };
type Schedule = { employeeId: string; weekday: number; shiftType: string };
type Employee = {
  id: string;
  name: string;
  roleId: string;
  additionalRoles: string;
  isActive: boolean;
  role: Role;
};

const DAYS = [
  { value: 0, short: "Mo" },
  { value: 1, short: "Di" },
  { value: 2, short: "Mi" },
  { value: 3, short: "Do" },
  { value: 4, short: "Fr" },
  { value: 5, short: "Sa" },
  { value: 6, short: "So" },
];

const SHIFT_TYPES = [
  { value: "", label: "Frei", color: "bg-slate-700 text-slate-500 border-slate-600" },
  { value: "frueh", label: "Früh", color: "bg-amber-600/20 text-amber-400 border-amber-600/30" },
  { value: "spaet", label: "Spät", color: "bg-blue-600/20 text-blue-400 border-blue-600/30" },
  { value: "ganztag", label: "Ganztag", color: "bg-purple-600/20 text-purple-400 border-purple-600/30" },
];

function getShiftInfo(value: string) {
  return SHIFT_TYPES.find((t) => t.value === value) || SHIFT_TYPES[0];
}

function parseAdditionalRoles(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function getAllRoleIds(emp: Employee): string[] {
  const ids = [emp.roleId];
  for (const id of parseAdditionalRoles(emp.additionalRoles)) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export default function MitarbeiterPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New employee
  const [newName, setNewName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit employee
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editAdditionalRoles, setEditAdditionalRoles] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const safeJson = (r: Response) => r.ok ? r.json() : Promise.resolve([]);
    Promise.all([
      fetch("/api/admin/employees").then(safeJson),
      fetch("/api/admin/roles").then(safeJson),
      fetch("/api/admin/employee-schedules").then(safeJson),
    ]).then(([emps, rls, scheds]) => {
      setEmployees(emps);
      setRoles(rls);
      setSchedules(scheds);
      if (rls.length > 0) setNewRoleId(rls[0].id);
      setLoading(false);
    });
  }, []);

  function startEdit(emp: Employee) {
    setExpandedId(emp.id);
    setEditName(emp.name);
    setEditPin("");
    setEditRoleId(emp.roleId);
    setEditAdditionalRoles(parseAdditionalRoles(emp.additionalRoles));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, roleId: newRoleId, pin: newPin }),
    });
    if (res.ok) {
      const emp = await res.json();
      setEmployees([...employees, emp]);
      setNewName("");
      setNewPin("");
    }
    setSaving(false);
  }

  async function handleSaveEdit(empId: string) {
    setEditSaving(true);
    const body: Record<string, unknown> = {
      name: editName,
      roleId: editRoleId,
      additionalRoles: JSON.stringify(editAdditionalRoles),
    };
    if (editPin) body.pin = editPin;

    const res = await fetch(`/api/admin/employees/${empId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setEmployees(employees.map((e) => (e.id === empId ? updated : e)));
    }
    setEditSaving(false);
  }

  async function toggleActive(emp: Employee) {
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEmployees(employees.map((e) => (e.id === emp.id ? updated : e)));
    }
  }

  function toggleAdditionalRole(roleId: string) {
    setEditAdditionalRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  function getShiftType(employeeId: string, weekday: number): string {
    return schedules.find((s) => s.employeeId === employeeId && s.weekday === weekday)?.shiftType || "";
  }

  async function cycleShift(employeeId: string, weekday: number) {
    const current = getShiftType(employeeId, weekday);
    const options = SHIFT_TYPES.map((t) => t.value);
    const next = options[(options.indexOf(current) + 1) % options.length];

    setSchedules((prev) => {
      const filtered = prev.filter((s) => !(s.employeeId === employeeId && s.weekday === weekday));
      if (next) filtered.push({ employeeId, weekday, shiftType: next });
      return filtered;
    });

    await fetch("/api/admin/employee-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, weekday, shiftType: next }),
    });
  }

  function getRoleNames(emp: Employee): string {
    const allIds = getAllRoleIds(emp);
    return allIds.map((id) => roles.find((r) => r.id === id)?.name || "?").join(" + ");
  }

  function getScheduleSummary(empId: string): string {
    const empScheds = schedules.filter((s) => s.employeeId === empId && s.shiftType);
    if (empScheds.length === 0) return "Kein Wochenplan";
    return empScheds
      .sort((a, b) => a.weekday - b.weekday)
      .map((s) => `${DAYS[s.weekday]?.short} ${getShiftInfo(s.shiftType).label}`)
      .join(", ");
  }

  if (loading) return <p className="text-slate-400">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mitarbeiter</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-400">Neuer Mitarbeiter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
          <input type="password" placeholder="PIN (4-6 Stellen)" value={newPin} onChange={(e) => setNewPin(e.target.value)} required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          {saving ? "Wird erstellt..." : "Hinzufügen"}
        </button>
      </form>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-slate-500">Wochenplan:</span>
        {SHIFT_TYPES.map((t) => (
          <span key={t.value} className={`px-2 py-0.5 rounded text-xs font-medium border ${t.color}`}>{t.label}</span>
        ))}
      </div>

      {/* Employee list */}
      <div className="space-y-2">
        {employees.map((emp) => {
          const isExpanded = expandedId === emp.id;
          return (
            <div key={emp.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => { if (isExpanded) { setExpandedId(null); } else { startEdit(emp); } }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{emp.name}</p>
                  <p className="text-xs text-slate-400">
                    {getRoleNames(emp)} · {getScheduleSummary(emp.id)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs ${emp.isActive ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                    {emp.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-700 space-y-4">
                  {/* Edit fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Neue PIN (leer = unverändert)</label>
                      <input type="password" placeholder="····" value={editPin} onChange={(e) => setEditPin(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Rollen</label>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => {
                        const isPrimary = editRoleId === r.id;
                        const isAdditional = editAdditionalRoles.includes(r.id);
                        const isSelected = isPrimary || isAdditional;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (isPrimary) return; // Can't deselect primary
                              if (isAdditional) {
                                toggleAdditionalRole(r.id);
                              } else {
                                toggleAdditionalRole(r.id);
                              }
                            }}
                            onDoubleClick={() => {
                              // Double-click to set as primary
                              const oldPrimary = editRoleId;
                              setEditRoleId(r.id);
                              // Move old primary to additional if it's not already there
                              if (oldPrimary !== r.id) {
                                setEditAdditionalRoles((prev) => {
                                  const filtered = prev.filter((id) => id !== r.id);
                                  if (!filtered.includes(oldPrimary)) filtered.push(oldPrimary);
                                  return filtered;
                                });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              isPrimary
                                ? "border-white text-white"
                                : isSelected
                                ? "border-blue-500 text-blue-400"
                                : "border-slate-600 text-slate-500 hover:border-slate-400"
                            }`}
                            style={isSelected ? { backgroundColor: (r.color || "#3b82f6") + "20" } : {}}
                          >
                            {r.name}
                            {isPrimary && <span className="ml-1 text-xs text-slate-400">(Haupt)</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Klick = zusätzliche Rolle an/aus · Doppelklick = Hauptrolle ändern</p>
                  </div>

                  {/* Weekly schedule */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Wochenplan (klick zum Ändern)</label>
                    <div className="flex gap-1.5">
                      {DAYS.map((d) => {
                        const st = getShiftType(emp.id, d.value);
                        const info = getShiftInfo(st);
                        return (
                          <button key={d.value}
                            onClick={(e) => { e.stopPropagation(); cycleShift(emp.id, d.value); }}
                            className={`flex-1 rounded-lg py-2 text-center border transition-colors ${info.color}`}>
                            <span className="block text-xs text-slate-400">{d.short}</span>
                            <span className="block text-xs font-medium mt-0.5">{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(emp.id)} disabled={editSaving}
                      className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                      {editSaving ? "Speichern..." : "Speichern"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(emp); }}
                      className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white">
                      {emp.isActive ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {employees.length === 0 && (
        <p className="text-slate-400 text-center py-6">Keine Mitarbeiter vorhanden.</p>
      )}
    </div>
  );
}
