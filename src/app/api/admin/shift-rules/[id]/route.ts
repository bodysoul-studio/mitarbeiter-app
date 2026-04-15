import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, roleId, leadMinutes, lagMinutes, minStaff, windowStart, windowEnd, allDay } = await req.json();

  const rule = await prisma.shiftRule.update({
    where: { id },
    data: {
      name: name ?? undefined,
      roleId: roleId ?? undefined,
      leadMinutes: leadMinutes ?? undefined,
      lagMinutes: lagMinutes ?? undefined,
      minStaff: minStaff ?? undefined,
      windowStart: windowStart ?? undefined,
      windowEnd: windowEnd ?? undefined,
      allDay: allDay ?? undefined,
    },
    include: { role: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(rule);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.shiftRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
