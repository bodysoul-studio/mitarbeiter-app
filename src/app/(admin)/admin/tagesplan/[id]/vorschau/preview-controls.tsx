"use client";

import { useRouter } from "next/navigation";

export function PreviewControls({ currentDate, templateId }: { currentDate: string; templateId: string }) {
  const router = useRouter();

  function go(date: string) {
    router.push(`/admin/tagesplan/${templateId}/vorschau?date=${date}`);
  }

  function shiftDay(delta: number) {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta);
    const nd = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt
      .getDate()
      .toString()
      .padStart(2, "0")}`;
    go(nd);
  }

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      <button
        onClick={() => shiftDay(-1)}
        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm hover:bg-slate-700"
      >
        ← Tag
      </button>
      <input
        type="date"
        value={currentDate}
        onChange={(e) => go(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={() => shiftDay(1)}
        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm hover:bg-slate-700"
      >
        Tag →
      </button>
      <button
        onClick={() => go(new Date().toISOString().split("T")[0])}
        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-sm"
      >
        Heute
      </button>
    </div>
  );
}
