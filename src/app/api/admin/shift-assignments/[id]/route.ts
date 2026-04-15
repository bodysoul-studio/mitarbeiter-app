import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateShiftAssignmentSchema = z.object({
  employeeId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  label: z.string().nullable().optional(),
  shiftTemplateId: z.string().nullable().optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = updateShiftAssignmentSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const assignment = await prisma.shiftAssignment.update({
    where: { id },
    data: {
      ...(body.employeeId !== undefined && { employeeId: body.employeeId }),
      ...(body.date !== undefined && { date: body.date }),
      ...(body.label !== undefined && { label: body.label || null }),
      ...(body.shiftTemplateId !== undefined && { shiftTemplateId: body.shiftTemplateId || null }),
      ...(body.startTime !== undefined && { startTime: body.startTime }),
      ...(body.endTime !== undefined && { endTime: body.endTime }),
      ...(body.roleId !== undefined && { roleId: body.roleId }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
    },
    include: {
      employee: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      shiftTemplate: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(assignment);
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

  // Delete any open swap requests for this assignment, then delete the assignment
  await prisma.$transaction(async (tx) => {
    await tx.shiftSwapRequest.deleteMany({
      where: { shiftAssignmentId: id, status: "open" },
    });
    await tx.shiftAssignment.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
