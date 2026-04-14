import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
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
    include: { shiftAssignment: true },
  });

  if (!swapRequest) {
    return NextResponse.json(
      { error: "Swap request not found" },
      { status: 404 }
    );
  }

  if (swapRequest.status !== "open") {
    return NextResponse.json(
      { error: "Swap request is no longer open" },
      { status: 409 }
    );
  }

  if (swapRequest.offeredByEmployeeId === session.sub) {
    return NextResponse.json(
      { error: "You cannot accept your own swap request" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Transfer the shift assignment to the accepting employee
    await tx.shiftAssignment.update({
      where: { id: swapRequest.shiftAssignmentId },
      data: { employeeId: session.sub },
    });

    // Mark the swap request as accepted
    return tx.shiftSwapRequest.update({
      where: { id },
      data: {
        status: "accepted",
        acceptedByEmployeeId: session.sub,
        acceptedAt: new Date(),
      },
    });
  });

  return NextResponse.json(result);
}
