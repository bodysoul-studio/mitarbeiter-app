import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json();
  if (Array.isArray(ids) && ids.length > 0) {
    await prisma.adminNotification.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });
  } else {
    // Mark all as read
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
