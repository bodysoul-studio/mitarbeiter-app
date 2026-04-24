-- CreateTable
CREATE TABLE "completed_slot_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "photoUrl" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "completed_slot_tasks_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "day_template_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "completed_slot_tasks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "completed_slot_tasks_employeeId_date_idx" ON "completed_slot_tasks"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "completed_slot_tasks_slotId_employeeId_date_key" ON "completed_slot_tasks"("slotId", "employeeId", "date");
