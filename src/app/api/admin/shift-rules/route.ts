import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createShiftRuleSchema = z.object({
  name: z.string().optional(),
  roleId: z.string().min(1),
  leadMinutes: z.number().optional(),
  lagMinutes: z.number().optional(),
  minStaff: z.number().optional(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.shiftRule.findMany({
    include: { role: { select: { id: true, name: true, color: true } } },
    orderBy: [{ windowStart: "asc" }, { role: { name: "asc" } }],
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createShiftRuleSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const rule = await prisma.shiftRule.create({
    data: {
      name: body.name || "",
      roleId: body.roleId,
      leadMinutes: body.leadMinutes ?? 30,
      lagMinutes: body.lagMinutes ?? 30,
      minStaff: body.minStaff ?? 1,
      windowStart: body.windowStart || "00:00",
      windowEnd: body.windowEnd || "23:59",
    },
    include: { role: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(rule);
}
