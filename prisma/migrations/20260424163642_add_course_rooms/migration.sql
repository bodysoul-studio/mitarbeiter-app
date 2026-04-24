-- CreateTable
CREATE TABLE "course_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "course_room_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseRoomId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    CONSTRAINT "course_room_activities_courseRoomId_fkey" FOREIGN KEY ("courseRoomId") REFERENCES "course_rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_day_template_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayTemplateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "time" TEXT,
    "type" TEXT NOT NULL,
    "checklistId" TEXT,
    "taskTitle" TEXT,
    "taskDescription" TEXT,
    "taskRequiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "courseRoomId" TEXT,
    "leadMinutes" INTEGER NOT NULL DEFAULT 15,
    CONSTRAINT "day_template_slots_dayTemplateId_fkey" FOREIGN KEY ("dayTemplateId") REFERENCES "day_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "day_template_slots_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "day_template_slots_courseRoomId_fkey" FOREIGN KEY ("courseRoomId") REFERENCES "course_rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_day_template_slots" ("checklistId", "dayTemplateId", "id", "sortOrder", "taskDescription", "taskRequiresPhoto", "taskTitle", "time", "type") SELECT "checklistId", "dayTemplateId", "id", "sortOrder", "taskDescription", "taskRequiresPhoto", "taskTitle", "time", "type" FROM "day_template_slots";
DROP TABLE "day_template_slots";
ALTER TABLE "new_day_template_slots" RENAME TO "day_template_slots";
CREATE INDEX "day_template_slots_dayTemplateId_sortOrder_idx" ON "day_template_slots"("dayTemplateId", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "course_room_activities_courseRoomId_activityName_key" ON "course_room_activities"("courseRoomId", "activityName");
