import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load all parent items with their children grouped by checklist
  const checklists = await prisma.checklist.findMany({
    where: { isActive: true },
    include: {
      role: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ role: { name: "asc" } }, { title: "asc" }],
  });

  const entries = checklists.flatMap((cl) => {
    const parents = cl.items.filter((i) => !i.parentId);
    return parents.map((parent) => {
      const children = cl.items.filter((i) => i.parentId === parent.id);
      return {
        parentId: parent.id,
        parentTitle: parent.title,
        parentDescription: parent.description,
        parentRequiresPhoto: parent.requiresPhoto,
        checklistId: cl.id,
        checklistTitle: cl.title,
        roleName: cl.role?.name || "",
        children: children.map((c) => ({
          title: c.title,
          description: c.description,
          requiresPhoto: c.requiresPhoto,
        })),
      };
    });
  });

  return NextResponse.json(entries);
}
