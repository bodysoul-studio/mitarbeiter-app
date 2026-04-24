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
  courseRoomId: z.string().optional().nullable(),
  leadMinutes: z.number().optional(),
  anchor: z.string().optional().nullable(),
  repeatTimes: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  roleId: z.string().optional().nullable(),
  shiftType: z.string().optional(),
  slots: z.array(slotSchema).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.dayTemplate.findMany({
    include: {
      role: { select: { id: true, name: true, color: true } },
      slots: {
        orderBy: { sortOrder: "asc" },
        include: {
          checklist: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const template = await prisma.dayTemplate.create({
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
          courseRoomId: s.courseRoomId || null,
          leadMinutes: s.leadMinutes ?? 15,
          anchor: s.anchor || null,
          repeatTimes: s.repeatTimes || null,
          color: s.color || null,
        })),
      },
    },
    include: {
      role: true,
      slots: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
