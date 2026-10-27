import { db, conversations, messages, Conversation, Message } from "@/lib/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { checkDailyBudget, recordTokenUsage } from "@/lib/budget";
import {
  generateReply,
  streamReply,
  getModelConfig,
  ChatMessage,
  ModelResult,
} from "@/lib/ai/provider";

export interface SendMessageOptions {
  channel: "web" | "telegram";
  conversationId?: string;
  externalId?: string; // Telegram chat ID
  content: string;
  model?: string;
}

export interface ChatServiceResponse {
  conversationId: string;
  reply: string;
  model: string;
  tokens: {
    input: number;
    output: number;
  };
}

/**
 * Find active conversation or create a new one.
 */
export async function getOrCreateConversation(
  channel: "web" | "telegram",
  conversationId?: string,
  externalId?: string,
  initialTitle?: string
): Promise<Conversation> {
  // If a specific conversationId is provided (e.g. web route /c/[id])
  if (conversationId) {
    const found = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    if (found) return found;
  }

  // If Telegram, find the single active conversation for this chat.id
  if (channel === "telegram" && externalId) {
    const activeTg = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.channel, "telegram"),
        eq(conversations.externalId, externalId),
        eq(conversations.isActive, true)
      ),
      orderBy: desc(conversations.createdAt),
    });
    if (activeTg) return activeTg;
  }

  // Create new conversation
  const title = initialTitle ? initialTitle.slice(0, 50) : "Percakapan Baru";
  const [newConv] = await db
    .insert(conversations)
    .values({
      channel,
      externalId,
      title,
      isActive: true,
    })
    .returning();

  return newConv;
}

/**
 * End current active conversation and start a new one (used for /new command in Telegram)
 */
export async function startNewConversation(
  channel: "web" | "telegram",
  externalId?: string
): Promise<Conversation> {
  if (channel === "telegram" && externalId) {
    await db
      .update(conversations)
      .set({ isActive: false })
      .where(
        and(
          eq(conversations.channel, "telegram"),
          eq(conversations.externalId, externalId),
          eq(conversations.isActive, true)
        )
      );
  }

  return getOrCreateConversation(channel, undefined, externalId, "Percakapan Baru");
}

/**
 * Fetch last N messages formatted for AI provider.
 */
async function buildHistoryContext(
  conversationId: string,
  limitCount = 20
): Promise<ChatMessage[]> {
  const recent = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: desc(messages.createdAt),
    limit: limitCount,
  });

  // Re-order ascending for chronological order
  const chronological = recent.reverse();

  return chronological.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
}

/**
 * Main handler for non-streaming messages (Telegram, CLI tests).
 */
export async function handleChatMessage(
  options: SendMessageOptions
): Promise<ChatServiceResponse> {
  const { channel, conversationId, externalId, content } = options;

  // 1. Check Daily Budget
  const budgetCheck = await checkDailyBudget();
  if (!budgetCheck.allowed) {
    return {
      conversationId: conversationId || "unknown",
      reply: budgetCheck.reason || "Batas anggaran harian tercapai.",
      model: "system",
      tokens: { input: 0, output: 0 },
    };
  }

  // 2. Resolve Conversation
  const conv = await getOrCreateConversation(channel, conversationId, externalId, content);

  if (options.model && options.model !== conv.model) {
    await db
      .update(conversations)
      .set({ model: options.model, updatedAt: new Date() })
      .where(eq(conversations.id, conv.id));
    conv.model = options.model;
  }

  // 3. Save User Message
  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content,
  });

  // 4. Retrieve Context & System Prompt
  const config = await getModelConfig();
  const activeModel = options.model || conv.model || config.model;

  if (!activeModel) {
    throw new Error("Belum ada model dipilih. Silakan pilih model di Pengaturan atau kolom chat.");
  }

  const history = await buildHistoryContext(conv.id, 20);

  const fullPrompt: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    ...history,
  ];

  // 5. Generate AI Reply
  const result = await generateReply(fullPrompt, {
    model: activeModel,
    maxTokens: config.maxTokens,
  });

  // 6. Save Assistant Reply to Database
  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: result.content,
    model: result.model || activeModel,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  // 7. Update conversation updated_at & title if first message
  await db
    .update(conversations)
    .set({
      updatedAt: new Date(),
      title: conv.title === "Percakapan Baru" ? content.slice(0, 40) : conv.title,
    })
    .where(eq(conversations.id, conv.id));

  // 8. Record daily token usage
  await recordTokenUsage(result.inputTokens, result.outputTokens);

  return {
    conversationId: conv.id,
    reply: result.content,
    model: result.model,
    tokens: {
      input: result.inputTokens,
      output: result.outputTokens,
    },
  };
}

/**
 * Main handler for streaming messages (Web API route).
 */
export async function handleChatStream(options: SendMessageOptions): Promise<{
  conversationId: string;
  model: string;
  chunkStream: AsyncGenerator<string, void, unknown>;
  onFinish: () => Promise<ModelResult>;
}> {
  const { channel, conversationId, externalId, content } = options;

  // 1. Check Daily Budget
  const budgetCheck = await checkDailyBudget();
  if (!budgetCheck.allowed) {
    const errorMsg = budgetCheck.reason || "Batas anggaran harian tercapai.";
    const errorStream = async function* (): AsyncGenerator<string, void, unknown> {
      yield errorMsg;
    };
    return {
      conversationId: conversationId || "unknown",
      model: "system",
      chunkStream: errorStream(),
      onFinish: async () => ({
        content: errorMsg,
        inputTokens: 0,
        outputTokens: 0,
        model: "system",
      }),
    };
  }

  // 2. Resolve Conversation
  const conv = await getOrCreateConversation(channel, conversationId, externalId, content);

  if (options.model && options.model !== conv.model) {
    await db
      .update(conversations)
      .set({ model: options.model, updatedAt: new Date() })
      .where(eq(conversations.id, conv.id));
    conv.model = options.model;
  }

  // 3. Save User Message
  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content,
  });

  // 4. Retrieve Context & System Prompt
  const config = await getModelConfig();
  const activeModel = options.model || conv.model || config.model;

  if (!activeModel) {
    throw new Error("Belum ada model dipilih. Silakan pilih model di Pengaturan atau kolom chat.");
  }

  const history = await buildHistoryContext(conv.id, 20);

  const fullPrompt: ChatMessage[] = [
    { role: "system", content: config.systemPrompt },
    ...history,
  ];

  // 5. Open stream to AI model
  const { chunkStream, getResult } = await streamReply(fullPrompt, {
    model: activeModel,
    maxTokens: config.maxTokens,
  });

  const onFinish = async (): Promise<ModelResult> => {
    const result = await getResult();

    // Save assistant message to database
    await db.insert(messages).values({
      conversationId: conv.id,
      role: "assistant",
      content: result.content,
      model: result.model || activeModel,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    // Update conversation title and timestamp
    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
        title: conv.title === "Percakapan Baru" ? content.slice(0, 40) : conv.title,
      })
      .where(eq(conversations.id, conv.id));

    // Record usage
    await recordTokenUsage(result.inputTokens, result.outputTokens);

    return result;
  };

  return {
    conversationId: conv.id,
    model: activeModel,
    chunkStream,
    onFinish,
  };
}

/**
 * Update active model for a specific conversation
 */
export async function updateConversationModel(
  conversationId: string,
  model: string
): Promise<void> {
  await db
    .update(conversations)
    .set({
      model,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}
