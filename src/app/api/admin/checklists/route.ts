import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const checklistSchema = z.object({
  title: z.string().min(1).max(500),
  roleId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    requiresPhoto: z.boolean().optional(),
  })).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checklists = await prisma.checklist.findMany({
    where: { isActive: true },
    include: {
      role: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ role: { name: "asc" } }, { sortOrder: "asc" }],
  });

  return NextResponse.json(checklists);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = checklistSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const checklist = await prisma.checklist.create({
    data: {
      title: body.title,
      roleId: body.roleId,
      startTime: body.startTime,
      endTime: body.endTime,
      items: {
        create: (body.items || []).map(
          (item, index: number) => ({
            title: item.title,
            description: item.description || null,
            requiresPhoto: item.requiresPhoto || false,
            sortOrder: index,
          })
        ),
      },
    },
    include: { items: true, role: true },
  });

  return NextResponse.json(checklist, { status: 201 });
}
