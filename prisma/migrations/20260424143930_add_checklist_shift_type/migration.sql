-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_checklists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL DEFAULT '',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "checklists_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_checklists" ("createdAt", "endTime", "id", "isActive", "roleId", "sortOrder", "startTime", "title", "updatedAt") SELECT "createdAt", "endTime", "id", "isActive", "roleId", "sortOrder", "startTime", "title", "updatedAt" FROM "checklists";
DROP TABLE "checklists";
ALTER TABLE "new_checklists" RENAME TO "checklists";
CREATE INDEX "checklists_roleId_idx" ON "checklists"("roleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
