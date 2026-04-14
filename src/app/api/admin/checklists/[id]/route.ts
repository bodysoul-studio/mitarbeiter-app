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
    description: z.string().optional(),
    requiresPhoto: z.boolean().optional(),
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

  // Delete old items and create new ones in a transaction
  const checklist = await prisma.$transaction(async (tx) => {
    await tx.checklistItem.deleteMany({ where: { checklistId: id } });

    return tx.checklist.update({
      where: { id },
      data: {
        title: body.title,
        roleId: body.roleId,
        startTime: body.startTime,
        endTime: body.endTime,
        items: {
          create: (body.items || []).map(
            (item, index: number) => ({
              title: item.title,
              description: item.description || null,
              requiresPhoto: item.requiresPhoto || false,
              sortOrder: index,
            })
          ),
        },
      },
      include: { items: true, role: true },
    });
  });

  return NextResponse.json(checklist);
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
