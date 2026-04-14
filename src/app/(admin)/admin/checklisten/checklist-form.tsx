"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = { id: string; name: string };
type ChecklistItem = {
  title: string;
  description: string;
  requiresPhoto: boolean;
};
type Checklist = {
  id: string;
  title: string;
  roleId: string;
  startTime: string;
  endTime: string;
  items: { id: string; title: string; description: string | null; requiresPhoto: boolean }[];
};

export function ChecklistForm({
  roles,
  checklist,
}: {
  roles: Role[];
  checklist?: Checklist;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(checklist?.title || "");
  const [roleId, setRoleId] = useState(checklist?.roleId || (roles[0]?.id || ""));
  const [startTime, setStartTime] = useState(checklist?.startTime || "06:00");
  const [endTime, setEndTime] = useState(checklist?.endTime || "14:00");
  const [items, setItems] = useState<ChecklistItem[]>(
    checklist?.items.map((i) => ({
      title: i.title,
      description: i.description || "",
      requiresPhoto: i.requiresPhoto,
    })) || [{ title: "", description: "", requiresPhoto: false }]
  );

  function addItem() {
    setItems([...items, { title: "", description: "", requiresPhoto: false }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ChecklistItem, value: string | boolean) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const validItems = items.filter((i) => i.title.trim());
    const payload = { title, roleId, startTime, endTime, items: validItems };

    const url = checklist
      ? `/api/admin/checklists/${checklist.id}`
      : "/api/admin/checklists";
    const method = checklist ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/checklisten");
      router.refresh();
    } else {
      alert("Fehler beim Speichern");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!checklist) return;
    if (!confirm("Checkliste wirklich löschen?")) return;

    await fetch(`/api/admin/checklists/${checklist.id}`, { method: "DELETE" });
    router.push("/admin/checklisten");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Rolle</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Startzeit</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Endzeit</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Punkte</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors"
          >
            + Punkt hinzufügen
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Punkt {index + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Titel"
                value={item.title}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Beschreibung (optional)"
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={item.requiresPhoto}
                  onChange={(e) => updateItem(index, "requiresPhoto", e.target.checked)}
                  className="rounded"
                />
                Foto erforderlich
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? "Speichern..." : checklist ? "Aktualisieren" : "Erstellen"}
        </button>

        {checklist && (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-600/20 text-red-400 hover:bg-red-600/40 px-6 py-2 rounded-lg transition-colors"
          >
            Löschen
          </button>
        )}
      </div>
    </form>
  );
}
