"use client";

import { useEffect, useState } from "react";

type Activity = { id: string; activityName: string };
type Room = {
  id: string;
  name: string;
  color: string;
  activities: Activity[];
};

export default function KursraeumePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bsportActivities, setBsportActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBsport, setLoadingBsport] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newActivity, setNewActivity] = useState("");

  useEffect(() => {
    fetch("/api/admin/course-rooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setRooms(data);
        setLoading(false);
      });
  }, []);

  async function loadBsportActivities() {
    setLoadingBsport(true);
    try {
      const res = await fetch("/api/admin/bsport-activities");
      if (res.ok) {
        const data = await res.json();
        setBsportActivities(data);
      }
    } catch {}
    setLoadingBsport(false);
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setColor("#3b82f6");
    setSelectedActivities([]);
    setNewActivity("");
  }

  function startEdit(room: Room) {
    setEditId(room.id);
    setName(room.name);
    setColor(room.color);
    setSelectedActivities(room.activities.map((a) => a.activityName));
    setNewActivity("");
    if (bsportActivities.length === 0) loadBsportActivities();
  }

  function toggleActivity(activityName: string) {
    setSelectedActivities((prev) =>
      prev.includes(activityName) ? prev.filter((a) => a !== activityName) : [...prev, activityName]
    );
  }

  function addCustomActivity() {
    const trimmed = newActivity.trim();
    if (!trimmed) return;
    if (!selectedActivities.includes(trimmed)) {
      setSelectedActivities([...selectedActivities, trimmed]);
    }
    setNewActivity("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { name, color, activities: selectedActivities };

    if (editId) {
      const res = await fetch(`/api/admin/course-rooms/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setRooms((prev) => prev.map((r) => (r.id === editId ? updated : r)));
        resetForm();
      }
    } else {
      const res = await fetch("/api/admin/course-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setRooms([...rooms, created]);
        resetForm();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Raum wirklich löschen?")) return;
    const res = await fetch(`/api/admin/course-rooms/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => r.id !== id));
      if (editId === id) resetForm();
    }
  }

  if (loading) return <p className="text-slate-400">Laden...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kursräume</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gruppiere bsport-Kursformate zu Räumen (z.B. Pilates, Cycling, Army) — für automatische Tagesplan-Generierung.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-400">
          {editId ? "Raum bearbeiten" : "Neuer Raum"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              placeholder="z.B. Pilates, Cycling, Army"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Farbe</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 bg-slate-900 border border-slate-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Zugeordnete bsport-Kursformate</label>
            <button
              type="button"
              onClick={loadBsportActivities}
              disabled={loadingBsport}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              {loadingBsport ? "Laden..." : bsportActivities.length > 0 ? "↻ Neu laden" : "bsport-Kursformate laden"}
            </button>
          </div>

          {/* Selected chips */}
          {selectedActivities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedActivities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => toggleActivity(a)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Manual add */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Kursformat manuell hinzufügen"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomActivity();
                }
              }}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={addCustomActivity}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm"
            >
              +
            </button>
          </div>

          {/* bsport list */}
          {bsportActivities.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded p-3 max-h-60 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Aus bsport (30 Tage):</p>
              <div className="flex flex-wrap gap-1.5">
                {bsportActivities.map((a) => {
                  const selected = selectedActivities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleActivity(a)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        selected
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !name}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Speichern..." : editId ? "Aktualisieren" : "Hinzufügen"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      {/* Room list */}
      {rooms.length === 0 ? (
        <p className="text-slate-400">Noch keine Kursräume angelegt.</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: room.color }} />
                <div className="min-w-0">
                  <p className="font-medium text-white">{room.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {room.activities.length === 0
                      ? "Keine Kursformate zugeordnet"
                      : room.activities.map((a) => a.activityName).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(room)}
                  className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(room.id)}
                  className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
