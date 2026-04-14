import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const completed = await prisma.completedSkill.upsert({
    where: {
      skillId_employeeId: { skillId: id, employeeId: session.sub },
    },
    create: { skillId: id, employeeId: session.sub },
    update: {},
  });

  return NextResponse.json(completed);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.completedSkill.deleteMany({
    where: { skillId: id, employeeId: session.sub },
  });

  return NextResponse.json({ success: true });
}
