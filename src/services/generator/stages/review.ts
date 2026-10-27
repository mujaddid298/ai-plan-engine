import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { loadPersona, loadPromptTemplate, fillTemplate, extractJSON } from "../prompt-loader";
import { validateReviewJSON, ReviewResult, ReviewResultSchema, ValidationIssue } from "../validators";

export interface ReviewInput {
  briefJson: string;
  prdContent: string;
  blueprintContent: string;
  mvcContent: string;
  language?: string;
}

export interface ReviewStageResult {
  review: ReviewResult;
  rawContent: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Stage 4: Review — Cross-document consistency check, outputs JSON
 */
export async function runReview(input: ReviewInput): Promise<ReviewStageResult> {
  const { briefJson, prdContent, blueprintContent, mvcContent, language = "Indonesia" } = input;

  const persona = loadPersona(language);
  const template = loadPromptTemplate("review");

  const userPrompt = fillTemplate(template, {
    BRIEF: briefJson,
    PRD: prdContent,
    BLUEPRINT: blueprintContent,
    MVC: mvcContent,
    BAHASA: language,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: persona },
    { role: "user", content: userPrompt },
  ];

  const config = await getModelConfig();

  const result = await generateReply(messages, {
    model: config.model,
    maxTokens: Math.max(config.maxTokens, 4096),
    temperature: 0.3, // Low temp for analytical/critical review
  });

  const jsonStr = extractJSON(result.content);
  const validation = validateReviewJSON(jsonStr);

  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i: ValidationIssue) => i.type === "error")
      .map((i: ValidationIssue) => i.message)
      .join("; ");

    // One retry attempt
    const retryMessages: ChatMessage[] = [
      { role: "system", content: persona },
      { role: "user", content: userPrompt },
      { role: "assistant", content: result.content },
      {
        role: "user",
        content: `JSON review yang kamu hasilkan tidak valid. Error: ${errorMessages}. Perbaiki dan keluarkan HANYA JSON valid sesuai skema, tanpa teks tambahan.`,
      },
    ];

    const retryResult = await generateReply(retryMessages, {
      model: config.model,
      maxTokens: 4096,
      temperature: 0.2,
    });

    const retryJson = extractJSON(retryResult.content);
    const retryValidation = validateReviewJSON(retryJson);

    if (!retryValidation.valid) {
      const finalErrors = retryValidation.issues
        .filter((i: ValidationIssue) => i.type === "error")
        .map((i: ValidationIssue) => i.message)
        .join("; ");
      throw new Error(`Review JSON gagal validasi setelah retry: ${finalErrors}`);
    }

    const parsed = ReviewResultSchema.parse(JSON.parse(retryJson));
    return {
      review: parsed,
      rawContent: retryJson,
      inputTokens: result.inputTokens + retryResult.inputTokens,
      outputTokens: result.outputTokens + retryResult.outputTokens,
      model: result.model,
    };
  }

  const parsed = ReviewResultSchema.parse(JSON.parse(jsonStr));
  return {
    review: parsed,
    rawContent: jsonStr,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
  };
}
