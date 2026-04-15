import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const scheduleSchema = z.object({
  employeeId: z.string().min(1),
  weekday: z.number().min(0).max(6),
  shiftType: z.string(), // "frueh", "spaet", "ganztag", "" (frei)
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await prisma.employeeSchedule.findMany({
    include: { employee: { select: { id: true, name: true } } },
    orderBy: [{ employee: { name: "asc" } }, { weekday: "asc" }],
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = scheduleSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // If shiftType is empty, delete the schedule entry (= frei)
  if (!body.shiftType) {
    await prisma.employeeSchedule.deleteMany({
      where: { employeeId: body.employeeId, weekday: body.weekday },
    });
    return NextResponse.json({ deleted: true });
  }

  const schedule = await prisma.employeeSchedule.upsert({
    where: {
      employeeId_weekday: {
        employeeId: body.employeeId,
        weekday: body.weekday,
      },
    },
    create: {
      employeeId: body.employeeId,
      weekday: body.weekday,
      shiftType: body.shiftType,
    },
    update: {
      shiftType: body.shiftType,
    },
  });

  return NextResponse.json(schedule);
}
