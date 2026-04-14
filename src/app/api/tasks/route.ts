import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const roleId = searchParams.get("roleId");

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const where: Record<string, unknown> = { date };
  if (roleId) {
    where.OR = [{ roleId }, { roleId: null }];
  }

  const tasks = await prisma.dailyTask.findMany({
    where,
    include: {
      completedTasks: session.type === "employee" ? {
        where: { employeeId: session.sub },
      } : true,
    },
    orderBy: { createdAt: "asc" },
  });

  const result = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    date: t.date,
    roleId: t.roleId,
    priority: t.priority,
    completed: t.completedTasks.length > 0,
  }));

  return NextResponse.json(result);
}
