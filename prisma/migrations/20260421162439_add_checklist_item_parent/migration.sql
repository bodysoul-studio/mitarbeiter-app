-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "checklist_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "checklist_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_checklist_items" ("checklistId", "createdAt", "description", "id", "requiresPhoto", "sortOrder", "title", "updatedAt") SELECT "checklistId", "createdAt", "description", "id", "requiresPhoto", "sortOrder", "title", "updatedAt" FROM "checklist_items";
DROP TABLE "checklist_items";
ALTER TABLE "new_checklist_items" RENAME TO "checklist_items";
CREATE INDEX "checklist_items_checklistId_idx" ON "checklist_items"("checklistId");
CREATE INDEX "checklist_items_parentId_idx" ON "checklist_items"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
