import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { loadBsportOffers, adjustTime } from "@/lib/bsport";
import Link from "next/link";
import { PreviewControls } from "./preview-controls";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function VorschauPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const targetDate = sp.date || fmtDate(new Date());

  const template = await prisma.dayTemplate.findUnique({
    where: { id },
    include: {
      role: { select: { name: true, color: true } },
      slots: {
        orderBy: { sortOrder: "asc" },
        include: {
          checklist: {
            include: {
              role: { select: { name: true, color: true } },
              items: { orderBy: { sortOrder: "asc" } },
            },
          },
          courseRoom: { include: { activities: true } },
        },
      },
    },
  });
  if (!template) notFound();

  // Load bsport offers for target date
  const hasCourseSlots = template.slots.some((s) => s.courseRoomId);
  const offers = hasCourseSlots
    ? await loadBsportOffers(targetDate, targetDate).catch(() => [])
    : [];

  type PreviewSlot = {
    id: string;
    time: string | null;
    type: "checklist" | "task";
    title: string;
    description: string | null;
    roleName?: string;
    roleColor?: string | null;
    itemCount?: number;
    meta?: string;
    items?: {
      id: string;
      parentId: string | null;
      title: string;
      description: string | null;
      requiresPhoto: boolean;
    }[];
    requiresPhoto?: boolean;
    isCourseRoom?: boolean;
    isEmpty?: boolean;
  };

  const builtSlots: PreviewSlot[] = [];

  for (const s of template.slots) {
    if (s.type === "task" && s.courseRoomId && s.courseRoom) {
      const activityNames = s.courseRoom.activities.map((a) => a.activityName);
      const matching = offers
        .filter((o) => activityNames.includes(o.activityName))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (matching.length === 0) {
        builtSlots.push({
          id: `${s.id}:empty`,
          time: null,
          type: "task",
          title: `${s.taskTitle || "Aufgabe"} — keine ${s.courseRoom.name}-Kurse an diesem Tag`,
          description: null,
          isCourseRoom: true,
          isEmpty: true,
        });
      } else {
        for (const offer of matching) {
          const taskTime = adjustTime(offer.startTime, -s.leadMinutes);
          builtSlots.push({
            id: `${s.id}:${offer.id}`,
            time: taskTime,
            type: "task",
            title: `${s.taskTitle || "Aufgabe"} (${offer.startTime} ${offer.activityName})`,
            description: s.taskDescription,
            requiresPhoto: s.taskRequiresPhoto,
            isCourseRoom: true,
            meta: `Vorlauf ${s.leadMinutes} Min. · Raum ${s.courseRoom.name}`,
          });
        }
      }
      continue;
    }

    if (s.type === "checklist" && s.checklist) {
      let resolvedTime: string | null = s.time;
      let extra = "";
      if (s.courseRoomId && s.courseRoom) {
        const activityNames = s.courseRoom.activities.map((a) => a.activityName);
        const matching = offers
          .filter((o) => activityNames.includes(o.activityName))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (matching.length > 0) {
          resolvedTime = adjustTime(matching[0].startTime, -s.leadMinutes);
          extra = ` (${s.leadMinutes} Min. vor ${matching[0].startTime})`;
        } else {
          resolvedTime = null;
          extra = ` — keine ${s.courseRoom.name}-Kurse heute`;
        }
      }
      builtSlots.push({
        id: s.id,
        time: resolvedTime,
        type: "checklist",
        title: s.checklist.title + extra,
        description: null,
        roleName: s.checklist.role?.name,
        roleColor: s.checklist.role?.color,
        itemCount: s.checklist.items.length,
        items: s.checklist.items.map((i) => ({
          id: i.id,
          parentId: i.parentId,
          title: i.title,
          description: i.description,
          requiresPhoto: i.requiresPhoto,
        })),
        isEmpty: s.courseRoomId ? resolvedTime === null : false,
      });
    } else {
      builtSlots.push({
        id: s.id,
        time: s.time,
        type: "task",
        title: s.taskTitle || "",
        description: s.taskDescription,
        requiresPhoto: s.taskRequiresPhoto,
      });
    }
  }

  builtSlots.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const SHIFT_LABELS: Record<string, string> = {
    frueh: "Frühschicht",
    spaet: "Spätschicht",
    ganztag: "Ganztag",
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/admin/tagesplan/${id}`}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Zurück
          </Link>
          <h1 className="text-2xl font-bold">Vorschau: {template.name}</h1>
        </div>
        <p className="text-sm text-slate-400">
          So sieht der Tagesablauf für den/die Mitarbeiter/in in der App aus.
        </p>
      </div>

      <PreviewControls currentDate={targetDate} templateId={id} />

      {/* Template info */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {template.role && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: (template.role.color || "#3b82f6") + "22",
                color: template.role.color || "#3b82f6",
              }}
            >
              {template.role.name}
            </span>
          )}
          {template.shiftType && SHIFT_LABELS[template.shiftType] && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">
              {SHIFT_LABELS[template.shiftType]}
            </span>
          )}
          <span className="text-sm text-slate-400 ml-auto">
            {builtSlots.length} Blöcke
            {hasCourseSlots && ` · ${offers.length} bsport-Kurse geladen`}
          </span>
        </div>
      </div>

      {/* Mobile preview frame */}
      <div className="max-w-md mx-auto bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        {/* Fake device header */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">{targetDate}</span>
          <span className="text-xs text-slate-500">Mitarbeiter-Ansicht</span>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-white">{template.name}</h2>
            <p className="text-xs text-slate-400">Tagesablauf · {builtSlots.length} Blöcke</p>
          </div>

          <p className="text-xs text-slate-500 text-center">Aktuelle Zeit: (live beim Mitarbeiter)</p>

          <div className="space-y-2">
            {builtSlots.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">Keine Blöcke</p>
            ) : (
              builtSlots.map((slot) => {
                if (slot.type === "checklist") {
                  return (
                    <div
                      key={slot.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {slot.time && (
                          <span className="text-sm text-slate-400 font-mono">{slot.time}</span>
                        )}
                        <span className="font-semibold text-white">{slot.title}</span>
                        {slot.roleName && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: (slot.roleColor || "#3b82f6") + "22",
                              color: slot.roleColor || "#3b82f6",
                            }}
                          >
                            {slot.roleName}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">{slot.itemCount} Punkte</span>
                      </div>
                      {slot.items && slot.items.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {slot.items
                            .filter((i) => !i.parentId)
                            .slice(0, 5)
                            .map((i) => (
                              <li key={i.id} className="text-xs text-slate-400 flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded border border-slate-600 flex-shrink-0" />
                                {i.title}
                              </li>
                            ))}
                          {slot.items.filter((i) => !i.parentId).length > 5 && (
                            <li className="text-xs text-slate-600 pl-4">+ weitere…</li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={slot.id}
                    className={`bg-slate-800 border rounded-xl p-3 ${
                      slot.isEmpty
                        ? "border-slate-700/50 opacity-60"
                        : slot.isCourseRoom
                        ? "border-purple-500/30"
                        : "border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 mt-0.5 rounded border-2 border-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {slot.time && (
                            <span className="text-sm text-slate-400 font-mono">{slot.time}</span>
                          )}
                          <span className={`font-medium ${slot.isEmpty ? "text-slate-500" : "text-white"}`}>
                            {slot.title}
                          </span>
                          {slot.isCourseRoom && !slot.isEmpty && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-400">
                              Pro Kurs
                            </span>
                          )}
                          {!slot.isCourseRoom && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-500/15 text-green-400">
                              Aufgabe
                            </span>
                          )}
                        </div>
                        {slot.description && (
                          <p className="text-xs text-slate-400 mt-1">{slot.description}</p>
                        )}
                        {slot.requiresPhoto && (
                          <p className="text-xs text-amber-400 mt-1">Foto erforderlich</p>
                        )}
                        {slot.meta && (
                          <p className="text-xs text-slate-500 mt-1">{slot.meta}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
