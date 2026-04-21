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

  const checklists = await prisma.checklist.findMany({
    where: {
      roleId: { in: allRoleIds },
      isActive: true,
    },
    include: {
      role: { select: { id: true, name: true, color: true } },
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Load ALL completions for today (from anyone) for the items in these checklists
  const itemIds = checklists.flatMap((cl) => cl.items.map((i) => i.id));
  const completedItems = await prisma.completedItem.findMany({
    where: {
      checklistItemId: { in: itemIds },
      date: today,
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
    orderBy: { completedAt: "asc" },
  });

  // Map: itemId → { photoUrl, completedByName }
  const completedMap: Record<string, { photoUrl: string | null; completedByName: string }> = {};
  for (const item of completedItems) {
    // First completion wins for the display
    if (!completedMap[item.checklistItemId]) {
      completedMap[item.checklistItemId] = {
        photoUrl: item.photoUrl,
        completedByName: item.employee.name,
      };
    } else if (item.photoUrl && !completedMap[item.checklistItemId].photoUrl) {
      // Upgrade with photo if later completion has one
      completedMap[item.checklistItemId].photoUrl = item.photoUrl;
    }
  }

  const checklistsData = checklists.map((cl) => ({
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
      completed: !!completedMap[item.id],
      photoUrl: completedMap[item.id]?.photoUrl ?? null,
      completedByName: completedMap[item.id]?.completedByName ?? null,
    })),
  }));

  return (
    <ShiftView
      checklists={checklistsData}
      employeeId={employee.id}
      employeeName={employee.name}
      today={today}
    />
  );
}
