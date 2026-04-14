import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateRoleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: z.string().optional(),
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
    body = updateRoleSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const role = await prisma.role.update({
    where: { id },
    data: { name: body.name, color: body.color },
  });

  return NextResponse.json(role);
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

  // Check if any employees are assigned to this role
  const employeeCount = await prisma.employee.count({
    where: { roleId: id },
  });

  if (employeeCount > 0) {
    return NextResponse.json(
      { error: "Rolle kann nicht gelöscht werden, da noch Mitarbeiter zugewiesen sind." },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
