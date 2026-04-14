import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: Pause starten
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Offenen TimeRecord finden (nur eigene!)
  const openRecord = await prisma.timeRecord.findFirst({
    where: { employeeId: session.sub, clockOut: null },
    include: { pauses: { where: { pauseEnd: null } } },
  });

  if (!openRecord) {
    return NextResponse.json({ error: "Keine aktive Schicht" }, { status: 400 });
  }

  // Prüfen ob schon eine offene Pause existiert
  if (openRecord.pauses.length > 0) {
    return NextResponse.json({ error: "Bereits in Pause" }, { status: 400 });
  }

  const pause = await prisma.pauseRecord.create({
    data: {
      timeRecordId: openRecord.id,
      pauseStart: new Date(),
    },
  });

  return NextResponse.json({
    id: pause.id,
    pauseStart: pause.pauseStart.toISOString(),
    pauseEnd: null,
  });
}
