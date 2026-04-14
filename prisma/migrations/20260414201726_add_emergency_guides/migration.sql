-- CreateTable
CREATE TABLE "emergency_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Allgemein',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
