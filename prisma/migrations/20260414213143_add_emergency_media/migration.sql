-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_emergency_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Allgemein',
    "mediaUrls" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_emergency_guides" ("category", "createdAt", "id", "solution", "sortOrder", "title", "updatedAt") SELECT "category", "createdAt", "id", "solution", "sortOrder", "title", "updatedAt" FROM "emergency_guides";
DROP TABLE "emergency_guides";
ALTER TABLE "new_emergency_guides" RENAME TO "emergency_guides";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
