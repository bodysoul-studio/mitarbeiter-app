-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shift_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftTemplateId" TEXT,
    "label" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "notes" TEXT,
    "wasSwapped" BOOLEAN NOT NULL DEFAULT false,
    "originalEmployeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shift_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_assignments_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shift_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_shift_assignments" ("createdAt", "date", "employeeId", "endTime", "id", "label", "notes", "roleId", "shiftTemplateId", "startTime", "updatedAt") SELECT "createdAt", "date", "employeeId", "endTime", "id", "label", "notes", "roleId", "shiftTemplateId", "startTime", "updatedAt" FROM "shift_assignments";
DROP TABLE "shift_assignments";
ALTER TABLE "new_shift_assignments" RENAME TO "shift_assignments";
CREATE INDEX "shift_assignments_employeeId_date_idx" ON "shift_assignments"("employeeId", "date");
CREATE INDEX "shift_assignments_date_idx" ON "shift_assignments"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "admin_notifications_read_createdAt_idx" ON "admin_notifications"("read", "createdAt");
