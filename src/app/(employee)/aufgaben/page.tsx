import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/time-utils";
import { redirect } from "next/navigation";
import { TasksView } from "./tasks-view";

export default async function AufgabenPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
  });
  if (!employee) redirect("/");

  const today = getTodayDate();

  const tasks = await prisma.dailyTask.findMany({
    where: {
      date: today,
      OR: [{ roleId: employee.roleId }, { roleId: null }],
    },
    include: {
      completedTasks: {
        where: { employeeId: employee.id },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tasksData = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    completed: t.completedTasks.length > 0,
  }));

  return <TasksView tasks={tasksData} employeeId={employee.id} />;
}
