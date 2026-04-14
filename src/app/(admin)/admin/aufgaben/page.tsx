"use client";

import { useEffect, useState } from "react";

type CompletedBy = {
  employeeName: string;
  completedAt: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  roleId: string | null;
  priority: string;
  completedBy: CompletedBy[];
};

type Role = {
  id: string;
  name: string;
  color: string | null;
};

export default function AufgabenPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roleId, setRoleId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then(setRoles);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/tasks?date=${date}`)
      .then((r) => r.json())
      .then((data: Task[]) => {
        setTasks(data);
        setLoading(false);
      });
  }, [date]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        date,
        roleId: roleId || null,
        priority,
      }),
    });

    if (res.ok) {
      const task = await res.json();
      setTasks([...tasks, task]);
      setTitle("");
      setDescription("");
      setRoleId("");
      setPriority("normal");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Aufgabe wirklich löschen?")) return;
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    setTasks(tasks.filter((t) => t.id !== id));
  }

  function getRoleName(id: string | null) {
    if (!id) return null;
    return roles.find((r) => r.id === id);
  }

  const priorityLabel: Record<string, string> = {
    high: "Hoch",
    normal: "Normal",
    low: "Niedrig",
  };

  const priorityColor: Record<string, string> = {
    high: "text-red-400",
    normal: "text-blue-400",
    low: "text-slate-400",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tagesaufgaben</h1>

      <div className="mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Quick-add form */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-400">Neue Aufgabe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Alle Rollen</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="high">Hoch</option>
            <option value="normal">Normal</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? "Wird hinzugefügt..." : "Hinzufügen"}
        </button>
      </form>

      {/* Task list */}
      {loading ? (
        <p className="text-slate-400">Laden...</p>
      ) : tasks.length === 0 ? (
        <p className="text-slate-400">Keine Aufgaben für diesen Tag.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const role = getRoleName(task.roleId);
            return (
              <div
                key={task.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white">{task.title}</p>
                      {role && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: (role.color || "#3b82f6") + "22",
                            color: role.color || "#3b82f6",
                          }}
                        >
                          {role.name}
                        </span>
                      )}
                      {!role && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-700 text-slate-300">
                          Alle
                        </span>
                      )}
                      <span className={`text-xs ${priorityColor[task.priority] || "text-slate-400"}`}>
                        {priorityLabel[task.priority] || task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                    )}

                    {/* Erledigt-von Anzeige */}
                    {task.completedBy.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.completedBy.map((cb, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-full"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {cb.employeeName}
                            <span className="text-green-600">
                              {new Date(cb.completedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Noch nicht erledigt</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex-shrink-0 px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
