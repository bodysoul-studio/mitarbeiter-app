// Reads data-export.json and re-creates everything in the database
// pointed to by the current DATABASE_URL. Inserts in dependency order.
//
// Usage:
//   1. Point DATABASE_URL to the new (empty) Postgres
//   2. Run `npx prisma migrate deploy` (or `migrate dev`) to create tables
//   3. Run: npx tsx scripts/import-data.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

async function main() {
  const data = JSON.parse(fs.readFileSync("data-export.json", "utf-8")) as Record<string, Row[]>;

  function rows(name: string): Row[] {
    return data[name] || [];
  }

  async function insert<T extends keyof typeof prisma>(
    modelName: T,
    items: Row[],
    label: string,
  ) {
    if (items.length === 0) {
      console.log(`  ${label}: skipped (empty)`);
      return;
    }
    // @ts-expect-error - dynamic model access
    await prisma[modelName].createMany({ data: items });
    console.log(`  ${label}: ${items.length} inserted`);
  }

  console.log("Importing in dependency order...\n");

  // Roots
  await insert("role", rows("role"), "role");
  await insert("adminUser", rows("adminUser"), "adminUser");
  await insert("courseRoom", rows("courseRoom"), "courseRoom");
  await insert("dailyTask", rows("dailyTask"), "dailyTask");
  await insert("emergencyGuide", rows("emergencyGuide"), "emergencyGuide");
  await insert("appConfig", rows("appConfig"), "appConfig");
  await insert("adminNotification", rows("adminNotification"), "adminNotification");

  // Depends on Role / CourseRoom
  await insert("employee", rows("employee"), "employee");
  await insert("courseRoomActivity", rows("courseRoomActivity"), "courseRoomActivity");
  await insert("skill", rows("skill"), "skill");
  await insert("shiftTemplate", rows("shiftTemplate"), "shiftTemplate");
  await insert("shiftRule", rows("shiftRule"), "shiftRule");
  await insert("checklist", rows("checklist"), "checklist");
  await insert("dayTemplate", rows("dayTemplate"), "dayTemplate");

  // Depends on Employee
  await insert("employeeSchedule", rows("employeeSchedule"), "employeeSchedule");
  await insert("shiftAssignment", rows("shiftAssignment"), "shiftAssignment");
  await insert("timeRecord", rows("timeRecord"), "timeRecord");

  // Depends on TimeRecord
  await insert("pauseRecord", rows("pauseRecord"), "pauseRecord");

  // Depends on ShiftAssignment
  await insert("shiftSwapRequest", rows("shiftSwapRequest"), "shiftSwapRequest");

  // ChecklistItem has self-reference (parentId) — 2-pass
  const items = rows("checklistItem");
  if (items.length > 0) {
    const withoutParent = items.map((i) => ({ ...i, parentId: null }));
    await prisma.checklistItem.createMany({ data: withoutParent });
    let updated = 0;
    for (const i of items) {
      if (i.parentId) {
        await prisma.checklistItem.update({
          where: { id: i.id as string },
          data: { parentId: i.parentId as string },
        });
        updated++;
      }
    }
    console.log(`  checklistItem: ${items.length} inserted (${updated} parent links restored)`);
  }

  // Depends on Checklist / ChecklistItem / Employee
  await insert("checklistSuggestion", rows("checklistSuggestion"), "checklistSuggestion");

  // Depends on DayTemplate / Checklist / CourseRoom
  await insert("dayTemplateSlot", rows("dayTemplateSlot"), "dayTemplateSlot");

  // Completions (depend on items + employees)
  await insert("completedItem", rows("completedItem"), "completedItem");
  await insert("completedSlotTask", rows("completedSlotTask"), "completedSlotTask");
  await insert("completedSkill", rows("completedSkill"), "completedSkill");
  await insert("completedTask", rows("completedTask"), "completedTask");

  console.log("\n✓ Import complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
