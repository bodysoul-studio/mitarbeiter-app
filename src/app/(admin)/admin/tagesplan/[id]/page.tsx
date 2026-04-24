import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DayTemplateBuilder } from "../builder";

export default async function EditTagesplanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, roles, checklists, courseRooms] = await Promise.all([
    prisma.dayTemplate.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: { sortOrder: "asc" },
          include: { checklist: { select: { id: true, title: true } } },
        },
      },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.checklist.findMany({
      where: { isActive: true },
      include: { role: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: [{ role: { name: "asc" } }, { title: "asc" }],
    }),
    prisma.courseRoom.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!template) notFound();

  const checklistRefs = checklists.map((c) => ({
    id: c.id,
    title: c.title,
    roleId: c.roleId,
    roleName: c.role?.name,
    itemCount: c._count.items,
  }));
  const roomRefs = courseRooms.map((r) => ({ id: r.id, name: r.name, color: r.color }));

  const templateData = {
    id: template.id,
    name: template.name,
    roleId: template.roleId,
    shiftType: template.shiftType,
    slots: template.slots.map((s) => ({
      clientId: s.id,
      time: s.time || "",
      type: s.type as "checklist" | "task",
      checklistId: s.checklistId,
      checklistTitle: s.checklist?.title,
      taskTitle: s.taskTitle || "",
      taskDescription: s.taskDescription || "",
      taskRequiresPhoto: s.taskRequiresPhoto,
      courseRoomId: s.courseRoomId,
      leadMinutes: s.leadMinutes,
      anchor: ((s.anchor as "first" | "last" | "each" | null) || "fixed") as "fixed" | "first" | "last" | "each",
    })),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tagesplan bearbeiten</h1>
      <DayTemplateBuilder roles={roles} checklists={checklistRefs} courseRooms={roomRefs} template={templateData} />
    </div>
  );
}
