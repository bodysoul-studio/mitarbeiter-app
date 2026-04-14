import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createShiftTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  defaultStart: z.string().min(1),
  defaultEnd: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.shiftTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createShiftTemplateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const template = await prisma.shiftTemplate.create({
    data: {
      name: body.name,
      defaultStart: body.defaultStart,
      defaultEnd: body.defaultEnd,
      color: body.color || "#3b82f6",
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
