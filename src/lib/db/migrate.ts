import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

export async function runMigrations() {
  console.log("⏳ Running database migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations applied successfully!");
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
