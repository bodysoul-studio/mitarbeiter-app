"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileView({
  name,
  roleName,
  roleColor,
}: {
  name: string;
  roleName: string;
  roleColor: string;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      alert("Fehler beim Abmelden");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Profil</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col items-center gap-4">
        {/* Avatar circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
          style={{ backgroundColor: roleColor }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{name}</h2>
          <span
            className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: roleColor }}
          >
            {roleName}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 rounded-xl font-medium transition-colors"
      >
        {loggingOut ? "Abmelden..." : "Abmelden"}
      </button>
    </div>
  );
}
