"use client";

import { useEffect, useState } from "react";

type ShiftTemplate = {
  id: string;
  name: string;
  defaultStart: string;
  defaultEnd: string;
  color: string;
};

export default function SchichtvorlagenPage() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [defaultStart, setDefaultStart] = useState("08:00");
  const [defaultEnd, setDefaultEnd] = useState("16:00");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const res = await fetch("/api/admin/shift-templates");
    const data = await res.json();
    setTemplates(data);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/shift-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, defaultStart, defaultEnd, color }),
    });
    if (res.ok) {
      setName("");
      setDefaultStart("08:00");
      setDefaultEnd("16:00");
      setColor("#3b82f6");
      fetchTemplates();
    }
    setSaving(false);
  }

  function startEdit(t: ShiftTemplate) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditStart(t.defaultStart);
    setEditEnd(t.defaultEnd);
    setEditColor(t.color);
  }

  async function handleUpdate(id: string) {
    const res = await fetch("/api/admin/shift-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editName,
        defaultStart: editStart,
        defaultEnd: editEnd,
        color: editColor,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchTemplates();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vorlage wirklich löschen?")) return;
    const res = await fetch("/api/admin/shift-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchTemplates();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Schichtvorlagen</h1>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-8"
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          Neue Vorlage erstellen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="z.B. Frühschicht"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Startzeit
            </label>
            <input
              type="time"
              value={defaultStart}
              onChange={(e) => setDefaultStart(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Endzeit
            </label>
            <input
              type="time"
              value={defaultEnd}
              onChange={(e) => setDefaultEnd(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Farbe</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-sm text-slate-400">{color}</span>
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Hinzufügen"}
            </button>
          </div>
        </div>
      </form>

      {/* Templates list */}
      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : templates.length === 0 ? (
        <p className="text-slate-400">Keine Vorlagen vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) =>
            editingId === t.id ? (
              <div
                key={t.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm text-slate-400">{editColor}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(t.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={t.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-10 rounded"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <p className="text-white font-medium">{t.name}</p>
                    <p className="text-sm text-slate-400">
                      {t.defaultStart} – {t.defaultEnd}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
