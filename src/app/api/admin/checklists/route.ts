import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const checklistSchema = z.object({
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

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checklists = await prisma.checklist.findMany({
    where: { isActive: true },
    include: {
      role: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ role: { name: "asc" } }, { sortOrder: "asc" }],
  });

  return NextResponse.json(checklists);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = checklistSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const items = body.items || [];

  // Create checklist first
  const checklist = await prisma.checklist.create({
    data: {
      title: body.title,
      roleId: body.roleId,
      startTime: body.startTime,
      endTime: body.endTime,
    },
  });

  // Create items in two passes: parents first, then children
  const clientIdToDbId = new Map<string, string>();

  // Pass 1: create parents (no parentClientId)
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.parentClientId) {
      const created = await prisma.checklistItem.create({
        data: {
          checklistId: checklist.id,
          title: item.title,
          description: item.description || null,
          requiresPhoto: item.requiresPhoto || false,
          sortOrder: i,
        },
      });
      if (item.clientId) clientIdToDbId.set(item.clientId, created.id);
    }
  }

  // Pass 2: create children
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.parentClientId) {
      const parentDbId = clientIdToDbId.get(item.parentClientId);
      if (!parentDbId) continue;
      await prisma.checklistItem.create({
        data: {
          checklistId: checklist.id,
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
    where: { id: checklist.id },
    include: { items: true, role: true },
  });

  return NextResponse.json(full, { status: 201 });
}
