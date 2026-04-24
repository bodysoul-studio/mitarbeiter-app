import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadBsportOffers } from "@/lib/bsport";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const offers = await loadBsportOffers(date, date);
    return NextResponse.json(
      offers.map((o) => ({
        id: o.id,
        activityName: o.activityName,
        startTime: o.startTime,
        date: o.date,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
