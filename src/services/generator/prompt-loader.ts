import * as fs from "fs";
import * as path from "path";

const PROMPTS_DIR = path.join(process.cwd(), "src", "prompts");

/**
 * Load a prompt template from src/prompts/<name>.md
 */
export function loadPromptTemplate(name: string): string {
  const filePath = path.join(PROMPTS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template prompt tidak ditemukan: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Load the shared persona system prompt
 */
export function loadPersona(language: string = "Indonesia"): string {
  const template = loadPromptTemplate("persona");
  return template.replace(/\{\{BAHASA\}\}/g, language);
}

/**
 * Replace placeholders in a template with actual values
 */
export function fillTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

/**
 * Extract JSON from AI response that may contain markdown code fences
 */
export function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try to find raw JSON (starts with { and ends with })
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/**
 * Extract Markdown content, removing any wrapping code fences
 */
export function extractMarkdown(text: string): string {
  // Remove wrapping markdown code fence if present
  const mdBlockMatch = text.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/);
  if (mdBlockMatch) {
    return mdBlockMatch[1].trim();
  }

  return text.trim();
}
