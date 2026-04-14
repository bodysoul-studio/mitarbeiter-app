"use client";

import { useEffect, useState } from "react";

type Skill = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sortOrder: number;
  completedBy: string[];
};

export default function FaehigkeitenPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/skills")
      .then((r) => r.json())
      .then((data: Skill[]) => {
        setSkills(data);
        setLoading(false);
      });
  }, []);

  function resetForm() {
    setEditId(null);
    setTitle("");
    setDescription("");
    setCategory("Allgemein");
    setSortOrder(0);
  }

  function startEdit(skill: Skill) {
    setEditId(skill.id);
    setTitle(skill.title);
    setDescription(skill.description || "");
    setCategory(skill.category);
    setSortOrder(skill.sortOrder);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editId) {
      const res = await fetch(`/api/admin/skills/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, sortOrder }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills((prev) =>
          prev.map((s) =>
            s.id === editId ? { ...updated, completedBy: s.completedBy } : s
          )
        );
        resetForm();
      }
    } else {
      const res = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, sortOrder }),
      });
      if (res.ok) {
        const created = await res.json();
        setSkills((prev) => [...prev, created]);
        resetForm();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Fähigkeit wirklich löschen?")) return;
    const res = await fetch(`/api/admin/skills/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
      if (editId === id) resetForm();
    }
  }

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fähigkeiten</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-400">
          {editId ? "Fähigkeit bearbeiten" : "Neue Fähigkeit"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Titel (z.B. Kasse bedienen)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Kategorie (z.B. Empfang, Technik)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 sm:col-span-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Speichern..." : editId ? "Aktualisieren" : "Hinzufügen"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : skills.length === 0 ? (
        <p className="text-slate-400">Noch keine Fähigkeiten angelegt.</p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {cat}
              </h3>
              <div className="space-y-2">
                {grouped[cat].map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-white">{skill.title}</p>
                        {skill.description && (
                          <p className="text-sm text-slate-400 mt-1">{skill.description}</p>
                        )}
                        {skill.completedBy.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {skill.completedBy.map((name, i) => (
                              <span
                                key={i}
                                className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 mt-2">
                            Noch kein Mitarbeiter hat dies bestätigt
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(skill)}
                          className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
