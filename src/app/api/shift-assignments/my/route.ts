import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = req.nextUrl.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json(
      { error: "weekStart query parameter is required" },
      { status: 400 }
    );
  }

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
    where: {
      employeeId: session.sub,
      date: { in: dates },
    },
    include: {
      shiftTemplate: { select: { id: true, name: true, color: true } },
      role: { select: { id: true, name: true } },
      swapRequests: {
        select: {
          id: true,
          status: true,
          offeredByEmployeeId: true,
          acceptedByEmployeeId: true,
          createdAt: true,
          acceptedAt: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Load colleagues (all other assignments on the same days)
  const myDates = [...new Set(assignments.map((a) => a.date))];
  const colleaguesAssignments = myDates.length > 0
    ? await prisma.shiftAssignment.findMany({
        where: {
          date: { in: myDates },
          employeeId: { not: session.sub },
        },
        include: {
          employee: { select: { id: true, name: true } },
          role: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      })
    : [];

  // Group colleagues by date
  const colleaguesByDate: Record<string, { id: string; name: string; startTime: string; endTime: string; label: string | null; roleName: string; roleColor: string | null }[]> = {};
  for (const c of colleaguesAssignments) {
    if (!colleaguesByDate[c.date]) colleaguesByDate[c.date] = [];
    colleaguesByDate[c.date].push({
      id: c.employee.id,
      name: c.employee.name,
      startTime: c.startTime,
      endTime: c.endTime,
      label: c.label,
      roleName: c.role?.name || "",
      roleColor: c.role?.color || null,
    });
  }

  return NextResponse.json({ assignments, colleaguesByDate });
}
