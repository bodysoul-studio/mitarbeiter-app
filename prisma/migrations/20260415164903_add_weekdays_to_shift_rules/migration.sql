-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shift_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "roleId" TEXT NOT NULL,
    "leadMinutes" INTEGER NOT NULL DEFAULT 30,
    "lagMinutes" INTEGER NOT NULL DEFAULT 30,
    "minStaff" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TEXT NOT NULL DEFAULT '00:00',
    "windowEnd" TEXT NOT NULL DEFAULT '23:59',
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "weekdays" TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    CONSTRAINT "shift_rules_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_shift_rules" ("allDay", "id", "lagMinutes", "leadMinutes", "minStaff", "name", "roleId", "windowEnd", "windowStart") SELECT "allDay", "id", "lagMinutes", "leadMinutes", "minStaff", "name", "roleId", "windowEnd", "windowStart" FROM "shift_rules";
DROP TABLE "shift_rules";
ALTER TABLE "new_shift_rules" RENAME TO "shift_rules";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
