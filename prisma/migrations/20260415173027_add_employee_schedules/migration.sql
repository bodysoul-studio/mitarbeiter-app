-- CreateTable
CREATE TABLE "employee_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "shiftType" TEXT NOT NULL,
    CONSTRAINT "employee_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_schedules_employeeId_weekday_key" ON "employee_schedules"("employeeId", "weekday");
