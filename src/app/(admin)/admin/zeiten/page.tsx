import { prisma } from "@/lib/prisma";
import { ZeitenClient } from "./zeiten-client";

export default async function ZeitenPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <ZeitenClient employees={employees} />;
}
