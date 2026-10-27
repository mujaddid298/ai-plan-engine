import * as dotenv from "dotenv";
dotenv.config();

import { bot } from "../src/lib/telegram/bot";

async function setWebhook() {
  console.log("🌐 Mendaftarkan Webhook Telegram ke Server Produksi...");

  const appUrl = process.env.APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!appUrl || appUrl.includes("localhost")) {
    console.error("❌ APP_URL harus merupakan domain HTTPS publik yang valid (contoh: https://my-bot.vercel.app)");
    console.error(`   Nilai APP_URL saat ini: "${appUrl}"`);
    process.exit(1);
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram`;
  console.log(`📍 Webhook Target URL: ${webhookUrl}`);

  await bot.api.setWebhook(webhookUrl, {
    secret_token: secret || undefined,
    drop_pending_updates: true,
  });

  const webhookInfo = await bot.api.getWebhookInfo();
  console.log("✅ Webhook berhasil didaftarkan!");
  console.log("ℹ️ Info Webhook:", {
    url: webhookInfo.url,
    has_custom_certificate: webhookInfo.has_custom_certificate,
    pending_update_count: webhookInfo.pending_update_count,
  });
}

setWebhook().catch((err) => {
  console.error("❌ Gagal mendaftarkan webhook:", err);
  process.exit(1);
});
