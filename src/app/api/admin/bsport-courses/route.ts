import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadBsportOffers } from "@/lib/bsport";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from & to erforderlich" }, { status: 400 });
  }

  try {
    const offers = await loadBsportOffers(from, to);

    // Group by date: first start, last end, course count
    const byDate = new Map<string, { firstStart: string; lastEnd: string; count: number }>();

    for (const offer of offers) {
      const [h, m] = offer.startTime.split(":").map(Number);
      const endMin = h * 60 + m + offer.durationMin;
      const endH = Math.floor(endMin / 60).toString().padStart(2, "0");
      const endM = (endMin % 60).toString().padStart(2, "0");
      const endTime = `${endH}:${endM}`;

      const existing = byDate.get(offer.date);
      if (!existing) {
        byDate.set(offer.date, { firstStart: offer.startTime, lastEnd: endTime, count: 1 });
      } else {
        if (offer.startTime < existing.firstStart) existing.firstStart = offer.startTime;
        if (endTime > existing.lastEnd) existing.lastEnd = endTime;
        existing.count++;
      }
    }

    return NextResponse.json(Object.fromEntries(byDate));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
