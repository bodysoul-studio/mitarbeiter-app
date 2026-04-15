import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createShiftAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  label: z.string().optional().nullable(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  roleId: z.string().min(1),
  shiftTemplateId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = req.nextUrl.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json(
      { error: "weekStart query parameter is required" },
      { status: 400 }
    );
  }

  // Calculate 7 days: weekStart (Monday) through Sunday
  const [year, month, day] = weekStart.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, day + i);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where: { date: { in: dates } },
    include: {
      employee: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      shiftTemplate: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createShiftAssignmentSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const assignment = await prisma.shiftAssignment.create({
    data: {
      employeeId: body.employeeId,
      date: body.date,
      label: body.label || null,
      shiftTemplateId: body.shiftTemplateId || null,
      startTime: body.startTime,
      endTime: body.endTime,
      roleId: body.roleId,
      notes: body.notes || null,
    },
    include: {
      employee: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      shiftTemplate: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
