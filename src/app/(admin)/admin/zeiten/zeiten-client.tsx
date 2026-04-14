"use client";

import { useEffect, useState } from "react";

type Employee = { id: string; name: string };
type TimeRecord = {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  ipAddress: string | null;
  employee: { name: string };
};

export function ZeitenClient({ employees }: { employees: Employee[] }) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeeId, setEmployeeId] = useState("");
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (employeeId) params.set("employeeId", employeeId);

    fetch(`/api/admin/time-records?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date, employeeId]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function calcDuration(clockIn: string, clockOut: string | null) {
    if (!clockOut) return "Offen";
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Zeiterfassung</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Alle Mitarbeiter</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Mitarbeiter
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Einstempeln
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Ausstempeln
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Dauer
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className="border-b border-slate-700/50 last:border-0"
                >
                  <td className="px-4 py-3 text-white">
                    {rec.employee?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatTime(rec.clockIn)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {rec.clockOut ? formatTime(rec.clockOut) : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {calcDuration(rec.clockIn, rec.clockOut)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {rec.ipAddress || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p className="text-slate-400 text-center py-6">
              Keine Einträge für diesen Tag.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
