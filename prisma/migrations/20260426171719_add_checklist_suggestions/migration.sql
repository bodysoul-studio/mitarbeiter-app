-- CreateTable
CREATE TABLE "checklist_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "parentItemId" TEXT,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checklist_suggestions_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "checklist_suggestions_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "checklist_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "checklist_suggestions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "checklist_suggestions_checklistId_idx" ON "checklist_suggestions"("checklistId");

-- CreateIndex
CREATE INDEX "checklist_suggestions_createdAt_idx" ON "checklist_suggestions"("createdAt");
