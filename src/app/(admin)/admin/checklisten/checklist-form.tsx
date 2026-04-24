"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type LibraryEntry = {
  parentId: string;
  parentTitle: string;
  parentDescription: string | null;
  parentRequiresPhoto: boolean;
  checklistId: string;
  checklistTitle: string;
  roleName: string;
  children: {
    title: string;
    description: string | null;
    requiresPhoto: boolean;
  }[];
};

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");

  useEffect(() => {
    if (libraryOpen && library.length === 0) {
      fetch("/api/admin/checklist-item-library")
        .then((r) => (r.ok ? r.json() : []))
        .then(setLibrary)
        .catch(() => setLibrary([]));
    }
  }, [libraryOpen, library.length]);

  function insertFromLibrary(entry: LibraryEntry) {
    const parentClientId = makeId();
    const parentItem: EditorItem = {
      clientId: parentClientId,
      title: entry.parentTitle,
      description: entry.parentDescription || "",
      requiresPhoto: entry.parentRequiresPhoto,
      parentClientId: null,
    };
    const childItems: EditorItem[] = entry.children.map((c) => ({
      clientId: makeId(),
      title: c.title,
      description: c.description || "",
      requiresPhoto: c.requiresPhoto,
      parentClientId: parentClientId,
    }));
    setItems([...items, parentItem, ...childItems]);
    setLibraryOpen(false);
  }
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

  function moveChild(clientId: string, direction: -1 | 1) {
    const target = items.find((i) => i.clientId === clientId);
    if (!target || !target.parentClientId) return;
    const siblings = items.filter((i) => i.parentClientId === target.parentClientId);
    const idx = siblings.findIndex((s) => s.clientId === clientId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= siblings.length) return;

    const reorderedSiblings = [...siblings];
    [reorderedSiblings[idx], reorderedSiblings[newIdx]] = [reorderedSiblings[newIdx], reorderedSiblings[idx]];

    // Rebuild items: parents + their (newly ordered) children
    const parents = items.filter((i) => !i.parentClientId);
    const reordered: EditorItem[] = [];
    for (const p of parents) {
      reordered.push(p);
      if (p.clientId === target.parentClientId) {
        reordered.push(...reorderedSiblings);
      } else {
        reordered.push(...items.filter((i) => i.parentClientId === p.clientId));
      }
    }
    setItems(reordered);
  }

  function moveParent(clientId: string, direction: -1 | 1) {
    // Extract parent + its children as a block, then move block up/down
    const parents = items.filter((i) => !i.parentClientId);
    const idx = parents.findIndex((p) => p.clientId === clientId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= parents.length) return;

    // Swap the two parent blocks (parent + children)
    const reorderedParents = [...parents];
    [reorderedParents[idx], reorderedParents[newIdx]] = [reorderedParents[newIdx], reorderedParents[idx]];

    // Rebuild items array in new parent order, with their children in place
    const reordered: EditorItem[] = [];
    for (const p of reorderedParents) {
      reordered.push(p);
      const children = items.filter((i) => i.parentClientId === p.clientId);
      reordered.push(...children);
    }
    setItems(reordered);
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
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-semibold">Punkte</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
            >
              Punkt einfügen
            </button>
            <button
              type="button"
              onClick={addParent}
              className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors"
            >
              + Hauptpunkt
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {parents.map((parent, pIdx) => {
            const children = childrenOf(parent.clientId);
            return (
              <div key={parent.clientId} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-400 font-medium">Hauptpunkt {pIdx + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveParent(parent.clientId, -1)}
                      disabled={pIdx === 0}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach oben"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveParent(parent.clientId, 1)}
                      disabled={pIdx === parents.length - 1}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Nach unten"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(parent.clientId)}
                      className="text-xs text-red-400 hover:text-red-300 ml-2"
                    >
                      Entfernen
                    </button>
                  </div>
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveChild(child.clientId, -1)}
                              disabled={cIdx === 0}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30"
                              title="Nach oben"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => moveChild(child.clientId, 1)}
                              disabled={cIdx === children.length - 1}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30"
                              title="Nach unten"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(child.clientId)}
                              className="text-xs text-red-400 hover:text-red-300 ml-1"
                            >
                              Entfernen
                            </button>
                          </div>
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

      {/* Library Modal */}
      {libraryOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setLibraryOpen(false)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Punkt einfügen</h3>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 border-b border-slate-700">
              <input
                type="text"
                placeholder="Suche nach Titel oder Checkliste..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {library.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Laden...</p>
              ) : (
                library
                  .filter((e) => {
                    if (!librarySearch.trim()) return true;
                    const q = librarySearch.toLowerCase();
                    return (
                      e.parentTitle.toLowerCase().includes(q) ||
                      e.checklistTitle.toLowerCase().includes(q) ||
                      e.roleName.toLowerCase().includes(q) ||
                      e.children.some((c) => c.title.toLowerCase().includes(q))
                    );
                  })
                  .map((e) => (
                    <button
                      key={`${e.checklistId}:${e.parentId}`}
                      type="button"
                      onClick={() => insertFromLibrary(e)}
                      className="w-full text-left bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 hover:border-blue-500 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-white">{e.parentTitle}</p>
                        <span className="text-xs text-slate-500">
                          {e.checklistTitle}
                          {e.roleName && ` · ${e.roleName}`}
                        </span>
                      </div>
                      {e.children.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {e.children.slice(0, 8).map((c, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded border border-slate-600" />
                              {c.title}
                            </li>
                          ))}
                          {e.children.length > 8 && (
                            <li className="text-xs text-slate-600 pl-4">+ {e.children.length - 8} weitere…</li>
                          )}
                        </ul>
                      )}
                      {e.children.length === 0 && (
                        <p className="text-xs text-slate-500 mt-1">Keine Unterpunkte</p>
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
