-- CreateTable
CREATE TABLE "pause_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeRecordId" TEXT NOT NULL,
    "pauseStart" DATETIME NOT NULL,
    "pauseEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pause_records_timeRecordId_fkey" FOREIGN KEY ("timeRecordId") REFERENCES "time_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "pause_records_timeRecordId_idx" ON "pause_records"("timeRecordId");
