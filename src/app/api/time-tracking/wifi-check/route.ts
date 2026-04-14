import { NextRequest, NextResponse } from "next/server";
import { getAllowedNetworks, isIpAllowed, getClientIp } from "@/lib/wifi";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const allowedNetworks = await getAllowedNetworks();
  const allowed = isIpAllowed(ip, allowedNetworks);

  return NextResponse.json({ allowed, ip });
}
