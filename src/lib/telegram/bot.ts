import { Bot, Context, InputFile, InlineKeyboard } from "grammy";
import { handleChatMessage, startNewConversation } from "@/services/chat";
import { db, settings, projects } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { checkDailyBudget } from "@/lib/budget";
import { getModelConfig } from "@/lib/ai/provider";
import { getProviderConfig, saveProviderConfig, getModelCache } from "@/lib/db/provider";
import type { ModelInfo } from "@/lib/ai/models";
import { runSingleStage, StageName } from "@/services/generator/pipeline";
import JSZip from "jszip";

// Map to store short callback keys (<64 bytes) for Telegram buttons
const telegramModelMap = new Map<string, string>();

const token = process.env.TELEGRAM_BOT_TOKEN || "dummy_token";

export const bot = new Bot(token);

// Middleware: Whitelist security (Hanya user ID yang diizinkan)
bot.use(async (ctx, next) => {
  const allowedId = process.env.TELEGRAM_ALLOWED_USER_ID;
  const fromId = ctx.from?.id?.toString();

  if (!allowedId || allowedId === "123456789") {
    // If not configured yet, notify once
    if (ctx.message?.text?.startsWith("/")) {
      await ctx.reply(
        `⚠️ TELEGRAM_ALLOWED_USER_ID belum dikonfigurasi di .env.\nID Telegram kamu adalah: <code>${fromId}</code>`,
        { parse_mode: "HTML" }
      );
    }
    return;
  }

  if (fromId !== allowedId) {
    console.warn(`Unauthorized access attempt from Telegram ID: ${fromId}`);
    // Silently ignore or deny without wasting tokens
    return;
  }

  await next();
});

// Command: /start
bot.command("start", async (ctx) => {
  await ctx.reply(
    `👋 <b>Halo! Asisten AI & Generator Dokumen Aktif.</b>\n\n` +
      `<b>Asisten Chat:</b>\n` +
      `• Kirim pesan teks langsung untuk ngobrol/tanya kode\n` +
      `• /new - Mulai sesi percakapan baru\n` +
      `• /model - Cek atau ubah model aktif\n` +
      `• /prompt - Ubah system prompt\n` +
      `• /budget - Cek pengeluaran token hari ini\n\n` +
      `<b>Generator Dokumen Software (1 Prompt):</b>\n` +
      `• <code>/buat &lt;ide&gt;</code> - Susun PRD, Blueprint, MVC, & Review otomatis\n` +
      `• <code>/proyek</code> - Lihat daftar proyek dokumen\n` +
      `• <code>/ulang &lt;id&gt; &lt;tahap&gt;</code> - Regenerasi tahap tertentu\n\n` +
      `• /help - Panduan lengkap perintah.`,
    { parse_mode: "HTML" }
  );
});

// Command: /help
bot.command("help", async (ctx) => {
  await ctx.reply(
    `📖 <b>Daftar Perintah Bot:</b>\n\n` +
      `<b>Fitur Chat:</b>\n` +
      `• <code>/new</code> : Tutup sesi lama & mulai baru.\n` +
      `• <code>/model</code> : Cek nama model aktif.\n` +
      `• <code>/model [nama]</code> : Ganti model (misal: <code>/model openai/gpt-4o</code>).\n` +
      `• <code>/prompt [teks]</code> : Ganti instruksi asisten.\n` +
      `• <code>/budget</code> : Cek pemakaian kuota harian.\n\n` +
      `<b>Fitur Generator Dokumen:</b>\n` +
      `• <code>/buat &lt;ide aplikasi&gt;</code> : Mulai pembuatan paket dokumen software lengkap (PRD, Blueprint, MVC, Review) dan kirim file ZIP.\n` +
      `• <code>/proyek</code> : Daftar riwayat proyek dokumen.\n` +
      `• <code>/ulang &lt;id&gt; &lt;tahap&gt;</code> : Regenerasi satu tahap (intake/prd/blueprint/mvc/review).\n`,
    { parse_mode: "HTML" }
  );
});

// Command: /new
bot.command("new", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  await startNewConversation("telegram", chatId);
  await ctx.reply("✨ <b>Percakapan baru telah dimulai!</b> Sesi sebelumnya telah ditutup.", {
    parse_mode: "HTML",
  });
});

// Command: /model
bot.command("model", async (ctx) => {
  const text = ctx.match?.trim();
  const cfg = await getProviderConfig();
  const cache = cfg?.baseUrl ? await getModelCache(cfg.baseUrl) : null;
  const cachedModels: ModelInfo[] = cache?.models || [];

  if (text) {
    // If text matches a search keyword in cached models, show matching buttons
    const matches = cachedModels.filter(
      (m) =>
        m.id.toLowerCase().includes(text.toLowerCase()) ||
        m.label.toLowerCase().includes(text.toLowerCase())
    );

    if (matches.length > 0 && !matches.some((m) => m.id === text)) {
      const keyboard = new InlineKeyboard();
      matches.slice(0, 8).forEach((m, idx) => {
        const key = `m:${idx}`;
        telegramModelMap.set(key, m.id);
        const displayLabel = m.id.length > 32 ? m.id.slice(0, 30) + "…" : m.id;
        keyboard.text(displayLabel, key).row();
      });

      await ctx.reply(
        `🔍 Ditemukan ${matches.length} model untuk "<code>${text}</code>":\nKlik tombol di bawah untuk memilih:`,
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );
      return;
    }

    // Direct model set
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, "model"),
    });

    if (existing) {
      await db.update(settings).set({ value: text }).where(eq(settings.key, "model"));
    } else {
      await db.insert(settings).values({ key: "model", value: text });
    }

    if (cfg) {
      await saveProviderConfig({ ...cfg, model: text });
    }

    await ctx.reply(`✅ Model berhasil diubah ke: <code>${text}</code>`, {
      parse_mode: "HTML",
    });
    return;
  }

  const config = await getModelConfig();

  if (cachedModels.length > 0) {
    const keyboard = new InlineKeyboard();
    cachedModels.slice(0, 8).forEach((m, idx) => {
      const key = `m:${idx}`;
      telegramModelMap.set(key, m.id);
      const displayLabel = m.id.length > 32 ? m.id.slice(0, 30) + "…" : m.id;
      keyboard.text(displayLabel, key).row();
    });

    await ctx.reply(
      `🤖 <b>Model AI aktif:</b> <code>${config.model || "Belum dipilih"}</code>\n\n` +
        `Pilih model gateway di bawah, atau ketik <code>/model &lt;kata&gt;</code> untuk mencari:`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
    return;
  }

  await ctx.reply(
    `🤖 Model AI aktif saat ini: <code>${config.model || "Belum dipilih"}</code>\n\n` +
      `Ketik <code>/model [nama_model]</code> untuk menggantinya.`,
    { parse_mode: "HTML" }
  );
});

// Callback Query: Handle model selection buttons
bot.callbackQuery(/^m:(\d+)$/, async (ctx) => {
  const key = ctx.callbackQuery.data;
  const modelId = telegramModelMap.get(key);

  if (!modelId) {
    await ctx.answerCallbackQuery({
      text: "Pilihan model kadaluarsa. Silakan ketik /model kembali.",
    });
    return;
  }

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, "model"),
  });

  if (existing) {
    await db.update(settings).set({ value: modelId }).where(eq(settings.key, "model"));
  } else {
    await db.insert(settings).values({ key: "model", value: modelId });
  }

  const cfg = await getProviderConfig();
  if (cfg) {
    await saveProviderConfig({ ...cfg, model: modelId });
  }

  await ctx.answerCallbackQuery({ text: `Model dipilih: ${modelId}` });
  await ctx.editMessageText(
    `✅ <b>Model AI berhasil diubah ke:</b>\n<code>${modelId}</code>`,
    { parse_mode: "HTML" }
  );
});

// Command: /prompt
bot.command("prompt", async (ctx) => {
  const text = ctx.match?.trim();

  if (text) {
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, "systemPrompt"),
    });

    if (existing) {
      await db.update(settings).set({ value: text }).where(eq(settings.key, "systemPrompt"));
    } else {
      await db.insert(settings).values({ key: "systemPrompt", value: text });
    }

    await ctx.reply(`✅ System prompt diperbarui!`, { parse_mode: "HTML" });
    return;
  }

  const config = await getModelConfig();
  await ctx.reply(
    `📝 <b>System Prompt saat ini:</b>\n\n<code>${config.systemPrompt}</code>\n\n` +
      `Ketik <code>/prompt [instruksi baru]</code> untuk mengubahnya.`,
    { parse_mode: "HTML" }
  );
});

// Command: /budget
bot.command("budget", async (ctx) => {
  const status = await checkDailyBudget();
  await ctx.reply(
    `📊 <b>Status Anggaran Hari Ini:</b>\n\n` +
      `• Estimasi Biaya: $${status.currentCostUsd.toFixed(4)}\n` +
      `• Batas Anggaran: $${status.maxBudgetUsd.toFixed(2)}\n` +
      `• Status: ${status.allowed ? "✅ Normal / Aktif" : "⚠️ Batas Tercapai"}`,
    { parse_mode: "HTML" }
  );
});

// Command: /buat <ide> — One-prompt full document engineering pipeline
bot.command("buat", async (ctx) => {
  const idea = ctx.match?.trim();
  if (!idea || idea.length < 5) {
    await ctx.reply(
      "⚠️ <b>Format salah:</b> Sertakan ide produk yang ingin dibuat.\n\n" +
        "Contoh:\n<code>/buat Aplikasi booking lapangan futsal untuk pemain dan pemilik lapangan di Indonesia</code>",
      { parse_mode: "HTML" }
    );
    return;
  }

  // Check budget
  const budget = await checkDailyBudget();
  if (!budget.allowed) {
    await ctx.reply(
      `⚠️ <b>Anggaran Terlampaui:</b> Pengeluaran hari ini ($${budget.currentCostUsd.toFixed(3)}) melebihi batas ($${budget.maxBudgetUsd.toFixed(2)}).`,
      { parse_mode: "HTML" }
    );
    return;
  }

  // Create project in DB
  const firstLine = idea.split("\n")[0].trim();
  const title = firstLine.length > 70 ? firstLine.slice(0, 67) + "..." : firstLine;
  const [project] = await db
    .insert(projects)
    .values({
      title,
      idea,
      language: "Indonesia",
      status: "running",
    })
    .returning();

  const statusMsg = await ctx.reply(
    `🚀 <b>Memulai Generator Dokumen...</b>\n\n` +
      `📦 <b>Proyek:</b> ${title}\n` +
      `🆔 <b>ID:</b> <code>${project.id}</code>\n\n` +
      `⏳ <i>Menjalankan Tahap 1/5: Product Brief...</i>`,
    { parse_mode: "HTML" }
  );

  const stages: { key: StageName; label: string }[] = [
    { key: "intake", label: "Product Brief" },
    { key: "prd", label: "PRD" },
    { key: "blueprint", label: "Blueprint Arsitektur" },
    { key: "mvc", label: "Desain MVC" },
    { key: "review", label: "Review & Audit" },
  ];

  const docContents: Record<string, string> = {};

  try {
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];

      // Update progress in telegram message
      await ctx.api
        .editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          `🚀 <b>Menyusun Dokumen Software:</b> ${title}\n\n` +
            stages
              .map((st, idx) => {
                if (idx < i) return `✅ <b>Tahap ${idx + 1}/5:</b> ${st.label}`;
                if (idx === i) return `⏳ <b>Tahap ${idx + 1}/5:</b> ${st.label} (sedang berjalan...)`;
                return `⚪ <b>Tahap ${idx + 1}/5:</b> ${st.label}`;
              })
              .join("\n"),
          { parse_mode: "HTML" }
        )
        .catch(() => {});

      const result = await runSingleStage(project.id, s.key, "Indonesia");
      docContents[s.key] = result.content;
    }

    // Mark project as done in DB
    await db
      .update(projects)
      .set({ status: "done" })
      .where(eq(projects.id, project.id));

    // Update status message
    await ctx.api
      .editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `✅ <b>Seluruh Dokumen Selesai Disusun!</b>\n\n` +
          `📦 <b>Proyek:</b> ${title}\n` +
          `🆔 <code>${project.id}</code>\n\n` +
          `📁 Sedang mengemas file ZIP untuk dikirim...`,
        { parse_mode: "HTML" }
      )
      .catch(() => {});

    // Create ZIP package
    const zip = new JSZip();
    zip.file("brief.json", docContents["intake"] || "");
    zip.file("prd.md", docContents["prd"] || "");
    zip.file("blueprint.md", docContents["blueprint"] || "");
    zip.file("mvc.md", docContents["mvc"] || "");
    zip.file("review.json", docContents["review"] || "");

    const combinedMarkdown = [
      `# ${title}`,
      "",
      `> Dibuat otomatis oleh ngopai`,
      "",
      "## 1. Product Brief",
      "```json",
      docContents["intake"] || "",
      "```",
      "",
      "## 2. PRD",
      docContents["prd"] || "",
      "",
      "## 3. Blueprint",
      docContents["blueprint"] || "",
      "",
      "## 4. Desain MVC",
      docContents["mvc"] || "",
      "",
      "## 5. Review",
      "```json",
      docContents["review"] || "",
      "```",
    ].join("\n");

    zip.file("PLAN.md", combinedMarkdown);
    zip.file(
      "README.md",
      `# ${title}\n\nPaket dokumen rekayasa perangkat lunak lengkap siap pakai untuk Antigravity/Cursor/Claude Code.\n`
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);

    // Send document ZIP to Telegram
    await ctx.replyWithDocument(
      new InputFile(zipBuffer, `${safeSlug}-documents.zip`),
      {
        caption: `📦 <b>Paket Dokumen Lengkap: ${title}</b>\n\nBerisi: <code>brief.json</code>, <code>prd.md</code>, <code>blueprint.md</code>, <code>mvc.md</code>, <code>review.json</code>, dan <code>PLAN.md</code>.`,
        parse_mode: "HTML",
      }
    );
  } catch (error: any) {
    console.error("Error in telegram /buat pipeline:", error);
    await ctx.reply(
      `❌ <b>Gagal Menyelesaikan Generator:</b> ${error.message || "Unknown error"}\n\n` +
        `ID Proyek: <code>${project.id}</code>. Kamu dapat melanjutkan atau memeriksa via Web.`,
      { parse_mode: "HTML" }
    );
  }
});

// Command: /proyek — List recent generated projects
bot.command("proyek", async (ctx) => {
  const allProjects = await db.query.projects.findMany({
    orderBy: desc(projects.createdAt),
    limit: 10,
    with: {
      documents: {
        columns: { type: true },
      },
    },
  });

  if (allProjects.length === 0) {
    await ctx.reply(
      "📁 <b>Belum ada proyek yang dibuat.</b>\n\nGunakan <code>/buat &lt;ide&gt;</code> untuk membuat dokumen software pertama.",
      { parse_mode: "HTML" }
    );
    return;
  }

  const listText = allProjects
    .map((p, idx) => {
      const dateStr = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          })
        : "-";
      return `${idx + 1}. <b>${p.title}</b>\n   🆔 <code>${p.id}</code> | ${p.documents.length} Dokumen | ${dateStr}`;
    })
    .join("\n\n");

  await ctx.reply(
    `📁 <b>Daftar Proyek Terakhir:</b>\n\n${listText}\n\n` +
      `💡 Buka di web: <code>http://localhost:3000/proyek</code>`,
    { parse_mode: "HTML" }
  );
});

// Command: /ulang <projectId> <tahap> — Regenerate single stage
bot.command("ulang", async (ctx) => {
  const args = ctx.match?.trim().split(/\s+/);
  if (!args || args.length < 2) {
    await ctx.reply(
      "⚠️ <b>Format salah:</b> Ketik <code>/ulang &lt;projectId&gt; &lt;tahap&gt;</code>\n\n" +
        "Pilihan tahap: <code>intake</code>, <code>prd</code>, <code>blueprint</code>, <code>mvc</code>, <code>review</code>",
      { parse_mode: "HTML" }
    );
    return;
  }

  const [projId, stageName] = args;
  const validStages: StageName[] = ["intake", "prd", "blueprint", "mvc", "review"];

  if (!validStages.includes(stageName as StageName)) {
    await ctx.reply(
      `⚠️ Tahap <code>${stageName}</code> tidak dikenal. Pilihan: ${validStages.join(", ")}`,
      { parse_mode: "HTML" }
    );
    return;
  }

  await ctx.reply(
    `⏳ <b>Memulai regenerasi tahap ${stageName} untuk proyek <code>${projId}</code>...</b>`,
    { parse_mode: "HTML" }
  );

  try {
    const result = await runSingleStage(projId, stageName as StageName, "Indonesia");
    await ctx.reply(
      `✅ <b>Regenerasi tahap ${stageName} selesai!</b> (${result.inputTokens + result.outputTokens} tokens)`,
      { parse_mode: "HTML" }
    );
  } catch (err: any) {
    await ctx.reply(`❌ <b>Gagal regenerasi:</b> ${err.message}`, { parse_mode: "HTML" });
  }
});

// Function to split long telegram messages (Telegram limit is 4096 characters)
function splitMessage(text: string, chunkSize = 3900): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= chunkSize) {
      chunks.push(remaining);
      break;
    }

    // Try to split by newline or code fence near the chunk boundary
    let splitIdx = remaining.lastIndexOf("\n", chunkSize);
    if (splitIdx === -1 || splitIdx < chunkSize / 2) {
      splitIdx = chunkSize;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}

// Handler for normal chat text messages
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const userText = ctx.message.text;

  // Send typing indicator
  await ctx.replyWithChatAction("typing");

  // Keep sending typing indicator every 4 seconds until AI finishes
  const typingInterval = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  try {
    const result = await handleChatMessage({
      channel: "telegram",
      externalId: chatId,
      content: userText,
    });

    clearInterval(typingInterval);

    // Split and send chunks
    const messageChunks = splitMessage(result.reply);
    for (const chunk of messageChunks) {
      await ctx.reply(chunk);
    }
  } catch (error: any) {
    clearInterval(typingInterval);
    console.error("Telegram chat handling error:", error);
    await ctx.reply(
      `❌ Terjadi kesalahan saat memproses pesan: ${error.message || "Unknown error"}`
    );
  }
});
