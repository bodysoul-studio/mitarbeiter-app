import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const completeSchema = z.object({
  date: z.string().min(1),
  photoUrl: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = completeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // Check if item exists
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Check if photo is required but not provided
  if (item.requiresPhoto && !body.photoUrl) {
    return NextResponse.json({ error: "Photo required" }, { status: 400 });
  }

  const completed = await prisma.completedItem.upsert({
    where: {
      checklistItemId_employeeId_date: {
        checklistItemId: id,
        employeeId: session.sub,
        date: body.date,
      },
    },
    update: { photoUrl: body.photoUrl },
    create: {
      checklistItemId: id,
      employeeId: session.sub,
      date: body.date,
      photoUrl: body.photoUrl,
    },
  });

  return NextResponse.json(completed);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  try {
    await prisma.completedItem.delete({
      where: {
        checklistItemId_employeeId_date: {
          checklistItemId: id,
          employeeId: session.sub,
          date,
        },
      },
    });
  } catch {
    // Already deleted, ignore
  }

  return NextResponse.json({ ok: true });
}
