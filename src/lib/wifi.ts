import ipaddr from "ipaddr.js";
import { prisma } from "./prisma";

export async function getAllowedNetworks(): Promise<string[]> {
  const config = await prisma.appConfig.findUnique({
    where: { key: "allowed_networks" },
  });
  if (!config) return [];
  return JSON.parse(config.value);
}

export function isIpAllowed(ip: string, allowedNetworks: string[]): boolean {
  if (allowedNetworks.length === 0) return true;

  // Localhost immer erlauben (Entwicklung & lokaler Betrieb)
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
    return true;
  }

  try {
    const addr = ipaddr.parse(ip);
    for (const network of allowedNetworks) {
      try {
        const [subnet, prefixLength] = ipaddr.parseCIDR(network);
        if (addr.kind() === subnet.kind() && addr.match([subnet, prefixLength])) {
          return true;
        }
      } catch {
        if (ip === network) return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}
