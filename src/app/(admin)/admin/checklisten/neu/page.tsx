import { prisma } from "@/lib/prisma";
import { ChecklistForm } from "../checklist-form";

export default async function NeueChecklistePage() {
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Neue Checkliste</h1>
      <ChecklistForm roles={roles} />
    </div>
  );
}
