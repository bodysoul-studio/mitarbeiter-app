import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateChecklistSchema = z.object({
  title: z.string().min(1).max(500),
  roleId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    requiresPhoto: z.boolean().optional(),
    clientId: z.string().optional(),
    parentClientId: z.string().optional().nullable(),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: {
      role: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!checklist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(checklist);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = updateChecklistSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const items = body.items || [];

  // Delete old items, update checklist, recreate items with hierarchy
  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.deleteMany({ where: { checklistId: id } });
    await tx.checklist.update({
      where: { id },
      data: {
        title: body.title,
        roleId: body.roleId,
        startTime: body.startTime,
        endTime: body.endTime,
      },
    });
  });

  // Re-create items in two passes
  const clientIdToDbId = new Map<string, string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.parentClientId) {
      const created = await prisma.checklistItem.create({
        data: {
          checklistId: id,
          title: item.title,
          description: item.description || null,
          requiresPhoto: item.requiresPhoto || false,
          sortOrder: i,
        },
      });
      if (item.clientId) clientIdToDbId.set(item.clientId, created.id);
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.parentClientId) {
      const parentDbId = clientIdToDbId.get(item.parentClientId);
      if (!parentDbId) continue;
      await prisma.checklistItem.create({
        data: {
          checklistId: id,
          parentId: parentDbId,
          title: item.title,
          description: item.description || null,
          requiresPhoto: item.requiresPhoto || false,
          sortOrder: i,
        },
      });
    }
  }

  const full = await prisma.checklist.findUnique({
    where: { id },
    include: { items: true, role: true },
  });

  return NextResponse.json(full);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.checklist.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
