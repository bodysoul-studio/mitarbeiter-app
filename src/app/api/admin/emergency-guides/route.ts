import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const emergencyGuideSchema = z.object({
  title: z.string().min(1).max(500),
  solution: z.string().min(1),
  category: z.string().optional(),
  sortOrder: z.number().optional(),
  mediaUrls: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guides = await prisma.emergencyGuide.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = emergencyGuideSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const guide = await prisma.emergencyGuide.create({
    data: {
      title: body.title,
      solution: body.solution,
      category: body.category || "Allgemein",
      sortOrder: body.sortOrder ?? 0,
      mediaUrls: JSON.stringify(body.mediaUrls || []),
    },
  });

  return NextResponse.json(guide, { status: 201 });
}
