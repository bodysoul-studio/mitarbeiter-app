import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  date: z.string().min(1),
  description: z.string().optional(),
  roleId: z.string().optional(),
  priority: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const tasks = await prisma.dailyTask.findMany({
    where: { date },
    include: {
      completedTasks: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const result = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    date: t.date,
    roleId: t.roleId,
    priority: t.priority,
    completedBy: t.completedTasks.map((ct) => ({
      employeeName: ct.employee.name,
      completedAt: ct.completedAt.toISOString(),
    })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createTaskSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const task = await prisma.dailyTask.create({
    data: {
      title: body.title,
      description: body.description || null,
      date: body.date,
      roleId: body.roleId || null,
      priority: body.priority || "normal",
    },
  });

  return NextResponse.json({ ...task, completedBy: [] }, { status: 201 });
}
