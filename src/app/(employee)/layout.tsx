import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/time-utils";
import { EmployeeShell } from "./employee-shell";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    redirect("/");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!employee) {
    redirect("/");
  }

  const today = getTodayDate();

  // Parse additional roles
  let additionalRoleIds: string[] = [];
  try {
    additionalRoleIds = JSON.parse(employee.additionalRoles || "[]");
  } catch { additionalRoleIds = []; }

  const allRoleIds = [employee.roleId, ...additionalRoleIds.filter((id) => id !== employee.roleId)];

  // Load all role names + colors for display
  const allRolesData = await prisma.role.findMany({
    where: { id: { in: allRoleIds } },
    select: { id: true, name: true, color: true },
  });
  const roles = allRoleIds
    .map((id) => allRolesData.find((r) => r.id === id))
    .filter((r): r is { id: string; name: string; color: string | null } => !!r);

  // Tagesaufgaben laden (für diese Rollen oder alle)
  const dailyTasks = await prisma.dailyTask.findMany({
    where: {
      date: today,
      OR: [{ roleId: { in: allRoleIds } }, { roleId: null }],
    },
    include: {
      completedTasks: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tasks = dailyTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    completed: t.completedTasks.some((ct) => ct.employeeId === employee.id),
    completedBy: t.completedTasks.map((ct) => ct.employee.name),
  }));

  const employeeInfo = {
    id: employee.id,
    name: employee.name,
    roleName: employee.role.name,
    roleColor: employee.role.color || "#3b82f6",
    roleId: employee.roleId,
    roles: roles.map((r) => ({ name: r.name, color: r.color || "#3b82f6" })),
  };

  return (
    <EmployeeShell employeeInfo={employeeInfo} tasks={tasks}>
      {children}
    </EmployeeShell>
  );
}
