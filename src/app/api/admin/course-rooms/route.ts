import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  color: z.string().optional(),
  activities: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = await prisma.courseRoom.findMany({
    include: {
      activities: { orderBy: { activityName: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const room = await prisma.courseRoom.create({
    data: {
      name: body.name,
      color: body.color || "#3b82f6",
      activities: {
        create: (body.activities || []).map((a) => ({ activityName: a })),
      },
    },
    include: { activities: true },
  });
  return NextResponse.json(room, { status: 201 });
}
