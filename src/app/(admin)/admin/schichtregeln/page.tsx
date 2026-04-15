"use client";

import { useEffect, useState } from "react";

type Role = { id: string; name: string; color: string | null };
type Rule = {
  id: string;
  name: string;
  roleId: string;
  leadMinutes: number;
  lagMinutes: number;
  minStaff: number;
  windowStart: string;
  windowEnd: string;
  allDay: boolean;
  role: Role;
};

export default function SchichtregelnPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [leadMinutes, setLeadMinutes] = useState(30);
  const [lagMinutes, setLagMinutes] = useState(30);
  const [minStaff, setMinStaff] = useState(1);
  const [windowStart, setWindowStart] = useState("00:00");
  const [windowEnd, setWindowEnd] = useState("23:59");
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/shift-rules").then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
    ]).then(([rulesData, rolesData]) => {
      setRules(rulesData);
      setRoles(rolesData);
      setLoading(false);
    });
  }, []);

  function resetForm() {
    setEditId(null);
    setName("");
    setRoleId("");
    setLeadMinutes(30);
    setLagMinutes(30);
    setMinStaff(1);
    setWindowStart("00:00");
    setWindowEnd("23:59");
    setAllDay(false);
  }

  function startEdit(rule: Rule) {
    setEditId(rule.id);
    setName(rule.name);
    setRoleId(rule.roleId);
    setLeadMinutes(rule.leadMinutes);
    setLagMinutes(rule.lagMinutes);
    setMinStaff(rule.minStaff);
    setWindowStart(rule.windowStart);
    setWindowEnd(rule.windowEnd);
    setAllDay(rule.allDay);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) return;
    setSaving(true);

    const body = { name, roleId, leadMinutes, lagMinutes, minStaff, windowStart, windowEnd, allDay };

    if (editId) {
      const res = await fetch(`/api/admin/shift-rules/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setRules((prev) => prev.map((r) => (r.id === editId ? updated : r)));
        resetForm();
      }
    } else {
      const res = await fetch("/api/admin/shift-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const rule = await res.json();
        setRules((prev) => [...prev, rule]);
        resetForm();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Regel wirklich löschen?")) return;
    const res = await fetch(`/api/admin/shift-rules/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      if (editId === id) resetForm();
    }
  }

  if (loading) return <p className="text-slate-400 p-6">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Schichtregeln</h1>
      <p className="text-slate-400 text-sm mb-6">
        Definiere Regeln, wann welche Rolle eingeteilt wird — basierend auf dem Kursplan von bsport.
      </p>

      <form
        onSubmit={handleSave}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-400">
          {editId ? "Regel bearbeiten" : "Neue Regel"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              placeholder="z.B. Check-In Morgens"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rolle</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Rolle wählen...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Min. Besetzung</label>
            <input
              type="number"
              min={1}
              value={minStaff}
              onChange={(e) => setMinStaff(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-white">Ganztag</span>
            </label>
            <span className="text-xs text-slate-500">
              (Schicht geht vom ersten bis zum letzten Kurs des Tages — Zeitfenster wird ignoriert)
            </span>
          </div>
          {!allDay && (<>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Kurse ab (Zeitfenster)</label>
            <input
              type="time"
              value={windowStart}
              onChange={(e) => setWindowStart(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Kurse bis (Zeitfenster)</label>
            <input
              type="time"
              value={windowEnd}
              onChange={(e) => setWindowEnd(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          </>)}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vorlauf (Min.)</label>
              <input
                type="number"
                value={leadMinutes}
                onChange={(e) => setLeadMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nachlauf (Min.)</label>
              <input
                type="number"
                value={lagMinutes}
                onChange={(e) => setLagMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !roleId}
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

      {rules.length === 0 ? (
        <p className="text-slate-400">Noch keine Regeln definiert.</p>
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Alle ({rules.length})
            </button>
            {roles
              .filter((r) => rules.some((rule) => rule.roleId === r.id))
              .map((r) => {
                const count = rules.filter((rule) => rule.roleId === r.id).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveTab(r.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === r.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: r.color || "#6b7280" }}
                    />
                    {r.name} ({count})
                  </button>
                );
              })}
          </div>

          {/* Filtered rules */}
          <div className="space-y-2">
          {rules
            .filter((rule) => activeTab === "all" || rule.roleId === activeTab)
            .map((rule) => (
            <div
              key={rule.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: rule.role.color || "#6b7280" }}
                />
                <div>
                  <p className="font-medium text-white">
                    {rule.name || rule.role.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {rule.role.name} · {rule.allDay ? "Ganztag" : `Kurse ${rule.windowStart}–${rule.windowEnd}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rule.leadMinutes} Min. vorher → Kurse → {rule.lagMinutes} Min. nachher · {rule.minStaff}x Besetzung
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(rule)}
                  className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Beispiel-Konfiguration</h3>
        <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
          <li><strong>Check-In Morgens</strong>: Rolle Check-In, Kurse 00:00–13:59, 30 Min. Vorlauf, 15 Min. Nachlauf</li>
          <li><strong>Check-In Nachmittags</strong>: Rolle Check-In, Kurse 14:00–23:59, 30 Min. Vorlauf, 30 Min. Nachlauf</li>
          <li><strong>Runner</strong>: Rolle Runner, Kurse 14:00–23:59, 0 Min. Vorlauf, 15 Min. Nachlauf</li>
        </ul>
      </div>
    </div>
  );
}
