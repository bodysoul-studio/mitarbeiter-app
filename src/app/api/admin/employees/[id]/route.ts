import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashSync } from "bcryptjs";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  pin: z.string().min(4).max(6).optional(),
  roleId: z.string().min(1).optional(),
  additionalRoles: z.string().optional(),
  isActive: z.boolean().optional(),
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
    body = updateEmployeeSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.roleId !== undefined) data.roleId = body.roleId;
  if (body.additionalRoles !== undefined) data.additionalRoles = body.additionalRoles;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.pin) data.pin = hashSync(body.pin, 10);

  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { role: true },
  });

  return NextResponse.json(employee);
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

  await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
