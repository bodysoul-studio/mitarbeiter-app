import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadBsportOffers } from "@/lib/bsport";

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load next 30 days of offers
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 30);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  try {
    const offers = await loadBsportOffers(fmt(today), fmt(future));
    const unique = Array.from(new Set(offers.map((o) => o.activityName).filter(Boolean))).sort();
    return NextResponse.json(unique);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
