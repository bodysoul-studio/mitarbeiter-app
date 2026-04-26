"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Employee = { id: string; name: string };

export function FilterBar({
  date,
  employeeId,
  employees,
}: {
  date: string;
  employeeId: string;
  employees: Employee[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/admin/tagesuebersicht?${params.toString()}`);
  }

  function shiftDay(delta: number) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta);
    const yy = dt.getFullYear();
    const mm = (dt.getMonth() + 1).toString().padStart(2, "0");
    const dd = dt.getDate().toString().padStart(2, "0");
    setParams({ date: `${yy}-${mm}-${dd}` });
  }

  function setToday() {
    const dt = new Date();
    const yy = dt.getFullYear();
    const mm = (dt.getMonth() + 1).toString().padStart(2, "0");
    const dd = dt.getDate().toString().padStart(2, "0");
    setParams({ date: `${yy}-${mm}-${dd}` });
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => shiftDay(-1)}
        className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm hover:bg-slate-700"
      >
        ←
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => setParams({ date: e.target.value })}
        className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={() => shiftDay(1)}
        className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm hover:bg-slate-700"
      >
        →
      </button>
      <button
        type="button"
        onClick={setToday}
        className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded text-sm"
      >
        Heute
      </button>
      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-slate-400">Mitarbeiter:</label>
        <select
          value={employeeId}
          onChange={(e) => setParams({ employeeId: e.target.value || null })}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Alle</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
