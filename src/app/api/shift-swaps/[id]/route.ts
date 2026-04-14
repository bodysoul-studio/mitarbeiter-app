import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const swapRequest = await prisma.shiftSwapRequest.findUnique({
    where: { id },
  });

  if (!swapRequest) {
    return NextResponse.json(
      { error: "Swap request not found" },
      { status: 404 }
    );
  }

  if (swapRequest.offeredByEmployeeId !== session.sub) {
    return NextResponse.json(
      { error: "You can only cancel your own swap requests" },
      { status: 403 }
    );
  }

  if (swapRequest.status !== "open") {
    return NextResponse.json(
      { error: "Cannot cancel a swap request that is no longer open" },
      { status: 409 }
    );
  }

  await prisma.shiftSwapRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
