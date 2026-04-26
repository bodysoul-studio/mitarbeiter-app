import { prisma } from "@/lib/prisma";
import { SuggestionActions } from "./suggestion-actions";

function fmtDate(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VorschlaegePage() {
  const suggestions = await prisma.checklistSuggestion.findMany({
    include: {
      checklist: { select: { id: true, title: true, color: true, role: { select: { name: true, color: true } } } },
      parentItem: { select: { id: true, title: true } },
      employee: { select: { id: true, name: true, role: { select: { name: true, color: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Vorschläge</h1>
        <p className="text-sm text-slate-400 mt-1">
          Mitarbeiter können neue Punkte für Checklisten vorschlagen. Übernehmen fügt den Punkt direkt zur Checkliste hinzu.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-slate-800 border border-dashed border-slate-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">Noch keine Vorschläge vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div
              key={s.id}
              style={s.checklist.color ? { borderLeftWidth: 4, borderLeftColor: s.checklist.color } : undefined}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-700 text-slate-300">
                      {s.checklist.title}
                    </span>
                    {s.checklist.role && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (s.checklist.role.color || "#3b82f6") + "22",
                          color: s.checklist.role.color || "#3b82f6",
                        }}
                      >
                        {s.checklist.role.name}
                      </span>
                    )}
                    {s.parentItem && (
                      <span className="text-xs text-slate-500">
                        unter: <span className="text-slate-300">{s.parentItem.title}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-white">{s.title}</p>
                  {s.description && (
                    <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{s.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: (s.employee.role?.color || "#3b82f6") + "22",
                        color: s.employee.role?.color || "#3b82f6",
                      }}
                    >
                      {s.employee.name}
                    </span>
                    <span className="text-xs text-slate-500">{fmtDate(s.createdAt)}</span>
                  </div>
                </div>
                <SuggestionActions id={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
