"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";

type EmployeeInfo = {
  id: string;
  name: string;
  roleName: string;
  roleColor: string;
  roleId: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  completed: boolean;
  completedBy: string[];
};

const tabs = [
  {
    href: "/schicht",
    label: "Schicht",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#3b82f6" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/zeiterfassung",
    label: "Zeit",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#3b82f6" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/schichtplan",
    label: "Plan",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#3b82f6" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/faehigkeiten",
    label: "Skills",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#a855f7" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: "/notfaelle",
    label: "Notfälle",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#ef4444" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={active ? "#3b82f6" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export function EmployeeShell({
  employeeInfo,
  tasks: initialTasks,
  children,
}: {
  employeeInfo: EmployeeInfo;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const remainingCount = tasks.filter((t) => !t.completed).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !completed } : t))
    );

    try {
      if (completed) {
        await fetch(`/api/tasks/${taskId}/complete`, { method: "DELETE" });
      } else {
        await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      }
      router.refresh();
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
      );
    }
  }, [router]);

  const priorityDot = (p: string) => {
    switch (p) {
      case "high":
        return "bg-red-400";
      case "low":
        return "bg-slate-500";
      default:
        return "bg-blue-400";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">{employeeInfo.name}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: employeeInfo.roleColor + "22", color: employeeInfo.roleColor }}
            >
              {employeeInfo.roleName}
            </span>
          </div>

          {/* Aufgaben-Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm text-slate-300">Aufgaben</span>
              {remainingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] font-bold flex items-center justify-center">
                  {remainingCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Tagesaufgaben</h3>
                  <span className="text-xs text-slate-400">
                    {tasks.filter((t) => t.completed).length}/{tasks.length} erledigt
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      Keine Aufgaben heute
                    </p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task.id, task.completed)}
                          className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
                        >
                          <div
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed
                                ? "bg-blue-500 border-blue-500"
                                : "border-slate-500"
                            }`}
                          >
                            {task.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  task.completed ? "text-slate-500 line-through" : "text-white"
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot(task.priority)}`} />
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {task.description}
                              </p>
                            )}
                            {task.completedBy.length > 0 && (
                              <p className="text-xs text-green-400 mt-0.5">
                                Erledigt von {task.completedBy.join(", ")}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.icon(isActive)}
                <span className="text-xs font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
        <script
          id="employee-info"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(employeeInfo) }}
        />
      </nav>
    </div>
  );
}
