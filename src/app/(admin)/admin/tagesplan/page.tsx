import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteTemplateButton } from "./delete-button";
import { DuplicateTemplateButton } from "./duplicate-button";

const SHIFT_LABELS: Record<string, string> = {
  frueh: "Frühschicht",
  spaet: "Spätschicht",
  ganztag: "Ganztag",
};

export default async function TagesplanPage() {
  const templates = await prisma.dayTemplate.findMany({
    include: {
      role: { select: { id: true, name: true, color: true } },
      slots: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tagesbaukasten</h1>
          <p className="text-sm text-slate-400 mt-1">
            Strukturiere den Arbeitstag mit Checklisten und Einzel-Aufgaben in Reihenfolge.
          </p>
        </div>
        <Link
          href="/admin/tagesplan/neu"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Neuer Tagesplan
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="text-slate-400">Noch keine Tagespläne vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-white">{t.name}</p>
                  {t.role && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: (t.role.color || "#3b82f6") + "22", color: t.role.color || "#3b82f6" }}
                    >
                      {t.role.name}
                    </span>
                  )}
                  {t.shiftType && SHIFT_LABELS[t.shiftType] && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">
                      {SHIFT_LABELS[t.shiftType]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {t.slots.length} {t.slots.length === 1 ? "Block" : "Blöcke"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/tagesplan/${t.id}/vorschau`}
                  className="px-3 py-1 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 rounded transition-colors"
                >
                  Vorschau
                </Link>
                <Link
                  href={`/admin/tagesplan/${t.id}`}
                  className="px-3 py-1 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors"
                >
                  Bearbeiten
                </Link>
                <DuplicateTemplateButton id={t.id} />
                <DeleteTemplateButton id={t.id} name={t.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
