import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const date = req.nextUrl.searchParams.get("date");
  const employeeId = req.nextUrl.searchParams.get("employeeId");

  const where: Record<string, unknown> = {};

  if (from && to) {
    where.date = { gte: from, lte: to };
  } else if (date) {
    where.date = date;
  } else {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, "0");
    const d = today.getDate().toString().padStart(2, "0");
    where.date = `${y}-${m}-${d}`;
  }

  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.timeRecord.findMany({
    where,
    include: {
      employee: { select: { name: true } },
      pauses: { orderBy: { pauseStart: "asc" } },
    },
    orderBy: [{ date: "asc" }, { clockIn: "asc" }],
  });

  return NextResponse.json(records);
}
