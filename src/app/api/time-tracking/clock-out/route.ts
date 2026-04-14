import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const clockOutSchema = z.object({
  employeeId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = clockOutSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const openRecord = await prisma.timeRecord.findFirst({
    where: {
      employeeId: session.sub,
      clockOut: null,
    },
  });

  if (!openRecord) {
    return NextResponse.json(
      { error: "Kein offener Zeiteintrag gefunden" },
      { status: 400 }
    );
  }

  const updated = await prisma.timeRecord.update({
    where: { id: openRecord.id },
    data: { clockOut: new Date() },
  });

  return NextResponse.json({
    id: updated.id,
    clockIn: updated.clockIn.toISOString(),
    clockOut: updated.clockOut!.toISOString(),
  });
}
