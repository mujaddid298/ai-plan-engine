import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { loadPersona, loadPromptTemplate, fillTemplate, extractMarkdown } from "../prompt-loader";
import { validateDocument, ValidationResult, ValidationIssue } from "../validators";

export interface BlueprintInput {
  briefJson: string;
  prdContent: string;
  language?: string;
}

export interface BlueprintResult {
  content: string;
  validation: ValidationResult;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Stage 2: Blueprint — Generate Architecture Blueprint from Brief + PRD
 */
export async function runBlueprint(input: BlueprintInput): Promise<BlueprintResult> {
  const { briefJson, prdContent, language = "Indonesia" } = input;

  const persona = loadPersona(language);
  const template = loadPromptTemplate("blueprint");

  const userPrompt = fillTemplate(template, {
    BRIEF: briefJson,
    PRD: prdContent,
    BAHASA: language,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: persona },
    { role: "user", content: userPrompt },
  ];

  const config = await getModelConfig();

  const result = await generateReply(messages, {
    model: config.model,
    maxTokens: Math.max(config.maxTokens, 8192),
    temperature: 0.5,
  });

  let content = extractMarkdown(result.content);

  // Validate
  let validation = validateDocument(content, "blueprint");

  // If missing headings (up to 4), try to supplement
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
        content: `Dokumen Blueprint-mu kurang beberapa bagian wajib:\n${missingList}\n\nTambahkan HANYA bagian yang hilang tersebut. Format Markdown.`,
      },
    ];

    const fixResult = await generateReply(fixMessages, {
      model: config.model,
      maxTokens: 4096,
      temperature: 0.3,
    });

    const supplement = extractMarkdown(fixResult.content);
    content = content + "\n\n" + supplement;
    validation = validateDocument(content, "blueprint");

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
