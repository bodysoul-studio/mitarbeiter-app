"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Skill = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  completed: boolean;
};

export function SkillsView({ skills: initial }: { skills: Skill[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState(initial);

  const completedCount = skills.filter((s) => s.completed).length;
  const totalCount = skills.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleSkill = useCallback(
    async (skillId: string, completed: boolean) => {
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, completed: !completed } : s))
      );

      try {
        if (completed) {
          await fetch(`/api/skills/${skillId}/complete`, { method: "DELETE" });
        } else {
          await fetch(`/api/skills/${skillId}/complete`, { method: "POST" });
        }
        router.refresh();
      } catch {
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, completed } : s))
        );
      }
    },
    [router]
  );

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Fähigkeiten</h1>
        <span className="text-sm text-slate-400">
          {completedCount}/{totalCount} gelernt
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 text-right">{progress}%</p>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Noch keine Fähigkeiten angelegt</p>
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((cat) => {
            const catSkills = grouped[cat];
            const catCompleted = catSkills.filter((s) => s.completed).length;

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {cat}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {catCompleted}/{catSkills.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {catSkills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id, skill.completed)}
                      className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex items-start gap-3 hover:border-slate-600 transition-colors"
                    >
                      <div
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          skill.completed
                            ? "bg-purple-500 border-purple-500"
                            : "border-slate-500"
                        }`}
                      >
                        {skill.completed && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            skill.completed
                              ? "text-slate-500 line-through"
                              : "text-white"
                          }`}
                        >
                          {skill.title}
                        </p>
                        {skill.description && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {skill.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
