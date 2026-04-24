"use client";

import { useRouter } from "next/navigation";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Tagesplan "${name}" wirklich löschen?`)) return;
    await fetch(`/api/admin/day-templates/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
    >
      Löschen
    </button>
  );
}
