import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateShiftTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  defaultStart: z.string().min(1).optional(),
  defaultEnd: z.string().min(1).optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
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
    body = updateShiftTemplateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const template = await prisma.shiftTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.defaultStart !== undefined && { defaultStart: body.defaultStart }),
      ...(body.defaultEnd !== undefined && { defaultEnd: body.defaultEnd }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });

  return NextResponse.json(template);
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

  const assignmentCount = await prisma.shiftAssignment.count({
    where: { shiftTemplateId: id },
  });

  if (assignmentCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete template that has existing assignments" },
      { status: 409 }
    );
  }

  await prisma.shiftTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
