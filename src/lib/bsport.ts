export type BsportOffer = {
  id: number;
  activityName: string;
  nameOverride: string;
  dateStart: string;
  date: string;
  startTime: string;
  durationMin: number;
  coachId: number;
  bookings: number;
  capacity: number;
  full: boolean;
};

export async function loadBsportOffers(
  from: string,
  to: string
): Promise<BsportOffer[]> {
  const token = process.env.BSPORT_API_TOKEN;
  if (!token) {
    throw new Error("BSPORT_API_TOKEN nicht konfiguriert");
  }

  const allOffers: BsportOffer[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const resp = await fetch(
      `https://api.production.bsport.io/api/v1/offer/?company=3121&min_date=${from}&max_date=${to}&page_size=200&page=${page}`,
      {
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!resp.ok) {
      throw new Error(`bsport API Fehler: ${resp.status}`);
    }

    const data = await resp.json();

    for (const o of data.results || []) {
      const dateStart = o.date_start || "";
      // Extract HH:mm from ISO datetime
      const timePart = dateStart.includes("T")
        ? dateStart.split("T")[1]?.substring(0, 5) || "00:00"
        : "00:00";

      allOffers.push({
        id: o.id,
        activityName: o.activity_name || "",
        nameOverride: o.name || "",
        dateStart,
        date: dateStart.split("T")[0],
        startTime: timePart,
        durationMin: o.duration_minute || 45,
        coachId: o.coach || 0,
        bookings: o.validated_booking_count || 0,
        capacity: o.effectif || 0,
        full: o.full === true,
      });
    }

    hasMore = !!data.links?.next;
    page++;
  }

  return allOffers;
}

/**
 * Group offers by date and find earliest start / latest end per day
 */
export function getDayCourseWindows(
  offers: BsportOffer[]
): Map<string, { firstStart: string; lastEnd: string; courseCount: number }> {
  const windows = new Map<
    string,
    { firstStart: string; lastEnd: string; courseCount: number }
  >();

  for (const offer of offers) {
    const existing = windows.get(offer.date);

    // Calculate end time
    const [h, m] = offer.startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + offer.durationMin;
    const endH = Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, "0");
    const endM = (endMinutes % 60).toString().padStart(2, "0");
    const endTime = `${endH}:${endM}`;

    if (!existing) {
      windows.set(offer.date, {
        firstStart: offer.startTime,
        lastEnd: endTime,
        courseCount: 1,
      });
    } else {
      if (offer.startTime < existing.firstStart) {
        existing.firstStart = offer.startTime;
      }
      if (endTime > existing.lastEnd) {
        existing.lastEnd = endTime;
      }
      existing.courseCount++;
    }
  }

  return windows;
}

/**
 * Adjust time by minutes (can be negative for earlier)
 */
export function adjustTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + minutes;
  if (total < 0) total = 0;
  if (total >= 24 * 60) total = 23 * 60 + 59;
  const newH = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const newM = (total % 60).toString().padStart(2, "0");
  return `${newH}:${newM}`;
}
