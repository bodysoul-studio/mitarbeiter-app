"use client";

import { useEffect, useState } from "react";

type Employee = {
  id: string;
  name: string;
  role: { id: string; name: string; color: string | null };
};

type Schedule = {
  employeeId: string;
  weekday: number;
  shiftType: string;
};

const DAYS = [
  { value: 0, label: "Mo" },
  { value: 1, label: "Di" },
  { value: 2, label: "Mi" },
  { value: 3, label: "Do" },
  { value: 4, label: "Fr" },
  { value: 5, label: "Sa" },
  { value: 6, label: "So" },
];

const SHIFT_TYPES = [
  { value: "", label: "Frei", color: "bg-slate-700 text-slate-500" },
  { value: "frueh", label: "Früh", color: "bg-amber-600/20 text-amber-400" },
  { value: "spaet", label: "Spät", color: "bg-blue-600/20 text-blue-400" },
  { value: "ganztag", label: "Ganztag", color: "bg-purple-600/20 text-purple-400" },
];

export default function MitarbeiterPlanungPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/employees").then((r) => r.json()),
      fetch("/api/admin/employee-schedules").then((r) => r.json()),
    ]).then(([empData, schedData]) => {
      setEmployees(empData);
      setSchedules(schedData);
      setLoading(false);
    });
  }, []);

  function getShiftType(employeeId: string, weekday: number): string {
    const s = schedules.find(
      (s) => s.employeeId === employeeId && s.weekday === weekday
    );
    return s?.shiftType || "";
  }

  async function cycleShift(employeeId: string, weekday: number) {
    const current = getShiftType(employeeId, weekday);
    const options = SHIFT_TYPES.map((t) => t.value);
    const nextIdx = (options.indexOf(current) + 1) % options.length;
    const next = options[nextIdx];

    // Optimistic update
    setSaving(`${employeeId}-${weekday}`);
    setSchedules((prev) => {
      const filtered = prev.filter(
        (s) => !(s.employeeId === employeeId && s.weekday === weekday)
      );
      if (next) {
        filtered.push({ employeeId, weekday, shiftType: next });
      }
      return filtered;
    });

    await fetch("/api/admin/employee-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, weekday, shiftType: next }),
    });

    setSaving(null);
  }

  function getShiftInfo(value: string) {
    return SHIFT_TYPES.find((t) => t.value === value) || SHIFT_TYPES[0];
  }

  if (loading) return <p className="text-slate-400 p-6">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Mitarbeiter-Planung</h1>
      <p className="text-slate-400 text-sm mb-6">
        Feste Wochenmuster pro Mitarbeiter. Klick auf eine Zelle um zwischen Frei → Früh → Spät → Ganztag zu wechseln.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {SHIFT_TYPES.map((t) => (
          <div key={t.value} className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
              {t.label}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="min-w-[600px] px-4 md:px-0">
          {/* Header */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-1">
            <div className="p-2 text-sm font-medium text-slate-400">Mitarbeiter</div>
            {DAYS.map((d) => (
              <div key={d.value} className="p-2 text-center text-sm font-medium text-slate-400">
                {d.label}
              </div>
            ))}
          </div>

          {/* Employee rows */}
          {employees.map((emp) => (
            <div key={emp.id} className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-1">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: emp.role?.color || "#6b7280" }}
                />
                <div className="min-w-0">
                  <span className="text-sm text-white truncate block">{emp.name}</span>
                  <span className="text-xs text-slate-500">{emp.role?.name}</span>
                </div>
              </div>
              {DAYS.map((d) => {
                const shiftType = getShiftType(emp.id, d.value);
                const info = getShiftInfo(shiftType);
                const isSaving = saving === `${emp.id}-${d.value}`;
                return (
                  <button
                    key={d.value}
                    onClick={() => cycleShift(emp.id, d.value)}
                    disabled={isSaving}
                    className={`rounded-lg p-2 text-center text-sm font-medium transition-colors border border-slate-700/50 hover:border-slate-500 ${info.color} ${isSaving ? "opacity-50" : ""}`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Zusammenfassung</h3>
        <div className="space-y-2">
          {employees.map((emp) => {
            const empSchedules = schedules.filter((s) => s.employeeId === emp.id && s.shiftType);
            if (empSchedules.length === 0) return null;
            return (
              <div key={emp.id} className="flex items-center gap-2 text-sm">
                <span className="text-white font-medium w-40">{emp.name}:</span>
                <span className="text-slate-400">
                  {empSchedules
                    .sort((a, b) => a.weekday - b.weekday)
                    .map((s) => `${DAYS[s.weekday]?.label} ${getShiftInfo(s.shiftType).label}`)
                    .join(", ")}
                </span>
                <span className="text-slate-500">({empSchedules.length} Tage)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
