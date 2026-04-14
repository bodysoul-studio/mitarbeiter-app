import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateEmergencyGuideSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  solution: z.string().min(1).optional(),
  category: z.string().optional(),
  sortOrder: z.number().optional(),
  mediaUrls: z.array(z.string()).optional(),
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
    body = updateEmergencyGuideSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const guide = await prisma.emergencyGuide.update({
    where: { id },
    data: {
      title: body.title,
      solution: body.solution,
      category: body.category || "Allgemein",
      sortOrder: body.sortOrder ?? 0,
      mediaUrls: JSON.stringify(body.mediaUrls || []),
    },
  });

  return NextResponse.json(guide);
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

  await prisma.emergencyGuide.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
