import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSwapSchema = z.object({
  shiftAssignmentId: z.string().min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const swapRequests = await prisma.shiftSwapRequest.findMany({
    where: {
      status: "open",
      offeredByEmployeeId: { not: session.sub },
    },
    include: {
      shiftAssignment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          role: { select: { id: true, name: true } },
        },
      },
      offeredBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swapRequests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = createSwapSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // Validate that the assignment belongs to the requesting employee
  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: body.shiftAssignmentId },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Shift assignment not found" },
      { status: 404 }
    );
  }

  if (assignment.employeeId !== session.sub) {
    return NextResponse.json(
      { error: "You can only offer swaps for your own shifts" },
      { status: 403 }
    );
  }

  // Check if there's already an open swap request for this assignment
  const existing = await prisma.shiftSwapRequest.findFirst({
    where: { shiftAssignmentId: body.shiftAssignmentId, status: "open" },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An open swap request already exists for this shift" },
      { status: 409 }
    );
  }

  const swapRequest = await prisma.shiftSwapRequest.create({
    data: {
      shiftAssignmentId: body.shiftAssignmentId,
      offeredByEmployeeId: session.sub,
    },
    include: {
      shiftAssignment: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          role: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(swapRequest, { status: 201 });
}
