// Dumps every table from the current DATABASE_URL into data-export.json
// so it can be re-imported into a fresh Postgres after schema migration.
//
// Run with: npx tsx scripts/export-data.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const data = {
    role: await prisma.role.findMany(),
    adminUser: await prisma.adminUser.findMany(),
    employee: await prisma.employee.findMany(),
    employeeSchedule: await prisma.employeeSchedule.findMany(),

    courseRoom: await prisma.courseRoom.findMany(),
    courseRoomActivity: await prisma.courseRoomActivity.findMany(),

    checklist: await prisma.checklist.findMany(),
    checklistItem: await prisma.checklistItem.findMany(),
    checklistSuggestion: await prisma.checklistSuggestion.findMany(),

    dayTemplate: await prisma.dayTemplate.findMany(),
    dayTemplateSlot: await prisma.dayTemplateSlot.findMany(),

    skill: await prisma.skill.findMany(),
    completedSkill: await prisma.completedSkill.findMany(),

    dailyTask: await prisma.dailyTask.findMany(),
    completedTask: await prisma.completedTask.findMany(),

    completedItem: await prisma.completedItem.findMany(),
    completedSlotTask: await prisma.completedSlotTask.findMany(),

    timeRecord: await prisma.timeRecord.findMany(),
    pauseRecord: await prisma.pauseRecord.findMany(),

    emergencyGuide: await prisma.emergencyGuide.findMany(),
    appConfig: await prisma.appConfig.findMany(),
    adminNotification: await prisma.adminNotification.findMany(),

    shiftTemplate: await prisma.shiftTemplate.findMany(),
    shiftAssignment: await prisma.shiftAssignment.findMany(),
    shiftSwapRequest: await prisma.shiftSwapRequest.findMany(),
    shiftRule: await prisma.shiftRule.findMany(),
  };

  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, (v as unknown[]).length]),
  );
  console.log("Exported counts:", counts);

  fs.writeFileSync("data-export.json", JSON.stringify(data, null, 2));
  console.log("\n✓ Wrote data-export.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
