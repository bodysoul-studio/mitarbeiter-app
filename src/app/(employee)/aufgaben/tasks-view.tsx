"use client";

import { useState, useCallback } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  completed: boolean;
};

export function TasksView({
  tasks: initial,
  employeeId,
}: {
  tasks: Task[];
  employeeId: string;
}) {
  const [tasks, setTasks] = useState(initial);

  const completedCount = tasks.filter((t) => t.completed).length;

  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !completed } : t))
    );

    try {
      if (completed) {
        await fetch(`/api/tasks/${taskId}/complete`, { method: "DELETE" });
      } else {
        await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      }
    } catch {
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
      );
    }
  }, []);

  const priorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "text-red-400";
      case "low":
        return "text-slate-500";
      default:
        return "text-slate-400";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case "high":
        return "Hoch";
      case "low":
        return "Niedrig";
      default:
        return "Normal";
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tagesaufgaben</h1>
        <span className="text-sm text-slate-400">
          {completedCount}/{tasks.length} erledigt
        </span>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Keine Aufgaben für heute</p>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3"
          >
            <button
              onClick={() => toggleTask(task.id, task.completed)}
              className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                task.completed
                  ? "bg-blue-500 border-blue-500"
                  : "border-slate-500 hover:border-blue-400"
              }`}
            >
              {task.completed && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p
                className={`font-medium ${
                  task.completed ? "text-slate-500 line-through" : "text-white"
                }`}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-slate-400 mt-0.5">{task.description}</p>
              )}
              <span className={`text-xs ${priorityColor(task.priority)}`}>
                {priorityLabel(task.priority)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
