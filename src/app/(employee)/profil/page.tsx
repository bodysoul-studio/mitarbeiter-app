import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileView } from "./profile-view";

export default async function ProfilPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });
  if (!employee) redirect("/");

  return (
    <ProfileView
      name={employee.name}
      roleName={employee.role.name}
      roleColor={employee.role.color || "#3b82f6"}
    />
  );
}
