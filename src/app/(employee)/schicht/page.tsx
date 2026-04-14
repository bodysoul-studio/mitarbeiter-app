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

  const checklists = await prisma.checklist.findMany({
    where: {
      roleId: employee.roleId,
      isActive: true,
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const completedItems = await prisma.completedItem.findMany({
    where: {
      employeeId: employee.id,
      date: today,
    },
  });

  const completedMap: Record<string, { photoUrl: string | null }> = {};
  for (const item of completedItems) {
    completedMap[item.checklistItemId] = { photoUrl: item.photoUrl };
  }

  const checklistsData = checklists.map((cl) => ({
    id: cl.id,
    title: cl.title,
    startTime: cl.startTime,
    endTime: cl.endTime,
    sortOrder: cl.sortOrder,
    items: cl.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      requiresPhoto: item.requiresPhoto,
      sortOrder: item.sortOrder,
      completed: !!completedMap[item.id],
      photoUrl: completedMap[item.id]?.photoUrl ?? null,
    })),
  }));

  return (
    <ShiftView
      checklists={checklistsData}
      employeeId={employee.id}
      today={today}
    />
  );
}
