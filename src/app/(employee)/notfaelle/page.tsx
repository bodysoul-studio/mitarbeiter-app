import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmergencyView } from "./emergency-view";

export default async function NotfaellePage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const guides = await prisma.emergencyGuide.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  return <EmergencyView guides={guides.map((g) => ({
    id: g.id,
    title: g.title,
    solution: g.solution,
    category: g.category,
    mediaUrls: JSON.parse(g.mediaUrls || "[]") as string[],
  }))} />;
}
