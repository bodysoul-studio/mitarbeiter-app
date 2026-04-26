import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const suggestion = await prisma.checklistSuggestion.findUnique({ where: { id } });
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Determine sortOrder: append at end of siblings (under parent or in checklist root)
  const siblings = await prisma.checklistItem.findMany({
    where: {
      checklistId: suggestion.checklistId,
      parentId: suggestion.parentItemId || null,
    },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  const nextSort = siblings.length > 0 ? siblings[0].sortOrder + 1 : 0;

  await prisma.$transaction([
    prisma.checklistItem.create({
      data: {
        checklistId: suggestion.checklistId,
        parentId: suggestion.parentItemId,
        title: suggestion.title,
        description: suggestion.description,
        sortOrder: nextSort,
      },
    }),
    prisma.checklistSuggestion.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
