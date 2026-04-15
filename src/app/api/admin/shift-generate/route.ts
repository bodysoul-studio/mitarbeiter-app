import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { loadBsportOffers, adjustTime, BsportOffer } from "@/lib/bsport";
import { z } from "zod";

const generateSchema = z.object({
  weekStart: z.string().min(1),
});

/**
 * For a given set of offers and a time window, find the first start and last end
 * of courses that fall within that window.
 */
function getWindowCourseRange(
  offers: BsportOffer[],
  windowStart: string,
  windowEnd: string
): { firstStart: string; lastEnd: string; count: number } | null {
  const filtered = offers.filter(
    (o) => o.startTime >= windowStart && o.startTime < windowEnd
  );

  if (filtered.length === 0) return null;

  let firstStart = "23:59";
  let lastEnd = "00:00";

  for (const o of filtered) {
    if (o.startTime < firstStart) firstStart = o.startTime;

    const [h, m] = o.startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + o.durationMin;
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const endM = (endMinutes % 60).toString().padStart(2, "0");
    const endTime = `${endH}:${endM}`;

    if (endTime > lastEnd) lastEnd = endTime;
  }

  return { firstStart, lastEnd, count: filtered.length };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = generateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { weekStart } = body;

  // Calculate week dates (avoid timezone issues by parsing as local date parts)
  const [year, month, day] = weekStart.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, day + i);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
  }
  const weekEnd = dates[6];

  // 1. Load courses from bsport
  let offers: BsportOffer[];
  try {
    offers = await loadBsportOffers(weekStart, weekEnd);
  } catch (e) {
    return NextResponse.json(
      { error: `bsport API Fehler: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  if (offers.length === 0) {
    return NextResponse.json(
      { error: "Keine Kurse in dieser Woche gefunden" },
      { status: 404 }
    );
  }

  // Group offers by date
  const offersByDate = new Map<string, BsportOffer[]>();
  for (const o of offers) {
    const existing = offersByDate.get(o.date) || [];
    existing.push(o);
    offersByDate.set(o.date, existing);
  }

  // 2. Load shift rules
  const rules = await prisma.shiftRule.findMany({
    include: { role: true },
  });

  if (rules.length === 0) {
    return NextResponse.json(
      { error: "Keine Schichtregeln definiert. Bitte erst unter Schichtregeln konfigurieren." },
      { status: 400 }
    );
  }

  // 3. Load existing assignments for this week
  const existingAssignments = await prisma.shiftAssignment.findMany({
    where: { date: { in: dates } },
  });

  // 4. Load active employees with weekly schedules
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { weeklySchedule: true },
  });

  // 5. Generate shifts per day, per rule
  const created: { date: string; name: string; role: string; startTime: string; endTime: string; employee: string }[] = [];

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    const dayOffers = offersByDate.get(date) || [];
    if (dayOffers.length === 0) continue;

    // Day of week: 0=Mo, 1=Di, ..., 6=So
    const dayOfWeek = di;

    for (const rule of rules) {
      // Check if rule applies to this weekday
      const ruleWeekdays = (rule.weekdays || "0,1,2,3,4,5,6").split(",").map(Number);
      if (!ruleWeekdays.includes(dayOfWeek)) continue;

      // If allDay: use all courses of the day; otherwise filter by time window
      const range = rule.allDay
        ? getWindowCourseRange(dayOffers, "00:00", "23:59")
        : getWindowCourseRange(dayOffers, rule.windowStart, rule.windowEnd);
      if (!range) continue; // No courses

      const shiftStart = adjustTime(range.firstStart, -rule.leadMinutes);
      const shiftEnd = adjustTime(range.lastEnd, rule.lagMinutes);

      // Determine which shiftType matches this rule
      const ruleShiftType = rule.allDay
        ? "ganztag"
        : rule.windowEnd <= "13:00"
          ? "frueh"
          : "spaet";

      // Find employees with this role (primary or additional) who are scheduled for this day+shiftType
      const roleEmployees = employees.filter((e) => {
        const allRoleIds = [e.roleId, ...JSON.parse(e.additionalRoles || "[]")];
        if (!allRoleIds.includes(rule.roleId)) return false;
        const schedule = e.weeklySchedule.find((s) => s.weekday === dayOfWeek);
        if (!schedule) return false;
        // "ganztag" matches everything, otherwise match exactly
        return schedule.shiftType === ruleShiftType || schedule.shiftType === "ganztag";
      });

      // Fallback: if no scheduled employees, try any employee with this role
      const candidateEmployees = roleEmployees.length > 0
        ? roleEmployees
        : employees.filter((e) => {
            const allRoleIds = [e.roleId, ...JSON.parse(e.additionalRoles || "[]")];
            return allRoleIds.includes(rule.roleId);
          });
      if (candidateEmployees.length === 0) continue;

      // How many already assigned for this rule's role + date?
      const existingCount = existingAssignments.filter(
        (a) => a.date === date && a.roleId === rule.roleId &&
          a.startTime >= shiftStart && a.startTime <= shiftEnd
      ).length;

      const needed = Math.max(0, rule.minStaff - existingCount);

      // Pick employees with fewest assignments this week (prefer scheduled ones)
      const employeeCounts = candidateEmployees.map((emp) => ({
        emp,
        count: existingAssignments.filter((a) => a.employeeId === emp.id).length,
      }));
      employeeCounts.sort((a, b) => a.count - b.count);

      for (let i = 0; i < needed && i < employeeCounts.length; i++) {
        const emp = employeeCounts[i].emp;

        // Prevent duplicate
        const alreadyExists = existingAssignments.some(
          (a) =>
            a.employeeId === emp.id &&
            a.date === date &&
            a.startTime === shiftStart &&
            a.endTime === shiftEnd
        );
        if (alreadyExists) continue;

        const assignment = await prisma.shiftAssignment.create({
          data: {
            employeeId: emp.id,
            date,
            label: rule.name || rule.role.name,
            startTime: shiftStart,
            endTime: shiftEnd,
            roleId: rule.roleId,
          },
        });

        created.push({
          date,
          name: rule.name || rule.role.name,
          role: rule.role.name,
          startTime: shiftStart,
          endTime: shiftEnd,
          employee: emp.name,
        });

        existingAssignments.push(assignment);
      }
    }
  }

  return NextResponse.json({
    message: `${created.length} Schichten automatisch erstellt`,
    totalCourses: offers.length,
    created,
  });
}
