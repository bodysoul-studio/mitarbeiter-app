import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/time-utils";
import { loadBsportOffers, adjustTime } from "@/lib/bsport";
import { redirect } from "next/navigation";
import { ShiftView } from "./shift-view";

type BuiltChecklist = {
  id: string;
  title: string;
  roleName: string;
  roleColor: string | null;
  items: {
    id: string;
    parentId: string | null;
    title: string;
    description: string | null;
    requiresPhoto: boolean;
    sortOrder: number;
    completed: boolean;
    photoUrl: string | null;
    completedByName: string | null;
  }[];
};

type BuiltTask = {
  title: string;
  description: string | null;
  requiresPhoto: boolean;
  completed: boolean;
  photoUrl: string | null;
  completedByName: string | null;
};

type BuiltSlot = {
  id: string;
  time: string | null;
  type: "checklist" | "task";
  checklist: BuiltChecklist | null;
  task: BuiltTask | null;
};

export default async function SchichtPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });
  if (!employee) redirect("/");

  const today = getTodayDate();

  let additionalRoleIds: string[] = [];
  try {
    additionalRoleIds = JSON.parse(employee.additionalRoles || "[]");
  } catch { additionalRoleIds = []; }
  const allRoleIds = [employee.roleId, ...additionalRoleIds.filter((id) => id !== employee.roleId)];

  const todayDate = new Date();
  const jsDay = todayDate.getDay();
  const weekday = jsDay === 0 ? 6 : jsDay - 1;

  const todaySchedule = await prisma.employeeSchedule.findFirst({
    where: { employeeId: employee.id, weekday },
  });
  const todayShiftType = todaySchedule?.shiftType || "";

  const dayTemplate = await prisma.dayTemplate.findFirst({
    where: {
      OR: [
        { roleId: { in: allRoleIds }, shiftType: todayShiftType },
        { roleId: { in: allRoleIds }, shiftType: "" },
        ...(todayShiftType ? [{ roleId: null, shiftType: todayShiftType }] : []),
        { roleId: null, shiftType: "" },
      ],
    },
    include: {
      role: { select: { id: true, name: true, color: true } },
      slots: {
        orderBy: { sortOrder: "asc" },
        include: {
          checklist: {
            include: {
              role: { select: { id: true, name: true, color: true } },
              items: { orderBy: { sortOrder: "asc" } },
            },
          },
          courseRoom: { include: { activities: true } },
        },
      },
    },
    orderBy: [
      { roleId: "desc" },
      { shiftType: "desc" },
    ],
  });

  let templateData: {
    id: string;
    name: string;
    slots: BuiltSlot[];
  } | null = null;

  if (dayTemplate) {
    // Collect completion lookups for checklist items + fixed slot tasks
    const allItemIds = dayTemplate.slots
      .flatMap((s) => s.checklist?.items || [])
      .map((i) => i.id);
    const fixedSlotIds = dayTemplate.slots
      .filter((s) => s.type === "task" && !s.courseRoomId)
      .map((s) => s.id);

    // Load bsport offers for today if we have course-room slots
    const hasCourseSlots = dayTemplate.slots.some((s) => s.courseRoomId);
    const todayOffers = hasCourseSlots
      ? await loadBsportOffers(today, today).catch(() => [])
      : [];

    // Compute expanded slot IDs (format: slotId:offerId)
    const expandedSlotIds: string[] = [];
    for (const s of dayTemplate.slots) {
      if (s.courseRoomId && s.courseRoom) {
        const activityNames = s.courseRoom.activities.map((a) => a.activityName);
        const matching = todayOffers.filter((o) => activityNames.includes(o.activityName));
        for (const offer of matching) {
          expandedSlotIds.push(`${s.id}:${offer.id}`);
        }
      }
    }

    const [completedItems, completedSlots] = await Promise.all([
      allItemIds.length > 0
        ? prisma.completedItem.findMany({
            where: { checklistItemId: { in: allItemIds }, date: today },
            include: { employee: { select: { name: true } } },
            orderBy: { completedAt: "asc" },
          })
        : Promise.resolve([]),
      fixedSlotIds.length + expandedSlotIds.length > 0
        ? prisma.completedSlotTask.findMany({
            where: {
              slotId: { in: [...fixedSlotIds, ...expandedSlotIds] },
              date: today,
            },
            include: { employee: { select: { name: true } } },
            orderBy: { completedAt: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const completedItemMap: Record<string, { photoUrl: string | null; completedByName: string }> = {};
    for (const ci of completedItems) {
      if (!completedItemMap[ci.checklistItemId]) {
        completedItemMap[ci.checklistItemId] = {
          photoUrl: ci.photoUrl,
          completedByName: ci.employee.name,
        };
      }
    }

    const completedSlotMap: Record<string, { photoUrl: string | null; completedByName: string }> = {};
    for (const cs of completedSlots) {
      if (!completedSlotMap[cs.slotId]) {
        completedSlotMap[cs.slotId] = {
          photoUrl: cs.photoUrl,
          completedByName: cs.employee.name,
        };
      }
    }

    const builtSlots: BuiltSlot[] = [];

    for (const s of dayTemplate.slots) {
      // Expand course-room-based task slots
      if (s.type === "task" && s.courseRoomId && s.courseRoom) {
        const activityNames = s.courseRoom.activities.map((a) => a.activityName);
        const matching = todayOffers
          .filter((o) => activityNames.includes(o.activityName))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (matching.length === 0) {
          builtSlots.push({
            id: `${s.id}:empty`,
            time: null,
            type: "task",
            checklist: null,
            task: {
              title: `${s.taskTitle || "Aufgabe"} — keine ${s.courseRoom.name}-Kurse heute`,
              description: null,
              requiresPhoto: false,
              completed: false,
              photoUrl: null,
              completedByName: null,
            },
          });
        } else {
          for (const offer of matching) {
            const slotKey = `${s.id}:${offer.id}`;
            const taskTime = adjustTime(offer.startTime, -s.leadMinutes);
            builtSlots.push({
              id: slotKey,
              time: taskTime,
              type: "task",
              checklist: null,
              task: {
                title: `${s.taskTitle || "Aufgabe"} (${offer.startTime} ${offer.activityName})`,
                description: s.taskDescription,
                requiresPhoto: s.taskRequiresPhoto,
                completed: !!completedSlotMap[slotKey],
                photoUrl: completedSlotMap[slotKey]?.photoUrl ?? null,
                completedByName: completedSlotMap[slotKey]?.completedByName ?? null,
              },
            });
          }
        }
        continue;
      }

      // Resolve time for checklist slots with courseRoomId: X min before first matching course
      let resolvedTime: string | null = s.time;
      let titleSuffix = "";
      if (s.type === "checklist" && s.courseRoomId && s.courseRoom) {
        const activityNames = s.courseRoom.activities.map((a) => a.activityName);
        const matching = todayOffers
          .filter((o) => activityNames.includes(o.activityName))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (matching.length > 0) {
          resolvedTime = adjustTime(matching[0].startTime, -s.leadMinutes);
        } else {
          resolvedTime = null;
          titleSuffix = ` — keine ${s.courseRoom.name}-Kurse heute`;
        }
      }

      // Normal slot (fixed time or checklist)
      builtSlots.push({
        id: s.id,
        time: resolvedTime,
        type: s.type as "checklist" | "task",
        checklist: s.checklist
          ? {
              id: s.checklist.id,
              title: s.checklist.title + titleSuffix,
              roleName: s.checklist.role?.name || "",
              roleColor: s.checklist.role?.color || null,
              items: s.checklist.items.map((item) => ({
                id: item.id,
                parentId: item.parentId,
                title: item.title,
                description: item.description,
                requiresPhoto: item.requiresPhoto,
                sortOrder: item.sortOrder,
                completed: !!completedItemMap[item.id],
                photoUrl: completedItemMap[item.id]?.photoUrl ?? null,
                completedByName: completedItemMap[item.id]?.completedByName ?? null,
              })),
            }
          : null,
        task:
          s.type === "task"
            ? {
                title: s.taskTitle || "",
                description: s.taskDescription,
                requiresPhoto: s.taskRequiresPhoto,
                completed: !!completedSlotMap[s.id],
                photoUrl: completedSlotMap[s.id]?.photoUrl ?? null,
                completedByName: completedSlotMap[s.id]?.completedByName ?? null,
              }
            : null,
      });
    }

    // Sort by time (slots without time stay at end, preserving order)
    builtSlots.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    templateData = {
      id: dayTemplate.id,
      name: dayTemplate.name,
      slots: builtSlots,
    };
  }

  // Fallback: load raw checklists when no template matches
  const rawChecklists = templateData
    ? []
    : await prisma.checklist.findMany({
        where: {
          roleId: { in: allRoleIds },
          isActive: true,
          OR: [
            { shiftType: "" },
            ...(todayShiftType ? [{ shiftType: todayShiftType }] : []),
          ],
        },
        include: {
          role: { select: { id: true, name: true, color: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      });

  const rawItemIds = rawChecklists.flatMap((cl) => cl.items.map((i) => i.id));
  const rawCompletedItems = rawItemIds.length > 0
    ? await prisma.completedItem.findMany({
        where: { checklistItemId: { in: rawItemIds }, date: today },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { completedAt: "asc" },
      })
    : [];

  const rawCompletedMap: Record<string, { photoUrl: string | null; completedByName: string }> = {};
  for (const item of rawCompletedItems) {
    if (!rawCompletedMap[item.checklistItemId]) {
      rawCompletedMap[item.checklistItemId] = {
        photoUrl: item.photoUrl,
        completedByName: item.employee.name,
      };
    }
  }

  const checklistsData = rawChecklists.map((cl) => ({
    id: cl.id,
    title: cl.title,
    startTime: cl.startTime,
    endTime: cl.endTime,
    sortOrder: cl.sortOrder,
    roleName: cl.role?.name || "",
    roleColor: cl.role?.color || null,
    items: cl.items.map((item) => ({
      id: item.id,
      parentId: item.parentId,
      title: item.title,
      description: item.description,
      requiresPhoto: item.requiresPhoto,
      sortOrder: item.sortOrder,
      completed: !!rawCompletedMap[item.id],
      photoUrl: rawCompletedMap[item.id]?.photoUrl ?? null,
      completedByName: rawCompletedMap[item.id]?.completedByName ?? null,
    })),
  }));

  return (
    <ShiftView
      checklists={checklistsData}
      template={templateData}
      employeeId={employee.id}
      employeeName={employee.name}
      today={today}
    />
  );
}
