import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSkillSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skills = await prisma.skill.findMany({
    include: {
      completedSkills: {
        include: { employee: { select: { name: true } } },
      },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  const result = skills.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    sortOrder: s.sortOrder,
    completedBy: s.completedSkills.map((cs) => cs.employee.name),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createSkillSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const skill = await prisma.skill.create({
    data: {
      title: body.title,
      description: body.description || null,
      category: body.category || "Allgemein",
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ ...skill, completedBy: [] }, { status: 201 });
}
