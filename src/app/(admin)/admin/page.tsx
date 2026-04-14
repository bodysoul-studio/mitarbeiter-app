import { prisma } from "@/lib/prisma";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function calcHoursFromShifts(shifts: { startTime: string; endTime: string }[]): number {
  let totalMin = 0;
  for (const s of shifts) {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    totalMin += (eh * 60 + em) - (sh * 60 + sm);
  }
  return totalMin / 60;
}

function fmtHours(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  return `${hours < 0 ? "-" : ""}${h}h ${m.toString().padStart(2, "0")}min`;
}

type TimeRecordWithPauses = {
  employeeId: string;
  clockIn: Date;
  clockOut: Date | null;
  pauses: { pauseStart: Date; pauseEnd: Date | null }[];
};

function calcTrackedHours(records: TimeRecordWithPauses[]): number {
  let totalMs = 0;
  for (const r of records) {
    const start = r.clockIn.getTime();
    const end = r.clockOut ? r.clockOut.getTime() : Date.now();
    let pauseMs = 0;
    for (const p of r.pauses) {
      const pStart = p.pauseStart.getTime();
      const pEnd = p.pauseEnd ? p.pauseEnd.getTime() : Date.now();
      pauseMs += pEnd - pStart;
    }
    totalMs += (end - start) - pauseMs;
  }
  return totalMs / 3_600_000;
}

export default async function AdminDashboard() {
  const now = new Date();
  const today = fmtDate(now);

  // Week range
  const monday = getMonday(now);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    weekDates.push(fmtDate(d));
  }

  // Month range
  const monthStart = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [
    clockedInCount,
    totalEmployees,
    totalChecklists,
    completedToday,
    totalItemsToday,
    tasksToday,
    completedTasksToday,
    employees,
    weekShifts,
    monthShifts,
    weekTimeRecords,
    monthTimeRecords,
  ] = await Promise.all([
    prisma.timeRecord.groupBy({
      by: ["employeeId"],
      where: { date: today },
    }).then((r) => r.length),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.checklist.count({ where: { isActive: true } }),
    prisma.completedItem.count({ where: { date: today } }),
    prisma.checklistItem.count({
      where: { checklist: { isActive: true } },
    }),
    prisma.dailyTask.count({ where: { date: today } }),
    prisma.completedTask.count({
      where: { task: { date: today } },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      include: { role: { select: { name: true, color: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.shiftAssignment.findMany({
      where: { date: { in: weekDates } },
      select: { employeeId: true, startTime: true, endTime: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { employeeId: true, startTime: true, endTime: true },
    }),
    prisma.timeRecord.findMany({
      where: { date: { in: weekDates } },
      include: { pauses: true },
    }),
    prisma.timeRecord.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: { pauses: true },
    }),
  ]);

  const checklistCompletionRate =
    totalItemsToday > 0
      ? Math.round((completedToday / totalItemsToday) * 100)
      : 0;

  const taskCompletionRate =
    tasksToday > 0
      ? Math.round((completedTasksToday / tasksToday) * 100)
      : 0;

  // Calculate hours per employee
  const employeeHours = employees.map((emp) => {
    const empWeekShifts = weekShifts.filter((s) => s.employeeId === emp.id);
    const empMonthShifts = monthShifts.filter((s) => s.employeeId === emp.id);
    const empWeekRecords = weekTimeRecords.filter((r) => r.employeeId === emp.id);
    const empMonthRecords = monthTimeRecords.filter((r) => r.employeeId === emp.id);
    const weekPlanned = calcHoursFromShifts(empWeekShifts);
    const monthPlanned = calcHoursFromShifts(empMonthShifts);
    const weekTracked = calcTrackedHours(empWeekRecords);
    const monthTracked = calcTrackedHours(empMonthRecords);
    return {
      id: emp.id,
      name: emp.name,
      roleName: emp.role.name,
      roleColor: emp.role.color || "#6b7280",
      weekPlanned,
      weekTracked,
      weekDiff: weekTracked - weekPlanned,
      monthPlanned,
      monthTracked,
      monthDiff: monthTracked - monthPlanned,
    };
  });

  const totalWeekPlanned = employeeHours.reduce((sum, e) => sum + e.weekPlanned, 0);
  const totalWeekTracked = employeeHours.reduce((sum, e) => sum + e.weekTracked, 0);
  const totalMonthPlanned = employeeHours.reduce((sum, e) => sum + e.monthPlanned, 0);
  const totalMonthTracked = employeeHours.reduce((sum, e) => sum + e.monthTracked, 0);

  const stats = [
    {
      label: "Anwesend heute",
      value: `${clockedInCount} / ${employees.length}`,
      sub: "Mitarbeiter eingestempelt",
    },
    {
      label: "Checklisten-Fortschritt",
      value: `${checklistCompletionRate}%`,
      sub: `${completedToday} von ${totalItemsToday} Punkten erledigt`,
    },
    {
      label: "Aufgaben heute",
      value: `${completedTasksToday} / ${tasksToday}`,
      sub: `${taskCompletionRate}% abgeschlossen`,
    },
    {
      label: "Aktive Checklisten",
      value: totalChecklists,
      sub: "Vorlagen verfügbar",
    },
  ];

  const monthName = now.toLocaleDateString("de-DE", { month: "long" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-slate-400 mb-8">
        Übersicht für{" "}
        {now.toLocaleDateString("de-DE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-800 border border-slate-700 rounded-lg p-6"
          >
            <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Arbeitszeiten-Übersicht */}
      <h2 className="text-lg font-semibold text-white mb-4">
        Geschätzte Arbeitszeiten (aus Schichtplan)
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Woche geplant</p>
          <p className="text-2xl font-bold text-blue-400">{fmtHours(totalWeekPlanned)}</p>
          <p className="text-xs text-slate-500">aus Schichtplan</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Woche getrackt</p>
          <p className="text-2xl font-bold text-green-400">{fmtHours(totalWeekTracked)}</p>
          <p className="text-xs text-slate-500">aus Zeiterfassung</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{monthName} geplant</p>
          <p className="text-2xl font-bold text-purple-400">{fmtHours(totalMonthPlanned)}</p>
          <p className="text-xs text-slate-500">aus Schichtplan</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{monthName} getrackt</p>
          <p className="text-2xl font-bold text-emerald-400">{fmtHours(totalMonthTracked)}</p>
          <p className="text-xs text-slate-500">aus Zeiterfassung</p>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Mitarbeiter</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Rolle</th>
                <th className="text-right px-4 py-3 text-blue-400 font-medium">Woche Soll</th>
                <th className="text-right px-4 py-3 text-green-400 font-medium">Woche Ist</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Diff</th>
                <th className="text-right px-4 py-3 text-purple-400 font-medium">{monthName} Soll</th>
                <th className="text-right px-4 py-3 text-emerald-400 font-medium">{monthName} Ist</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Diff</th>
              </tr>
            </thead>
            <tbody>
              {employeeHours.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-white font-medium">{emp.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: emp.roleColor + "22",
                        color: emp.roleColor,
                      }}
                    >
                      {emp.roleName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400">{fmtHours(emp.weekPlanned)}</td>
                  <td className="px-4 py-3 text-right text-green-400">{fmtHours(emp.weekTracked)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${emp.weekDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {emp.weekDiff >= 0 ? "+" : ""}{fmtHours(emp.weekDiff)}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-400">{fmtHours(emp.monthPlanned)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{fmtHours(emp.monthTracked)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${emp.monthDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {emp.monthDiff >= 0 ? "+" : ""}{fmtHours(emp.monthDiff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
