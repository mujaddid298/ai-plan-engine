import { z } from "zod";

const envSchema = z.object({
  // AI Model Provider
  AI_PROVIDER: z.string().default("openrouter"),
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
  AI_MODEL: z.string().default("anthropic/claude-3.5-sonnet"),
  AI_BASE_URL: z.string().url().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8, "TELEGRAM_WEBHOOK_SECRET should be at least 8 chars"),
  TELEGRAM_ALLOWED_USER_ID: z.string().min(1, "TELEGRAM_ALLOWED_USER_ID is required"),

  // Database (LibSQL / SQLite)
  DATABASE_URL: z.string().default("file:local.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // App Gate & Deployment
  APP_URL: z.string().url().optional(),
  APP_PASSWORD: z.string().optional(),
  DAILY_BUDGET_USD: z.coerce.number().default(5.0),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration. Check server logs or .env file.");
  }

  parsedEnv = result.data;
  return parsedEnv;
}

// Convenient getter
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const currentEnv = getEnv();
    return currentEnv[prop as keyof Env];
  },
});
