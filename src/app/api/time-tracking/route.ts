import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getTodayDate } from "@/lib/time-utils";
import { getAllowedNetworks, isIpAllowed, getClientIp } from "@/lib/wifi";
import { z } from "zod";

const clockInSchema = z.object({
  employeeId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId") || session.sub;
  const date = searchParams.get("date") || getTodayDate();

  const records = await prisma.timeRecord.findMany({
    where: { employeeId, date },
    orderBy: { clockIn: "asc" },
  });

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = clockInSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const allowedNetworks = await getAllowedNetworks();

  if (!isIpAllowed(ip, allowedNetworks)) {
    return NextResponse.json(
      { error: "Nicht im erlaubten Netzwerk", ip },
      { status: 403 }
    );
  }

  // Check for existing open record
  const openRecord = await prisma.timeRecord.findFirst({
    where: {
      employeeId: session.sub,
      clockOut: null,
    },
  });

  if (openRecord) {
    return NextResponse.json(
      { error: "Es gibt bereits einen offenen Zeiteintrag" },
      { status: 400 }
    );
  }

  const today = getTodayDate();
  const record = await prisma.timeRecord.create({
    data: {
      employeeId: session.sub,
      date: today,
      clockIn: new Date(),
      ipAddress: ip,
    },
  });

  return NextResponse.json({
    id: record.id,
    clockIn: record.clockIn.toISOString(),
    clockOut: null,
  });
}
