import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL || "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({
  url,
  authToken,
});

async function run() {
  console.log("Applying SQLite schema updates directly to", url);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS provider_configs (
      id TEXT PRIMARY KEY,
      preset TEXT NOT NULL DEFAULT '9router',
      base_url TEXT NOT NULL DEFAULT 'https://api.9router.com/v1',
      api_key TEXT NOT NULL DEFAULT '',
      model TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  console.log("✅ Table 'provider_configs' ready.");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS model_cache (
      base_url TEXT PRIMARY KEY,
      models_json TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
  console.log("✅ Table 'model_cache' ready.");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS favorite_models (
      id TEXT PRIMARY KEY,
      base_url TEXT NOT NULL,
      model_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  console.log("✅ Table 'favorite_models' ready.");

  try {
    await client.execute(`ALTER TABLE conversations ADD COLUMN model TEXT;`);
    console.log("✅ Column 'conversations.model' added.");
  } catch (err: any) {
    if (String(err.message).includes("duplicate column")) {
      console.log("ℹ️ Column 'conversations.model' already exists.");
    } else {
      console.log("Notice on conversations.model:", err.message);
    }
  }

  console.log("🎉 All tables and columns verified successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
