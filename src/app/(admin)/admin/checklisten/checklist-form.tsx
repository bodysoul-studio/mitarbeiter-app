"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = { id: string; name: string };
type EditorItem = {
  clientId: string;
  title: string;
  description: string;
  requiresPhoto: boolean;
  parentClientId: string | null;
};
type ServerItem = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  requiresPhoto: boolean;
};
type Checklist = {
  id: string;
  title: string;
  roleId: string;
  shiftType?: string;
  startTime: string;
  endTime: string;
  items: ServerItem[];
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

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
  const [shiftType, setShiftType] = useState(checklist?.shiftType || "");
  const [startTime, setStartTime] = useState(checklist?.startTime || "06:00");
  const [endTime, setEndTime] = useState(checklist?.endTime || "14:00");

  const [items, setItems] = useState<EditorItem[]>(() => {
    if (!checklist?.items || checklist.items.length === 0) {
      return [{ clientId: makeId(), title: "", description: "", requiresPhoto: false, parentClientId: null }];
    }
    // Map server id → client id
    const idMap = new Map<string, string>();
    checklist.items.forEach((it) => idMap.set(it.id, makeId()));
    return checklist.items.map((it) => ({
      clientId: idMap.get(it.id)!,
      title: it.title,
      description: it.description || "",
      requiresPhoto: it.requiresPhoto,
      parentClientId: it.parentId ? idMap.get(it.parentId) || null : null,
    }));
  });

  function addParent() {
    setItems([
      ...items,
      { clientId: makeId(), title: "", description: "", requiresPhoto: false, parentClientId: null },
    ]);
  }

  function addChild(parentId: string) {
    // Insert child after existing children of that parent
    const lastChildIdx = items.map((i, idx) => i.parentClientId === parentId ? idx : -1).filter((i) => i >= 0).pop();
    const parentIdx = items.findIndex((i) => i.clientId === parentId);
    const insertAfter = lastChildIdx !== undefined ? lastChildIdx : parentIdx;
    const newItem: EditorItem = {
      clientId: makeId(),
      title: "",
      description: "",
      requiresPhoto: false,
      parentClientId: parentId,
    };
    setItems([...items.slice(0, insertAfter + 1), newItem, ...items.slice(insertAfter + 1)]);
  }

  function removeItem(clientId: string) {
    // Also remove all children
    setItems(items.filter((i) => i.clientId !== clientId && i.parentClientId !== clientId));
  }

  function updateItem(clientId: string, field: keyof EditorItem, value: string | boolean) {
    setItems(items.map((i) => (i.clientId === clientId ? { ...i, [field]: value } : i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Flatten: parents first, then children. Attach parentClientId reference
    const validItems = items.filter((i) => i.title.trim());
    const payload = {
      title,
      roleId,
      shiftType,
      startTime,
      endTime,
      items: validItems.map((i) => ({
        title: i.title,
        description: i.description || null,
        requiresPhoto: i.requiresPhoto,
        clientId: i.clientId,
        parentClientId: i.parentClientId,
      })),
    };

    const url = checklist ? `/api/admin/checklists/${checklist.id}` : "/api/admin/checklists";
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

  // Group for display: parents in order, then their children
  const parents = items.filter((i) => !i.parentClientId);
  function childrenOf(parentId: string) {
    return items.filter((i) => i.parentClientId === parentId);
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Rolle</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Schichttyp</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Alle Schichten</option>
              <option value="frueh">Nur Frühschicht</option>
              <option value="spaet">Nur Spätschicht</option>
              <option value="ganztag">Nur Ganztag</option>
            </select>
          </div>
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
            onClick={addParent}
            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors"
          >
            + Hauptpunkt
          </button>
        </div>

        <div className="space-y-3">
          {parents.map((parent, pIdx) => {
            const children = childrenOf(parent.clientId);
            return (
              <div key={parent.clientId} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-400 font-medium">Hauptpunkt {pIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(parent.clientId)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Entfernen
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Titel (z.B. Army-Raum)"
                  value={parent.title}
                  onChange={(e) => updateItem(parent.clientId, "title", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Beschreibung (optional)"
                  value={parent.description}
                  onChange={(e) => updateItem(parent.clientId, "description", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={parent.requiresPhoto}
                    onChange={(e) => updateItem(parent.clientId, "requiresPhoto", e.target.checked)}
                    className="rounded"
                  />
                  Foto erforderlich
                </label>

                {/* Children */}
                {children.length > 0 && (
                  <div className="ml-4 border-l-2 border-slate-700 pl-4 space-y-2">
                    {children.map((child, cIdx) => (
                      <div key={child.clientId} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Unterpunkt {cIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeItem(child.clientId)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Entfernen
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Titel (z.B. Mikrofon-Check)"
                          value={child.title}
                          onChange={(e) => updateItem(child.clientId, "title", e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Beschreibung (optional)"
                          value={child.description}
                          onChange={(e) => updateItem(child.clientId, "description", e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={child.requiresPhoto}
                            onChange={(e) => updateItem(child.clientId, "requiresPhoto", e.target.checked)}
                            className="rounded"
                          />
                          Foto erforderlich
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addChild(parent.clientId)}
                  className="text-xs text-blue-400 hover:text-blue-300 ml-4"
                >
                  + Unterpunkt hinzufügen
                </button>
              </div>
            );
          })}
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
