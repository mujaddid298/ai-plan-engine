import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { loadPersona, loadPromptTemplate, fillTemplate, extractMarkdown } from "../prompt-loader";
import { validateDocument, validateNoPlaceholders, ValidationResult, ValidationIssue } from "../validators";

export interface PrdInput {
  briefJson: string;
  language?: string;
}

export interface PrdResult {
  content: string;
  validation: ValidationResult;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Stage 1: PRD — Generate Product Requirements Document from Brief
 */
export async function runPrd(input: PrdInput): Promise<PrdResult> {
  const { briefJson, language = "Indonesia" } = input;

  const persona = loadPersona(language);
  const template = loadPromptTemplate("prd");

  const userPrompt = fillTemplate(template, {
    BRIEF: briefJson,
    BAHASA: language,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: persona },
    { role: "user", content: userPrompt },
  ];

  const config = await getModelConfig();

  const result = await generateReply(messages, {
    model: config.model,
    maxTokens: Math.max(config.maxTokens, 8192), // PRD is long
    temperature: 0.5,
  });

  let content = extractMarkdown(result.content);

  // Validate
  let validation = validateDocument(content, "prd");

  // If missing headings, try to fix with a follow-up request
  const missingHeadings = validation.issues.filter(
    (i: ValidationIssue) => i.category === "heading_missing"
  );

  if (missingHeadings.length > 0 && missingHeadings.length <= 4) {
    const missingList = missingHeadings.map((i: ValidationIssue) => i.message).join("\n");

    const fixMessages: ChatMessage[] = [
      { role: "system", content: persona },
      { role: "user", content: userPrompt },
      { role: "assistant", content: result.content },
      {
        role: "user",
        content: `Dokumen PRD-mu kurang beberapa bagian wajib:\n${missingList}\n\nTambahkan HANYA bagian yang hilang tersebut (tidak perlu menulis ulang seluruh dokumen). Format Markdown.`,
      },
    ];

    const fixResult = await generateReply(fixMessages, {
      model: config.model,
      maxTokens: 4096,
      temperature: 0.3,
    });

    const supplement = extractMarkdown(fixResult.content);
    content = content + "\n\n" + supplement;

    validation = validateDocument(content, "prd");

    return {
      content,
      validation,
      inputTokens: result.inputTokens + fixResult.inputTokens,
      outputTokens: result.outputTokens + fixResult.outputTokens,
      model: result.model,
    };
  }

  return {
    content,
    validation,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
  };
}
