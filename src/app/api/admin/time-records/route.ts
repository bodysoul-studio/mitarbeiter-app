import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date =
    req.nextUrl.searchParams.get("date") ||
    new Date().toISOString().split("T")[0];
  const employeeId = req.nextUrl.searchParams.get("employeeId");

  const where: Record<string, unknown> = { date };
  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.timeRecord.findMany({
    where,
    include: {
      employee: { select: { name: true } },
      pauses: { orderBy: { pauseStart: "asc" } },
    },
    orderBy: { clockIn: "asc" },
  });

  return NextResponse.json(records);
}
