import { db, dailyUsage, settings } from "@/lib/db";
import { eq } from "drizzle-orm";

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Rough estimation: $3.00 per 1 million blended tokens for cost ceiling guard
const ESTIMATED_COST_PER_MILLION_TOKENS = 3.0;

export async function getDailyBudgetUsd(): Promise<number> {
  try {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "dailyBudgetUsd"),
    });

    if (setting?.value) {
      const val = parseFloat(setting.value);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (error) {
    console.warn("Could not query dailyBudgetUsd from settings:", error);
  }

  const envBudget = process.env.DAILY_BUDGET_USD;
  return envBudget ? parseFloat(envBudget) || 5.0 : 5.0;
}

export async function checkDailyBudget(): Promise<{ allowed: boolean; reason?: string; currentCostUsd: number; maxBudgetUsd: number }> {
  const today = getTodayDateString();
  const maxBudget = await getDailyBudgetUsd();

  const usage = await db.query.dailyUsage.findFirst({
    where: eq(dailyUsage.date, today),
  });

  const totalTokens = (usage?.inputTokens || 0) + (usage?.outputTokens || 0);
  const currentCostUsd = (totalTokens / 1_000_000) * ESTIMATED_COST_PER_MILLION_TOKENS;

  if (currentCostUsd >= maxBudget) {
    return {
      allowed: false,
      reason: `Anggaran harian tercapai ($${currentCostUsd.toFixed(2)} / $${maxBudget.toFixed(2)}). Silakan tunggu besok atau naikkan batas anggaran di pengaturan.`,
      currentCostUsd,
      maxBudgetUsd: maxBudget,
    };
  }

  return {
    allowed: true,
    currentCostUsd,
    maxBudgetUsd: maxBudget,
  };
}

export async function recordTokenUsage(inputTokens: number, outputTokens: number): Promise<void> {
  const today = getTodayDateString();

  const existing = await db.query.dailyUsage.findFirst({
    where: eq(dailyUsage.date, today),
  });

  if (existing) {
    await db
      .update(dailyUsage)
      .set({
        inputTokens: existing.inputTokens + inputTokens,
        outputTokens: existing.outputTokens + outputTokens,
        messageCount: existing.messageCount + 1,
      })
      .where(eq(dailyUsage.date, today));
  } else {
    await db.insert(dailyUsage).values({
      date: today,
      inputTokens,
      outputTokens,
      messageCount: 1,
    });
  }
}
