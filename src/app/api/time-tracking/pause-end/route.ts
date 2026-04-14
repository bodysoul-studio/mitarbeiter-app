import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: Pause beenden
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Offenen TimeRecord mit offener Pause finden (nur eigene!)
  const openRecord = await prisma.timeRecord.findFirst({
    where: { employeeId: session.sub, clockOut: null },
    include: { pauses: { where: { pauseEnd: null } } },
  });

  if (!openRecord || openRecord.pauses.length === 0) {
    return NextResponse.json({ error: "Keine aktive Pause" }, { status: 400 });
  }

  const pause = await prisma.pauseRecord.update({
    where: { id: openRecord.pauses[0].id },
    data: { pauseEnd: new Date() },
  });

  return NextResponse.json({
    id: pause.id,
    pauseStart: pause.pauseStart.toISOString(),
    pauseEnd: pause.pauseEnd!.toISOString(),
  });
}
