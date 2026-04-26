import { prisma } from "@/lib/prisma";
import { FilterBar } from "./filter-bar";

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

type Entry = {
  id: string;
  completedAt: Date;
  employeeId: string;
  employeeName: string;
  roleName: string | null;
  roleColor: string | null;
  title: string;
  parent: string | null;
  source: "checklist" | "task";
  photoUrl: string | null;
};

export default async function TagesuebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; employeeId?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date || todayDate();
  const employeeId = sp.employeeId || "";

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const employeeFilter = employeeId ? { employeeId } : {};

  const [completedItems, completedSlotTasks] = await Promise.all([
    prisma.completedItem.findMany({
      where: { date, ...employeeFilter },
      include: {
        employee: { include: { role: { select: { name: true, color: true } } } },
        checklistItem: {
          include: {
            checklist: { select: { title: true, color: true } },
            parent: { select: { title: true } },
          },
        },
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.completedSlotTask.findMany({
      where: { date, ...employeeFilter },
      include: {
        employee: { include: { role: { select: { name: true, color: true } } } },
        slot: {
          include: {
            checklist: { select: { title: true } },
          },
        },
      },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  const entries: Entry[] = [];

  for (const c of completedItems) {
    entries.push({
      id: `i-${c.id}`,
      completedAt: c.completedAt,
      employeeId: c.employeeId,
      employeeName: c.employee.name,
      roleName: c.employee.role?.name || null,
      roleColor: c.employee.role?.color || null,
      title: c.checklistItem.title,
      parent: c.checklistItem.parent?.title || c.checklistItem.checklist.title,
      source: "checklist",
      photoUrl: c.photoUrl,
    });
  }

  for (const c of completedSlotTasks) {
    const slotTitle =
      c.slot.taskTitle ||
      c.slot.checklist?.title ||
      "Aufgabe";
    entries.push({
      id: `s-${c.id}`,
      completedAt: c.completedAt,
      employeeId: c.employeeId,
      employeeName: c.employee.name,
      roleName: c.employee.role?.name || null,
      roleColor: c.employee.role?.color || null,
      title: slotTitle,
      parent: "Tagesplan",
      source: "task",
      photoUrl: c.photoUrl,
    });
  }

  entries.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  // Group by hour for compact timeline
  const byHour: Record<string, Entry[]> = {};
  for (const e of entries) {
    const h = e.completedAt.getHours().toString().padStart(2, "0");
    (byHour[h] ||= []).push(e);
  }

  // Per-employee summary
  const empCounts = new Map<string, { name: string; roleColor: string | null; count: number }>();
  for (const e of entries) {
    const cur = empCounts.get(e.employeeId);
    if (cur) cur.count += 1;
    else empCounts.set(e.employeeId, { name: e.employeeName, roleColor: e.roleColor, count: 1 });
  }
  const empSummary = Array.from(empCounts.values()).sort((a, b) => b.count - a.count);

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tagesübersicht</h1>
        <p className="text-sm text-slate-400 mt-1">
          Wer hat wann welche Aufgabe abgehakt — chronologisch.
        </p>
      </div>

      <FilterBar date={date} employeeId={employeeId} employees={employees} />

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm text-slate-400">{dateLabel}</span>
        <span className="text-sm text-slate-300 font-medium">
          {entries.length} {entries.length === 1 ? "Erledigung" : "Erledigungen"}
        </span>
      </div>

      {empSummary.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4 flex flex-wrap gap-2">
          {empSummary.map((e) => (
            <span
              key={e.name}
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: (e.roleColor || "#3b82f6") + "22",
                color: e.roleColor || "#3b82f6",
              }}
            >
              {e.name} · {e.count}
            </span>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-slate-800 border border-dashed border-slate-700 rounded-lg p-8 text-center">
          <p className="text-slate-400">Keine Erledigungen für diesen Tag.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byHour).map(([hour, items]) => (
            <div key={hour}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-slate-500">{hour}:00</span>
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-1">
                {items.map((e) => (
                  <div
                    key={e.id}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-start gap-3"
                  >
                    <span className="text-sm font-mono text-slate-400 w-12 flex-shrink-0">
                      {fmtTime(e.completedAt)}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{
                        backgroundColor: (e.roleColor || "#3b82f6") + "22",
                        color: e.roleColor || "#3b82f6",
                      }}
                    >
                      {e.employeeName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{e.title}</p>
                      {e.parent && (
                        <p className="text-xs text-slate-500">{e.parent}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        e.source === "checklist"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-green-500/15 text-green-400"
                      }`}
                    >
                      {e.source === "checklist" ? "Checkliste" : "Aufgabe"}
                    </span>
                    {e.photoUrl && (
                      <a
                        href={e.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.photoUrl}
                          alt="Foto"
                          className="w-12 h-12 object-cover rounded border border-slate-600"
                        />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
