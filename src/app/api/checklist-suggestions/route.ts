import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  checklistId: z.string().min(1),
  parentItemId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const suggestion = await prisma.checklistSuggestion.create({
    data: {
      checklistId: body.checklistId,
      parentItemId: body.parentItemId || null,
      employeeId: session.sub,
      title: body.title,
      description: body.description || null,
    },
  });

  return NextResponse.json(suggestion, { status: 201 });
}
