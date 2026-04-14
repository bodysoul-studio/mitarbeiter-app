import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Roles
  const checkIn = await prisma.role.create({
    data: { name: "Check-In", color: "#3B82F6" },
  });
  const runner = await prisma.role.create({
    data: { name: "Runner", color: "#10B981" },
  });
  const cleaning = await prisma.role.create({
    data: { name: "Putzkraft", color: "#F59E0B" },
  });

  // Admin user (admin / admin123)
  await prisma.adminUser.create({
    data: {
      username: "admin",
      passwordHash: hashSync("admin123", 10),
    },
  });

  // Sample employees
  await prisma.employee.create({
    data: { name: "Max Mustermann", pin: hashSync("1234", 10), roleId: checkIn.id },
  });
  await prisma.employee.create({
    data: { name: "Anna Schmidt", pin: hashSync("5678", 10), roleId: runner.id },
  });
  await prisma.employee.create({
    data: { name: "Lisa Weber", pin: hashSync("9012", 10), roleId: cleaning.id },
  });

  // Check-In checklists
  const checkInAfternoon = await prisma.checklist.create({
    data: {
      title: "Check-In Nachmittag",
      roleId: checkIn.id,
      startTime: "16:00",
      endTime: "20:00",
      sortOrder: 0,
    },
  });
  await prisma.checklistItem.createMany({
    data: [
      { checklistId: checkInAfternoon.id, title: "Empfangsbereich vorbereiten", sortOrder: 0 },
      { checklistId: checkInAfternoon.id, title: "Computer hochfahren", sortOrder: 1 },
      { checklistId: checkInAfternoon.id, title: "Handtücher auffüllen", sortOrder: 2 },
      { checklistId: checkInAfternoon.id, title: "Kasse prüfen", sortOrder: 3 },
    ],
  });

  const checkInEvening = await prisma.checklist.create({
    data: {
      title: "Check-In Abend",
      roleId: checkIn.id,
      startTime: "20:00",
      endTime: "23:00",
      sortOrder: 1,
    },
  });
  await prisma.checklistItem.createMany({
    data: [
      { checklistId: checkInEvening.id, title: "Kursraum prüfen", requiresPhoto: true, sortOrder: 0 },
      { checklistId: checkInEvening.id, title: "Kasse abrechnen", sortOrder: 1 },
      { checklistId: checkInEvening.id, title: "Türen abschließen", sortOrder: 2 },
    ],
  });

  // Runner checklists
  const runnerAfternoon = await prisma.checklist.create({
    data: {
      title: "Runner Nachmittag",
      roleId: runner.id,
      startTime: "14:00",
      endTime: "18:00",
      sortOrder: 0,
    },
  });
  await prisma.checklistItem.createMany({
    data: [
      { checklistId: runnerAfternoon.id, title: "Getränke auffüllen", sortOrder: 0 },
      { checklistId: runnerAfternoon.id, title: "Geräte desinfizieren", sortOrder: 1 },
      { checklistId: runnerAfternoon.id, title: "Handtücher verteilen", sortOrder: 2 },
    ],
  });

  // Cleaning checklists
  const cleaningEvening = await prisma.checklist.create({
    data: {
      title: "Putzkraft Abend",
      roleId: cleaning.id,
      startTime: "21:00",
      endTime: "23:00",
      sortOrder: 0,
    },
  });
  await prisma.checklistItem.createMany({
    data: [
      { checklistId: cleaningEvening.id, title: "Umkleiden reinigen", requiresPhoto: true, sortOrder: 0 },
      { checklistId: cleaningEvening.id, title: "Duschen reinigen", requiresPhoto: true, sortOrder: 1 },
      { checklistId: cleaningEvening.id, title: "Böden wischen", sortOrder: 2 },
      { checklistId: cleaningEvening.id, title: "Mülleimer leeren", sortOrder: 3 },
    ],
  });

  // App config
  await prisma.appConfig.create({
    data: { key: "allowed_networks", value: JSON.stringify(["192.168.0.0/16", "10.0.0.0/8"]) },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
