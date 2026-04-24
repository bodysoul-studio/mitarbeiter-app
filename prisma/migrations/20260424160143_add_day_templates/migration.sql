-- CreateTable
CREATE TABLE "day_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "roleId" TEXT,
    "shiftType" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "day_templates_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "day_template_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayTemplateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "time" TEXT,
    "type" TEXT NOT NULL,
    "checklistId" TEXT,
    "taskTitle" TEXT,
    "taskDescription" TEXT,
    "taskRequiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "day_template_slots_dayTemplateId_fkey" FOREIGN KEY ("dayTemplateId") REFERENCES "day_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "day_template_slots_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "day_template_slots_dayTemplateId_sortOrder_idx" ON "day_template_slots"("dayTemplateId", "sortOrder");
