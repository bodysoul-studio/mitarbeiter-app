import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/time-utils";
import { redirect } from "next/navigation";
import { TimeTrackingView } from "./time-tracking-view";

export default async function ZeiterfassungPage() {
  const session = await getSession();
  if (!session || session.type !== "employee") redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: session.sub },
  });
  if (!employee) redirect("/");

  const today = getTodayDate();

  const records = await prisma.timeRecord.findMany({
    where: {
      employeeId: employee.id,
      date: today,
    },
    include: {
      pauses: { orderBy: { pauseStart: "asc" } },
    },
    orderBy: { clockIn: "asc" },
  });

  const recordsData = records.map((r) => ({
    id: r.id,
    clockIn: r.clockIn.toISOString(),
    clockOut: r.clockOut?.toISOString() ?? null,
    pauses: r.pauses.map((p) => ({
      id: p.id,
      pauseStart: p.pauseStart.toISOString(),
      pauseEnd: p.pauseEnd?.toISOString() ?? null,
    })),
  }));

  const hasOpenRecord = records.some((r) => !r.clockOut);
  const hasOpenPause = records.some((r) =>
    !r.clockOut && r.pauses.some((p) => !p.pauseEnd)
  );

  return (
    <TimeTrackingView
      records={recordsData}
      employeeId={employee.id}
      hasOpenRecord={hasOpenRecord}
      hasOpenPause={hasOpenPause}
    />
  );
}
