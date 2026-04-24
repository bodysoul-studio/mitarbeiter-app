import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteChecklistButton } from "./delete-button";
import { DuplicateChecklistButton } from "./duplicate-button";

const SHIFT_LABELS: Record<string, string> = {
  frueh: "Frühschicht",
  spaet: "Spätschicht",
  ganztag: "Ganztag",
};

export default async function ChecklistenPage() {
  const checklists = await prisma.checklist.findMany({
    where: { isActive: true },
    include: {
      role: true,
      items: true,
    },
    orderBy: [{ role: { name: "asc" } }, { sortOrder: "asc" }],
  });

  // Group by role
  const grouped: Record<string, typeof checklists> = {};
  for (const cl of checklists) {
    const roleName = cl.role.name;
    if (!grouped[roleName]) grouped[roleName] = [];
    grouped[roleName].push(cl);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Checklisten</h1>
        <Link
          href="/admin/checklisten/neu"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Neue Checkliste
        </Link>
      </div>

      {Object.keys(grouped).length === 0 && (
        <p className="text-slate-400">Keine Checklisten vorhanden.</p>
      )}

      {Object.entries(grouped).map(([roleName, items]) => (
        <div key={roleName} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-300 mb-3">
            {roleName}
          </h2>
          <div className="space-y-2">
            {items.map((cl) => (
              <div
                key={cl.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{cl.title}</p>
                    {cl.shiftType && SHIFT_LABELS[cl.shiftType] && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">
                        {SHIFT_LABELS[cl.shiftType]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    {cl.startTime} - {cl.endTime} &middot; {cl.items.length}{" "}
                    {cl.items.length === 1 ? "Punkt" : "Punkte"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/checklisten/${cl.id}`}
                    className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                  >
                    Bearbeiten
                  </Link>
                  <DuplicateChecklistButton id={cl.id} />
                  <DeleteChecklistButton id={cl.id} title={cl.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
