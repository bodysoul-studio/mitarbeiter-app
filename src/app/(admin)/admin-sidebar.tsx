"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavGroup = {
  label: string;
  icon: string;
  items: { href: string; label: string }[];
};

const navGroups: (NavGroup | { href: string; label: string; icon: string })[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  {
    label: "Inhalte",
    icon: "📋",
    items: [
      { href: "/admin/checklisten", label: "Checklisten" },
      { href: "/admin/aufgaben", label: "Aufgaben" },
      { href: "/admin/faehigkeiten", label: "Fähigkeiten" },
      { href: "/admin/notfaelle", label: "Notfälle" },
    ],
  },
  {
    label: "Team",
    icon: "👥",
    items: [
      { href: "/admin/mitarbeiter", label: "Mitarbeiter" },
      { href: "/admin/rollen", label: "Rollen" },
    ],
  },
  {
    label: "Schichten",
    icon: "📅",
    items: [
      { href: "/admin/schichtplan", label: "Schichtplan" },
      { href: "/admin/schichtregeln", label: "Schichtregeln" },
    ],
  },
];

function isGroup(item: (typeof navGroups)[number]): item is NavGroup {
  return "items" in item;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // Auto-open the group that contains the current path
    const set = new Set<string>();
    for (const g of navGroups) {
      if (isGroup(g) && g.items.some((i) => pathname.startsWith(i.href))) {
        set.add(g.label);
      }
    }
    return set;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
        aria-label="Menü öffnen"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 border-r border-slate-700 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-400">Body &amp; Soul</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navGroups.map((item) => {
            if (!isGroup(item)) {
              // Simple link (Dashboard)
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            // Group with sub-items
            const groupOpen = openGroups.has(item.label);
            const groupActive = item.items.some((i) => pathname.startsWith(i.href));

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    groupActive ? "text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-500 transition-transform ${groupOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {groupOpen && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.items.map((sub) => {
                      const isActive = pathname.startsWith(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
          >
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
