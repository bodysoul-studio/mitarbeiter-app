import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  shiftId: z.string().min(1),
  newEmployeeId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const shift = await prisma.shiftAssignment.findUnique({
    where: { id: body.shiftId },
    include: { employee: { select: { name: true } }, role: { select: { name: true } } },
  });

  if (!shift) {
    return NextResponse.json({ error: "Schicht nicht gefunden" }, { status: 404 });
  }

  if (shift.employeeId !== session.sub) {
    return NextResponse.json({ error: "Nicht deine Schicht" }, { status: 403 });
  }

  const newEmployee = await prisma.employee.findUnique({
    where: { id: body.newEmployeeId },
    select: { id: true, name: true },
  });

  if (!newEmployee) {
    return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  }

  const originalName = shift.employee.name;
  const originalEmployeeId = shift.originalEmployeeId || shift.employeeId;

  // Perform swap
  const updated = await prisma.shiftAssignment.update({
    where: { id: shift.id },
    data: {
      employeeId: body.newEmployeeId,
      wasSwapped: true,
      originalEmployeeId,
    },
  });

  // Delete any open swap requests for this shift
  await prisma.shiftSwapRequest.deleteMany({
    where: { shiftAssignmentId: shift.id, status: "open" },
  });

  // Create admin notification
  await prisma.adminNotification.create({
    data: {
      type: "shift_swap",
      message: `${originalName} hat die Schicht am ${shift.date} (${shift.startTime}–${shift.endTime}, ${shift.role?.name || ""}) an ${newEmployee.name} übergeben.`,
      meta: JSON.stringify({
        shiftId: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        fromEmployee: originalName,
        toEmployee: newEmployee.name,
      }),
    },
  });

  return NextResponse.json({ success: true, assignment: updated });
}
