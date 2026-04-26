"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function accept() {
    setLoading("accept");
    const res = await fetch(`/api/admin/checklist-suggestions/${id}/accept`, { method: "POST" });
    if (res.ok) router.refresh();
    else alert("Fehler beim Übernehmen");
    setLoading(null);
  }

  async function reject() {
    if (!confirm("Vorschlag wirklich verwerfen?")) return;
    setLoading("reject");
    const res = await fetch(`/api/admin/checklist-suggestions/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Fehler beim Verwerfen");
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={accept}
        disabled={loading !== null}
        className="px-3 py-1 text-sm bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded transition-colors disabled:opacity-50"
      >
        {loading === "accept" ? "..." : "Übernehmen"}
      </button>
      <button
        onClick={reject}
        disabled={loading !== null}
        className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors disabled:opacity-50"
      >
        {loading === "reject" ? "..." : "Verwerfen"}
      </button>
    </div>
  );
}
