"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DuplicateChecklistButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/admin/checklists/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Fehler beim Kopieren");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded transition-colors"
    >
      {loading ? "..." : "Kopieren"}
    </button>
  );
}
