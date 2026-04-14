import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify task exists
  const task = await prisma.dailyTask.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const completed = await prisma.completedTask.upsert({
    where: {
      taskId_employeeId: {
        taskId: id,
        employeeId: session.sub,
      },
    },
    update: {},
    create: {
      taskId: id,
      employeeId: session.sub,
    },
  });

  return NextResponse.json(completed);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.completedTask.delete({
      where: {
        taskId_employeeId: {
          taskId: id,
          employeeId: session.sub,
        },
      },
    });
  } catch {
    // Already deleted
  }

  return NextResponse.json({ ok: true });
}
