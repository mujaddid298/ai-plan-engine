import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { loadPersona, loadPromptTemplate, fillTemplate, extractMarkdown } from "../prompt-loader";
import { validateDocument, ValidationResult, ValidationIssue } from "../validators";

export interface MvcInput {
  briefJson: string;
  prdContent: string;
  blueprintContent: string;
  language?: string;
}

export interface MvcResult {
  content: string;
  validation: ValidationResult;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Stage 3: MVC Design — Generate Model-View-Controller design from all previous docs
 */
export async function runMvc(input: MvcInput): Promise<MvcResult> {
  const { briefJson, prdContent, blueprintContent, language = "Indonesia" } = input;

  const persona = loadPersona(language);
  const template = loadPromptTemplate("mvc");

  const userPrompt = fillTemplate(template, {
    BRIEF: briefJson,
    PRD: prdContent,
    BLUEPRINT: blueprintContent,
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
  let validation = validateDocument(content, "mvc");

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
        content: `Dokumen Desain MVC-mu kurang beberapa bagian wajib:\n${missingList}\n\nTambahkan HANYA bagian yang hilang tersebut. Format Markdown.`,
      },
    ];

    const fixResult = await generateReply(fixMessages, {
      model: config.model,
      maxTokens: 4096,
      temperature: 0.3,
    });

    const supplement = extractMarkdown(fixResult.content);
    content = content + "\n\n" + supplement;
    validation = validateDocument(content, "mvc");

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
