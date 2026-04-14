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

  return NextResponse.json(assignments);
}
