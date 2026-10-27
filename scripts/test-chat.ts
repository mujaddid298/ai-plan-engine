import * as dotenv from "dotenv";
dotenv.config();

import { handleChatMessage } from "../src/services/chat";
import { db, conversations, messages, dailyUsage } from "../src/lib/db";
import { desc } from "drizzle-orm";

async function main() {
  console.log("🚀 Testing Chat Service (Tahap 2)...");
  console.log("-----------------------------------------");

  const prompt = process.argv[2] || "Halo! Coba jelaskan secara singkat konsep arsitektur AI Personal ini.";
  console.log(`💬 User Prompt: "${prompt}"`);

  // Check if API key is present
  if (!process.env.AI_API_KEY || process.env.AI_API_KEY === "your_ai_api_key_here") {
    console.log("\n⚠️ Catatan: AI_API_KEY belum diisi di file .env.");
    console.log("   Uji coba akan memverifikasi database & skema terlebih dahulu.");
  }

  try {
    const res = await handleChatMessage({
      channel: "web",
      content: prompt,
    });

    console.log("\n✅ AI Response Received:");
    console.log(`🤖 Model: ${res.model}`);
    console.log(`🆔 Conversation ID: ${res.conversationId}`);
    console.log(`📊 Tokens: Input=${res.tokens.input}, Output=${res.tokens.output}`);
    console.log("-----------------------------------------");
    console.log(res.reply);
    console.log("-----------------------------------------");

    // Check database records
    const latestConv = await db.query.conversations.findFirst({
      orderBy: desc(conversations.createdAt),
    });
    const latestMsgs = await db.query.messages.findMany({
      orderBy: desc(messages.createdAt),
      limit: 2,
    });
    const usage = await db.query.dailyUsage.findMany();

    console.log("\n📦 Verifikasi Database SQLite (local.db):");
    console.log(`- Conversation tersimpan: "${latestConv?.title}" (ID: ${latestConv?.id})`);
    console.log(`- Pesan tersimpan: ${latestMsgs.length} pesan terakhir`);
    console.log(`- Penggunaan harian terdata:`, usage);
  } catch (error: any) {
    console.error("\n❌ Error saat menjalankan chat service:", error.message || error);
    if (error.status === 401 || error.code === "invalid_api_key") {
      console.log("💡 Tips: Periksa kembali AI_API_KEY dan AI_PROVIDER di file .env Anda.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
