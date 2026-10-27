import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ----------------------------------------------------
// BAGIAN I: Chat (Web & Telegram)
// ----------------------------------------------------
export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    channel: text("channel", { enum: ["web", "telegram"] }).notNull(),
    externalId: text("external_id"), // Telegram chat.id
    title: text("title"),
    model: text("model"), // Per-conversation model override
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    channelExtActiveIdx: index("conversations_channel_ext_active_idx").on(
      table.channel,
      table.externalId,
      table.isActive
    ),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    conversationCreatedIdx: index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
  })
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), // "systemPrompt", "model", "maxTokens", "dailyBudgetUsd", "baseUrl", "apiKey", "provider"
  value: text("value").notNull(),
});

export const dailyUsage = sqliteTable("daily_usage", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
});

export const processedUpdates = sqliteTable("processed_updates", {
  updateId: integer("update_id").primaryKey(), // cegah update Telegram diproses dua kali
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ----------------------------------------------------
// BAGIAN II: Generator Blueprint, PRD, dan MVC
// ----------------------------------------------------
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  idea: text("idea").notNull(),
  language: text("language").notNull().default("id"),
  status: text("status", { enum: ["pending", "running", "done", "failed"] })
    .notNull()
    .default("running"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["brief", "prd", "blueprint", "mvc", "review"],
    }).notNull(),
    version: integer("version").notNull().default(1),
    content: text("content").notNull(), // Markdown, atau JSON untuk brief dan review
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    projectTypeVersionIdx: index("documents_project_type_version_idx").on(
      table.projectId,
      table.type,
      table.version
    ),
  })
);

export const stageRuns = sqliteTable(
  "stage_runs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stage: text("stage", {
      enum: ["intake", "prd", "blueprint", "mvc", "review"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "done", "failed"],
    })
      .notNull()
      .default("pending"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
  },
  (table) => ({
    projectStageIdx: index("stage_runs_project_stage_idx").on(
      table.projectId,
      table.stage
    ),
  })
);

// ----------------------------------------------------
// Relations
// ----------------------------------------------------
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  documents: many(documents),
  stageRuns: many(stageRuns),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
}));

export const stageRunsRelations = relations(stageRuns, ({ one }) => ({
  project: one(projects, {
    fields: [stageRuns.projectId],
    references: [projects.id],
  }),
}));

// ----------------------------------------------------
// BAGIAN III: Pemilih Model Dinamis & Gateway Provider
// ----------------------------------------------------
export const providerConfigs = sqliteTable("provider_configs", {
  id: text("id").primaryKey().$defaultFn(() => "default"),
  preset: text("preset").notNull().default("9router"), // 9router | openrouter | openai | deepseek | groq | custom
  baseUrl: text("base_url").notNull().default("https://api.9router.com/v1"),
  apiKey: text("api_key").notNull().default(""), // AES-256-GCM encrypted
  model: text("model"), // global default model
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const modelCache = sqliteTable("model_cache", {
  baseUrl: text("base_url").primaryKey(), // cache key per gateway
  modelsJson: text("models_json").notNull(), // JSON array ModelInfo
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const favoriteModels = sqliteTable(
  "favorite_models",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    baseUrl: text("base_url").notNull(),
    modelId: text("model_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    baseUrlModelIdIdx: index("favorite_models_base_model_idx").on(
      table.baseUrl,
      table.modelId
    ),
  })
);

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type DailyUsage = typeof dailyUsage.$inferSelect;
export type ProcessedUpdate = typeof processedUpdates.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type StageRun = typeof stageRuns.$inferSelect;
export type NewStageRun = typeof stageRuns.$inferInsert;

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
export type ModelCache = typeof modelCache.$inferSelect;
export type NewModelCache = typeof modelCache.$inferInsert;
export type FavoriteModel = typeof favoriteModels.$inferSelect;
export type NewFavoriteModel = typeof favoriteModels.$inferInsert;
