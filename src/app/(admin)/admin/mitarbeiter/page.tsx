"use client";

import { useEffect, useState } from "react";

type Role = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  roleId: string;
  isActive: boolean;
  role: Role;
};

export default function MitarbeiterPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // New employee form
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/employees").then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
    ]).then(([emps, rls]) => {
      setEmployees(emps);
      setRoles(rls);
      if (rls.length > 0) setRoleId(rls[0].id);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roleId, pin }),
    });

    if (res.ok) {
      const emp = await res.json();
      setEmployees([...employees, emp]);
      setName("");
      setPin("");
    } else {
      alert("Fehler beim Erstellen");
    }
    setSaving(false);
  }

  async function toggleActive(emp: Employee) {
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });

    if (res.ok) {
      const updated = await res.json();
      setEmployees(employees.map((e) => (e.id === emp.id ? updated : e)));
    }
  }

  if (loading) return <p className="text-slate-400">Laden...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mitarbeiter</h1>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-400">
          Neuer Mitarbeiter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? "Wird erstellt..." : "Hinzufügen"}
        </button>
      </form>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">
                Name
              </th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">
                Rolle
              </th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">
                Status
              </th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-slate-700/50 last:border-0"
              >
                <td className="px-4 py-3 text-white">{emp.name}</td>
                <td className="px-4 py-3 text-slate-300">
                  {emp.role?.name || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${
                      emp.isActive
                        ? "bg-green-600/20 text-green-400"
                        : "bg-red-600/20 text-red-400"
                    }`}
                  >
                    {emp.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(emp)}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    {emp.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="text-slate-400 text-center py-6">
            Keine Mitarbeiter vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}
