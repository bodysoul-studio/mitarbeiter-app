import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChecklistForm } from "../checklist-form";

export default async function EditChecklistePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [checklist, roles] = await Promise.all([
    prisma.checklist.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!checklist) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Checkliste bearbeiten</h1>
      <ChecklistForm roles={roles} checklist={checklist} />
    </div>
  );
}
