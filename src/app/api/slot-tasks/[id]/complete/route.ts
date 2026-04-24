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

  const completed = await prisma.completedSlotTask.upsert({
    where: {
      slotId_employeeId_date: {
        slotId: id,
        employeeId: session.sub,
        date: body.date,
      },
    },
    update: { photoUrl: body.photoUrl },
    create: {
      slotId: id,
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
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  await prisma.completedSlotTask.deleteMany({
    where: { slotId: id, date },
  });

  return NextResponse.json({ ok: true });
}
