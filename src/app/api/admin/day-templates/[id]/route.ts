import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const slotSchema = z.object({
  type: z.enum(["checklist", "task"]),
  time: z.string().optional().nullable(),
  checklistId: z.string().optional().nullable(),
  taskTitle: z.string().optional().nullable(),
  taskDescription: z.string().optional().nullable(),
  taskRequiresPhoto: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  roleId: z.string().optional().nullable(),
  shiftType: z.string().optional(),
  slots: z.array(slotSchema).optional(),
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
  const template = await prisma.dayTemplate.findUnique({
    where: { id },
    include: {
      role: true,
      slots: {
        orderBy: { sortOrder: "asc" },
        include: { checklist: { select: { id: true, title: true } } },
      },
    },
  });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(template);
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
    body = updateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.dayTemplateSlot.deleteMany({ where: { dayTemplateId: id } });
    await tx.dayTemplate.update({
      where: { id },
      data: {
        name: body.name,
        roleId: body.roleId || null,
        shiftType: body.shiftType || "",
        slots: {
          create: (body.slots || []).map((s, idx) => ({
            sortOrder: idx,
            time: s.time || null,
            type: s.type,
            checklistId: s.type === "checklist" ? s.checklistId || null : null,
            taskTitle: s.type === "task" ? s.taskTitle || null : null,
            taskDescription: s.type === "task" ? s.taskDescription || null : null,
            taskRequiresPhoto: s.type === "task" ? !!s.taskRequiresPhoto : false,
          })),
        },
      },
    });
  });

  const full = await prisma.dayTemplate.findUnique({
    where: { id },
    include: {
      role: true,
      slots: { orderBy: { sortOrder: "asc" }, include: { checklist: { select: { id: true, title: true } } } },
    },
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
  await prisma.dayTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
