import { prisma } from "@/lib/prisma";
import { DayTemplateBuilder } from "../builder";

export default async function NeuerTagesplanPage() {
  const [roles, checklists, courseRooms] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.checklist.findMany({
      where: { isActive: true },
      include: { role: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: [{ role: { name: "asc" } }, { title: "asc" }],
    }),
    prisma.courseRoom.findMany({ orderBy: { name: "asc" } }),
  ]);

  const checklistRefs = checklists.map((c) => ({
    id: c.id,
    title: c.title,
    roleId: c.roleId,
    roleName: c.role?.name,
    itemCount: c._count.items,
    color: c.color,
  }));
  const roomRefs = courseRooms.map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Neuer Tagesplan</h1>
      <DayTemplateBuilder roles={roles} checklists={checklistRefs} courseRooms={roomRefs} />
    </div>
  );
}
