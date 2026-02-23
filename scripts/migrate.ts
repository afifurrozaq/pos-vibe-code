import { initDb } from "../server/db";

async function main() {
  try {
    await initDb();
    console.log("Migrations completed.");    
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

main();

