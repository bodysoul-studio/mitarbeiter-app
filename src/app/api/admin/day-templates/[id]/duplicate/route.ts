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

  const original = await prisma.dayTemplate.findUnique({
    where: { id },
    include: { slots: { orderBy: { sortOrder: "asc" } } },
  });
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const copy = await prisma.dayTemplate.create({
    data: {
      name: `${original.name} (Kopie)`,
      roleId: original.roleId,
      shiftType: original.shiftType,
      slots: {
        create: original.slots.map((s) => ({
          sortOrder: s.sortOrder,
          time: s.time,
          type: s.type,
          checklistId: s.checklistId,
          taskTitle: s.taskTitle,
          taskDescription: s.taskDescription,
          taskRequiresPhoto: s.taskRequiresPhoto,
          courseRoomId: s.courseRoomId,
          leadMinutes: s.leadMinutes,
          anchor: s.anchor,
          repeatTimes: s.repeatTimes,
          color: s.color,
        })),
      },
    },
  });

  return NextResponse.json(copy, { status: 201 });
}
