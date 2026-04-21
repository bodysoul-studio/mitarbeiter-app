import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shiftId = req.nextUrl.searchParams.get("shiftId");
  if (!shiftId) {
    return NextResponse.json({ error: "shiftId erforderlich" }, { status: 400 });
  }

  const shift = await prisma.shiftAssignment.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return NextResponse.json({ error: "Schicht nicht gefunden" }, { status: 404 });
  }

  if (shift.employeeId !== session.sub) {
    return NextResponse.json({ error: "Nicht deine Schicht" }, { status: 403 });
  }

  // All active employees with matching role (primary or additional), excluding self
  const allEmployees = await prisma.employee.findMany({
    where: { isActive: true, id: { not: session.sub } },
    include: { role: true },
  });

  const matching = allEmployees.filter((e) => {
    let additional: string[] = [];
    try { additional = JSON.parse(e.additionalRoles || "[]"); } catch { additional = []; }
    return e.roleId === shift.roleId || additional.includes(shift.roleId);
  });

  // Load all shifts on same date for these employees to show what they already have
  const sameDayShifts = await prisma.shiftAssignment.findMany({
    where: {
      date: shift.date,
      employeeId: { in: matching.map((e) => e.id) },
    },
  });

  const candidates = matching.map((e) => {
    const existingShifts = sameDayShifts
      .filter((s) => s.employeeId === e.id)
      .map((s) => ({
        label: s.label,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    // Check for time conflict with the shift being offered
    const hasConflict = existingShifts.some((s) =>
      s.startTime < shift.endTime && s.endTime > shift.startTime
    );

    return {
      id: e.id,
      name: e.name,
      roleName: e.role.name,
      roleColor: e.role.color,
      existingShifts,
      hasConflict,
    };
  });

  // Sort: no shifts first, then by name
  candidates.sort((a, b) => {
    if (a.existingShifts.length !== b.existingShifts.length) {
      return a.existingShifts.length - b.existingShifts.length;
    }
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(candidates);
}
