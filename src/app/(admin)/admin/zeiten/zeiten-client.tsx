"use client";

import { useEffect, useState, useMemo } from "react";

type Employee = { id: string; name: string };
type Pause = { pauseStart: string; pauseEnd: string | null };
type TimeRecord = {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  ipAddress: string | null;
  employee: { name: string };
  pauses: Pause[];
};

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDateDE(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

const PRESETS = [
  { label: "Heute", getRange: () => { const t = fmtDate(new Date()); return { from: t, to: t }; } },
  { label: "Diese Woche", getRange: () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now); mon.setDate(diff);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    return { from: fmtDate(mon), to: fmtDate(sun) };
  }},
  { label: "Dieser Monat", getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: fmtDate(start), to: fmtDate(end) };
  }},
  { label: "Letzter Monat", getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtDate(start), to: fmtDate(end) };
  }},
  { label: "Letzte 7 Tage", getRange: () => {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 6);
    return { from: fmtDate(start), to: fmtDate(now) };
  }},
  { label: "Letzte 30 Tage", getRange: () => {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 29);
    return { from: fmtDate(start), to: fmtDate(now) };
  }},
];

export function ZeitenClient({ employees }: { employees: Employee[] }) {
  const [from, setFrom] = useState(() => fmtDate(new Date()));
  const [to, setTo] = useState(() => fmtDate(new Date()));
  const [activePreset, setActivePreset] = useState("Heute");
  const [employeeId, setEmployeeId] = useState("");
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  function applyPreset(preset: typeof PRESETS[number]) {
    const range = preset.getRange();
    setFrom(range.from);
    setTo(range.to);
    setActivePreset(preset.label);
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (employeeId) params.set("employeeId", employeeId);

    fetch(`/api/admin/time-records?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [from, to, employeeId]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function calcPauseMs(pauses: Pause[]): number {
    let total = 0;
    for (const p of pauses) {
      const s = new Date(p.pauseStart).getTime();
      const e = p.pauseEnd ? new Date(p.pauseEnd).getTime() : Date.now();
      total += e - s;
    }
    return total;
  }

  function calcDuration(rec: TimeRecord): { work: string; pause: string; totalMs: number; pauseMs: number } {
    const start = new Date(rec.clockIn).getTime();
    const end = rec.clockOut ? new Date(rec.clockOut).getTime() : Date.now();
    const pauseMs = calcPauseMs(rec.pauses);
    const workMs = (end - start) - pauseMs;
    const fmtMs = (ms: number) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return `${h}h ${m.toString().padStart(2, "0")}min`;
    };
    return { work: fmtMs(workMs), pause: pauseMs > 0 ? fmtMs(pauseMs) : "", totalMs: workMs, pauseMs };
  }

  // Summary per employee
  const summary = useMemo(() => {
    const map = new Map<string, { name: string; workMs: number; pauseMs: number; days: Set<string>; records: number }>();
    for (const rec of records) {
      const key = rec.employeeId;
      const existing = map.get(key) || { name: rec.employee.name, workMs: 0, pauseMs: 0, days: new Set<string>(), records: 0 };
      const dur = calcDuration(rec);
      existing.workMs += dur.totalMs;
      existing.pauseMs += dur.pauseMs;
      existing.days.add(rec.date);
      existing.records++;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const totalWorkMs = summary.reduce((s, e) => s + e.workMs, 0);
  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m.toString().padStart(2, "0")}min`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Zeiterfassung</h1>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.label
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range + employee filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setActivePreset(""); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-500">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setActivePreset(""); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Alle Mitarbeiter</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {records.length} Einträge · {fmtMs(totalWorkMs)} gesamt
        </span>
      </div>

      {/* Summary per employee */}
      {summary.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {summary.map((s) => (
            <div key={s.name} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
              <p className="font-medium text-white text-sm">{s.name}</p>
              <p className="text-lg font-bold text-blue-400">{fmtMs(s.workMs)}</p>
              <p className="text-xs text-slate-500">
                {s.days.size} Tage · {s.records} Einträge
                {s.pauseMs > 0 && ` · ${fmtMs(s.pauseMs)} Pause`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Ein</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Aus</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Arbeitszeit</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Pause</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const dur = calcDuration(rec);
                  return (
                    <tr key={rec.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-slate-300">{fmtDateDE(rec.date)}</td>
                      <td className="px-4 py-3 text-white">{rec.employee?.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatTime(rec.clockIn)}</td>
                      <td className="px-4 py-3 text-slate-300">{rec.clockOut ? formatTime(rec.clockOut) : <span className="text-amber-400">Offen</span>}</td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{dur.work}</td>
                      <td className="px-4 py-3 text-amber-400 text-xs">{dur.pause || "-"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{rec.ipAddress || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <p className="text-slate-400 text-center py-6">Keine Einträge im gewählten Zeitraum.</p>
          )}
        </div>
      )}
    </div>
  );
}
