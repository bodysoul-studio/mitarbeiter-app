-- CreateTable
CREATE TABLE "shift_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "leadMinutes" INTEGER NOT NULL DEFAULT 30,
    "lagMinutes" INTEGER NOT NULL DEFAULT 30,
    "minStaff" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "shift_rules_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_rules_roleId_key" ON "shift_rules"("roleId");
