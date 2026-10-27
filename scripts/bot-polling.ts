import * as dotenv from "dotenv";
dotenv.config();

import { bot } from "../src/lib/telegram/bot";

async function runPolling() {
  console.log("🤖 Memulai Bot Telegram dalam mode Polling (Development)...");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ") {
    console.error("❌ TELEGRAM_BOT_TOKEN belum diisi dengan benar di file .env!");
    console.error("   Dapatkan token bot dari @BotFather di Telegram lalu masukkan ke .env.");
    process.exit(1);
  }

  const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID;
  console.log(`🔒 Whitelist Telegram User ID: ${allowedId || "BELUM DIKONFIGURASI"}`);

  // Fetch bot info
  const me = await bot.api.getMe();
  console.log(`✅ Terhubung sebagai bot: @${me.username} (${me.first_name})`);
  console.log("💬 Buka Telegram dan kirim pesan atau /start ke bot Anda!");
  console.log("   (Tekan Ctrl + C untuk menghentikan bot)");

  // Start long polling
  await bot.start({
    onStart: () => {
      console.log("⚡ Bot Telegram siap menerima pesan!");
    },
  });
}

runPolling().catch((err) => {
  console.error("❌ Gagal menjalankan polling bot:", err);
  process.exit(1);
});
