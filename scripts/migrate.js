// Helper: kill dev server, run migration, regenerate Prisma client
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const kill = require("kill-port");

async function main() {
  console.log("→ Stoppe Dev-Server auf Ports 3000-3005...");
  for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
    try {
      await kill(port, "tcp");
    } catch { /* not in use */ }
  }

  // Wait for file handles to release
  await new Promise((r) => setTimeout(r, 1500));

  console.log("→ Entferne gesperrte Prisma-DLL...");
  const dllPath = path.join(
    __dirname,
    "..",
    "node_modules",
    ".prisma",
    "client",
    "query_engine-windows.dll.node"
  );
  try {
    fs.unlinkSync(dllPath);
  } catch { /* not there */ }

  const args = process.argv.slice(2).join(" ");
  const migrationName = args || `update_${Date.now()}`;

  console.log(`→ Führe Migration aus: ${migrationName}`);
  try {
    execSync(`npx prisma migrate dev --name ${migrationName}`, {
      stdio: "inherit",
    });
  } catch (e) {
    console.error("Migration fehlgeschlagen:", e.message);
    process.exit(1);
  }

  console.log("\n✓ Migration und Client-Generierung abgeschlossen.");
  console.log("  Starte den Dev-Server mit: npm run dev");
}

main();
