import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SkillsView } from "./skills-view";

export default async function FaehigkeitenPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const skills = await prisma.skill.findMany({
    include: {
      completedSkills: {
        where: { employeeId: session.sub },
      },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <SkillsView
      skills={skills.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        completed: s.completedSkills.length > 0,
      }))}
    />
  );
}
