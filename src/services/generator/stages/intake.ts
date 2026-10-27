import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { loadPersona, loadPromptTemplate, fillTemplate, extractJSON } from "../prompt-loader";
import { validateBriefJSON, ProductBrief, ProductBriefSchema, ValidationIssue } from "../validators";

export interface IntakeInput {
  idea: string;
  language?: string;
}

export interface IntakeResult {
  brief: ProductBrief;
  rawContent: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Stage 0: Intake — Convert raw idea into structured Product Brief JSON
 */
export async function runIntake(input: IntakeInput): Promise<IntakeResult> {
  const { idea, language = "Indonesia" } = input;

  const persona = loadPersona(language);
  const template = loadPromptTemplate("intake");

  const userPrompt = fillTemplate(template, {
    IDE: idea,
    BAHASA: language,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: persona },
    { role: "user", content: userPrompt },
  ];

  const config = await getModelConfig();

  const result = await generateReply(messages, {
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: 0.4, // Lower temp for structured output
  });

  // Extract and validate JSON
  const jsonStr = extractJSON(result.content);
  const validation = validateBriefJSON(jsonStr);

  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i: ValidationIssue) => i.type === "error")
      .map((i: ValidationIssue) => i.message)
      .join("; ");

    // Attempt one retry with error feedback
    const retryMessages: ChatMessage[] = [
      { role: "system", content: persona },
      { role: "user", content: userPrompt },
      { role: "assistant", content: result.content },
      {
        role: "user",
        content: `JSON yang kamu hasilkan tidak valid. Error: ${errorMessages}. Perbaiki dan keluarkan HANYA JSON yang valid sesuai skema, tanpa teks tambahan.`,
      },
    ];

    const retryResult = await generateReply(retryMessages, {
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: 0.2,
    });

    const retryJson = extractJSON(retryResult.content);
    const retryValidation = validateBriefJSON(retryJson);

    if (!retryValidation.valid) {
      const finalErrors = retryValidation.issues
        .filter((i: ValidationIssue) => i.type === "error")
        .map((i: ValidationIssue) => i.message)
        .join("; ");
      throw new Error(`Brief JSON gagal validasi setelah retry: ${finalErrors}`);
    }

    const parsed = ProductBriefSchema.parse(JSON.parse(retryJson));
    return {
      brief: parsed,
      rawContent: retryJson,
      inputTokens: result.inputTokens + retryResult.inputTokens,
      outputTokens: result.outputTokens + retryResult.outputTokens,
      model: result.model,
    };
  }

  const parsed = ProductBriefSchema.parse(JSON.parse(jsonStr));
  return {
    brief: parsed,
    rawContent: jsonStr,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
  };
}
