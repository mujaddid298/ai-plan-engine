import { db, conversations, messages, dailyUsage } from "../src/lib/db";

async function check() {
  console.log("🔍 Checking SQLite database content...");
  const convs = await db.query.conversations.findMany();
  const msgs = await db.query.messages.findMany();
  const usage = await db.query.dailyUsage.findMany();

  console.log(`- Total Conversations: ${convs.length}`);
  convs.forEach((c) => console.log(`  * [${c.channel}] id=${c.id} title="${c.title}" active=${c.isActive}`));

  console.log(`- Total Messages: ${msgs.length}`);
  msgs.forEach((m) => console.log(`  * [${m.role}] convId=${m.conversationId} content="${m.content.slice(0, 40)}..."`));

  console.log(`- Daily Usage records:`, usage);
}

check().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
