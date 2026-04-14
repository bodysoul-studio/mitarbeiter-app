import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashSync } from "bcryptjs";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  pin: z.string().min(4).max(6),
  roleId: z.string().min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    include: { role: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createEmployeeSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const hashedPin = hashSync(body.pin, 10);

  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      roleId: body.roleId,
      pin: hashedPin,
    },
    include: { role: true },
  });

  return NextResponse.json(employee, { status: 201 });
}
