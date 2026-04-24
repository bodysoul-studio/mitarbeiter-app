// Helper: kill any dev server running on ports 3000-3005
const kill = require("kill-port");

async function main() {
  for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
    try {
      await kill(port, "tcp");
      console.log(`Port ${port} freed`);
    } catch {
      // not in use, ignore
    }
  }
}

main();
