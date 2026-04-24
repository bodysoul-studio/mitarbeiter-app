import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const original = await prisma.checklist.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create new checklist
  const copy = await prisma.checklist.create({
    data: {
      title: `${original.title} (Kopie)`,
      roleId: original.roleId,
      shiftType: original.shiftType,
      startTime: original.startTime,
      endTime: original.endTime,
      sortOrder: original.sortOrder,
    },
  });

  // Re-create items preserving parent/child hierarchy
  const idMap = new Map<string, string>();

  // Pass 1: parents
  for (const item of original.items) {
    if (!item.parentId) {
      const created = await prisma.checklistItem.create({
        data: {
          checklistId: copy.id,
          title: item.title,
          description: item.description,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        },
      });
      idMap.set(item.id, created.id);
    }
  }

  // Pass 2: children
  for (const item of original.items) {
    if (item.parentId) {
      const newParentId = idMap.get(item.parentId);
      if (!newParentId) continue;
      await prisma.checklistItem.create({
        data: {
          checklistId: copy.id,
          parentId: newParentId,
          title: item.title,
          description: item.description,
          requiresPhoto: item.requiresPhoto,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  return NextResponse.json(copy, { status: 201 });
}
