import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/time-utils";
import { redirect } from "next/navigation";
import { ShiftView } from "./shift-view";

export default async function SchichtPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });
  if (!employee) redirect("/");

  const today = getTodayDate();

  // Include additional roles
  let additionalRoleIds: string[] = [];
  try {
    additionalRoleIds = JSON.parse(employee.additionalRoles || "[]");
  } catch { additionalRoleIds = []; }
  const allRoleIds = [employee.roleId, ...additionalRoleIds.filter((id) => id !== employee.roleId)];

  // Today's weekday (0=Mo, 6=So)
  const todayDate = new Date();
  const jsDay = todayDate.getDay();
  const weekday = jsDay === 0 ? 6 : jsDay - 1;

  // Employee's shift type for today (if any)
  const todaySchedule = await prisma.employeeSchedule.findFirst({
    where: { employeeId: employee.id, weekday },
  });
  const todayShiftType = todaySchedule?.shiftType || "";

  // Try to find a matching day template
  // Priority: exact match (role + shift) > role match any shift > no role + exact shift > no role + any shift
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
        },
      },
    },
    orderBy: [
      // Prefer templates with more specific matches (role set + shift set)
      { roleId: "desc" },
      { shiftType: "desc" },
    ],
  });

  let templateData: null | {
    id: string;
    name: string;
    slots: {
      id: string;
      time: string | null;
      type: "checklist" | "task";
      checklist: {
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
      } | null;
      task: {
        title: string;
        description: string | null;
        requiresPhoto: boolean;
        completed: boolean;
        photoUrl: string | null;
        completedByName: string | null;
      } | null;
    }[];
  } = null;

  if (dayTemplate) {
    // Collect all checklist item IDs for completion lookup
    const allItemIds = dayTemplate.slots
      .flatMap((s) => s.checklist?.items || [])
      .map((i) => i.id);

    const slotIds = dayTemplate.slots.filter((s) => s.type === "task").map((s) => s.id);

    const [completedItems, completedSlots] = await Promise.all([
      allItemIds.length > 0
        ? prisma.completedItem.findMany({
            where: { checklistItemId: { in: allItemIds }, date: today },
            include: { employee: { select: { name: true } } },
            orderBy: { completedAt: "asc" },
          })
        : Promise.resolve([]),
      slotIds.length > 0
        ? prisma.completedSlotTask.findMany({
            where: { slotId: { in: slotIds }, date: today },
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

    templateData = {
      id: dayTemplate.id,
      name: dayTemplate.name,
      slots: dayTemplate.slots.map((s) => ({
        id: s.id,
        time: s.time,
        type: s.type as "checklist" | "task",
        checklist: s.checklist
          ? {
              id: s.checklist.id,
              title: s.checklist.title,
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
      })),
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
