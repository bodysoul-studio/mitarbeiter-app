import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  color: z.string().optional(),
  activities: z.array(z.string()).optional(),
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
    body = updateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.courseRoom.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
      },
    });
    if (body.activities !== undefined) {
      await tx.courseRoomActivity.deleteMany({ where: { courseRoomId: id } });
      if (body.activities.length > 0) {
        await tx.courseRoomActivity.createMany({
          data: body.activities.map((a) => ({ courseRoomId: id, activityName: a })),
        });
      }
    }
  });

  const full = await prisma.courseRoom.findUnique({
    where: { id },
    include: { activities: { orderBy: { activityName: "asc" } } },
  });
  return NextResponse.json(full);
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
  await prisma.courseRoom.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
