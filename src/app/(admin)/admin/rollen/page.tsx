"use client";

import { useEffect, useState } from "react";

type Role = {
  id: string;
  name: string;
  color: string | null;
  _count?: { employees: number };
};

export default function RollenPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    const res = await fetch("/api/admin/roles");
    const data = await res.json();
    setRoles(data);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    if (res.ok) {
      setName("");
      setColor("#3b82f6");
      fetchRoles();
    } else {
      alert("Fehler beim Erstellen");
    }
    setSaving(false);
  }

  function startEdit(role: Role) {
    setEditingId(role.id);
    setEditName(role.name);
    setEditColor(role.color || "#3b82f6");
  }

  async function saveEdit() {
    if (!editingId) return;

    const res = await fetch(`/api/admin/roles/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchRoles();
    } else {
      alert("Fehler beim Speichern");
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`Rolle "${role.name}" wirklich löschen?`)) return;

    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });

    if (res.ok) {
      fetchRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Fehler beim Löschen");
    }
  }

  if (loading) return <p className="text-slate-400">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Rollen</h1>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6"
      >
        <h2 className="text-sm font-semibold text-slate-400 mb-3">
          Neue Rolle
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded border border-slate-600 bg-slate-900 cursor-pointer"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "..." : "Hinzufügen"}
          </button>
        </div>
      </form>

      {/* Role list */}
      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
          >
            {editingId === role.id ? (
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-600 bg-slate-900 cursor-pointer"
                />
                <button
                  onClick={saveEdit}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: role.color || "#3b82f6" }}
                  />
                  <span className="font-medium text-white">{role.name}</span>
                  {role._count && (
                    <span className="text-xs text-slate-400">
                      {role._count.employees}{" "}
                      {role._count.employees === 1
                        ? "Mitarbeiter"
                        : "Mitarbeiter"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(role)}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
                    className="text-xs px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-slate-400">Keine Rollen vorhanden.</p>
        )}
      </div>
    </div>
  );
}
