import { z } from "zod";

// ============================================================
// Zod Schemas for Brief (Tahap 0 output) and Review (Tahap 4 output)
// ============================================================

export const AsumsiSchema = z.object({
  id: z.string().regex(/^A-\d{2,}$/, "ID asumsi harus format A-01, A-02, dst."),
  isi: z.string().min(10, "Deskripsi asumsi terlalu pendek"),
  risikoJikaSalah: z.string().min(10, "Risiko harus dideskripsikan"),
});

export const ProductBriefSchema = z.object({
  namaProduk: z.string().min(2, "Nama produk wajib diisi"),
  ringkasan: z.string().min(20, "Ringkasan terlalu pendek (min 20 karakter)"),
  tipeProduk: z.enum(["web", "mobile", "api", "internal-tool", "marketplace", "lainnya"]),
  masalah: z.string().min(10, "Masalah utama harus dideskripsikan"),
  penggunaUtama: z.array(z.string()).min(1, "Minimal satu pengguna utama"),
  asumsi: z.array(AsumsiSchema).min(5, "Minimal 5 asumsi"),
  batasan: z.array(z.string()).min(1, "Minimal 1 batasan"),
  diLuarCakupan: z.array(z.string()).min(1, "Minimal 1 item di luar cakupan"),
  pertanyaanTerbuka: z.array(z.string()).min(1, "Minimal 1 pertanyaan terbuka"),
});

export const TemuanSchema = z.object({
  id: z.string().regex(/^REV-\d{3,}$/, "ID temuan harus format REV-001"),
  tingkat: z.enum(["kritis", "penting", "saran"]),
  dokumen: z.enum(["brief", "prd", "blueprint", "mvc"]),
  bagian: z.string().min(1),
  masalah: z.string().min(10, "Masalah harus dideskripsikan"),
  perbaikan: z.string().min(10, "Perbaikan harus dideskripsikan"),
});

export const IstilahTidakKonsistenSchema = z.object({
  istilah1: z.string(),
  istilah2: z.string(),
  dokumen: z.array(z.string()),
});

export const RisikoTersisaSchema = z.object({
  risiko: z.string(),
  tingkat: z.enum(["tinggi", "sedang", "rendah"]),
  saran: z.string(),
});

export const ReviewResultSchema = z.object({
  skorKonsistensi: z.number().min(0).max(100),
  ringkasanReview: z.string().min(20, "Ringkasan review terlalu pendek"),
  temuan: z.array(TemuanSchema),
  kebutuhanTanpaImplementasi: z.array(z.string()),
  nfrTanpaAlamat: z.array(z.string()),
  istilahTidakKonsisten: z.array(IstilahTidakKonsistenSchema),
  risikoTersisa: z.array(RisikoTersisaSchema),
});

// ============================================================
// Type Exports
// ============================================================

export type ProductBrief = z.infer<typeof ProductBriefSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ============================================================
// Heading Validators for Markdown Documents
// ============================================================

const PRD_REQUIRED_HEADINGS = [
  "Introduction",
  "Goals",
  "User Stories",
  "Functional Requirements",
  "Non-Goals",
  "Technical Considerations",
  "Success Metrics",
  "Open Questions",
];

const PRD_HEADING_ALIASES: Record<string, string[]> = {
  Introduction: ["introduction", "overview", "ringkasan eksekutif", "latar belakang"],
  Goals: ["goals", "tujuan", "tujuan dan metrik"],
  "User Stories": ["user stories", "user story", "cerita pengguna"],
  "Functional Requirements": ["functional requirements", "kebutuhan fungsional"],
  "Non-Goals": ["non-goals", "out of scope", "di luar cakupan"],
  "Technical Considerations": ["technical considerations", "pertimbangan teknis", "dependensi"],
  "Success Metrics": ["success metrics", "metrik keberhasilan", "metrik"],
  "Open Questions": ["open questions", "pertanyaan terbuka"],
};

const BLUEPRINT_REQUIRED_HEADINGS = [
  "Tujuan dan Konteks",
  "Driver Arsitektur",
  "Gaya Arsitektur",
  "Komponen",
  "Tech Stack",
  "Alur Data",
  "Strategi Data",
  "Keamanan",
  "Skalabilitas",
  "Deployment",
  "Observabilitas",
  "Estimasi Biaya",
  "Catatan Keputusan",
  "Risiko Teknis",
];

const MVC_REQUIRED_HEADINGS = [
  "Model",
  "Controller",
  "View",
  "Service Layer",
  "Validasi",
  "Struktur Folder",
  "Skema Database",
  "Matriks Keterlacakan",
  "Urutan Implementasi",
];

export type DocType = "prd" | "blueprint" | "mvc";

function getRequiredHeadings(docType: DocType): string[] {
  switch (docType) {
    case "prd":
      return PRD_REQUIRED_HEADINGS;
    case "blueprint":
      return BLUEPRINT_REQUIRED_HEADINGS;
    case "mvc":
      return MVC_REQUIRED_HEADINGS;
  }
}

// ============================================================
// Validation Result
// ============================================================

export interface ValidationIssue {
  type: "error" | "warning";
  category: string;
  message: string;
  details?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ============================================================
// 1. Check Required Headings
// ============================================================

export function validateHeadings(content: string, docType: DocType): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = getRequiredHeadings(docType);
  const contentLower = content.toLowerCase();

  for (const heading of required) {
    const headingLower = heading.toLowerCase();
    const aliases = (docType === "prd" && PRD_HEADING_ALIASES[heading])
      ? PRD_HEADING_ALIASES[heading]
      : [headingLower];

    const isPresent = aliases.some((alias) => {
      const headingPattern = new RegExp(`^#{1,4}\\s+.*${escapeRegex(alias)}`, "mi");
      return headingPattern.test(content) || contentLower.includes(alias);
    });

    if (!isPresent) {
      issues.push({
        type: "error",
        category: "heading_missing",
        message: `Heading wajib tidak ditemukan: "${heading}"`,
        details: `Dokumen ${docType.toUpperCase()} harus memiliki bagian "${heading}"`,
      });
    }
  }

  return issues;
}

// ============================================================
// 2. Check Forbidden Placeholders
// ============================================================

const FORBIDDEN_PLACEHOLDERS = [
  "TBD",
  "TODO",
  "FIXME",
  "lorem ipsum",
  "akan ditentukan",
  "to be determined",
  "placeholder",
  "belum ditentukan",
  "akan diisi",
  "[isi di sini]",
  "[fill in]",
  "xxx",
];

export function validateNoPlaceholders(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const placeholder of FORBIDDEN_PLACEHOLDERS) {
    const regex = new RegExp(`\\b${escapeRegex(placeholder)}\\b`, "gi");
    const matches = content.match(regex);

    if (matches && matches.length > 0) {
      issues.push({
        type: "error",
        category: "placeholder_found",
        message: `Placeholder terlarang ditemukan: "${placeholder}" (${matches.length}x)`,
        details: `Semua placeholder harus diganti dengan konten nyata`,
      });
    }
  }

  return issues;
}

// ============================================================
// 3. Check Referenced IDs Exist
// ============================================================

export interface IdCheckConfig {
  /** The content to check for ID references */
  content: string;
  /** The content (or combined contents) where IDs should be defined */
  sourceContent: string;
  /** Prefixes to check, e.g. ["FR-", "NFR-", "US-", "A-"] */
  prefixes: string[];
}

export function validateReferencedIds(config: IdCheckConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { content, sourceContent, prefixes } = config;

  for (const prefix of prefixes) {
    // Find all referenced IDs in content
    const refPattern = new RegExp(`${escapeRegex(prefix)}\\d{2,}`, "g");
    const referencedIds = new Set(content.match(refPattern) || []);
    const sourceIds = new Set(sourceContent.match(refPattern) || []);

    for (const refId of referencedIds) {
      if (!sourceIds.has(refId)) {
        issues.push({
          type: "warning",
          category: "id_not_found",
          message: `ID "${refId}" dirujuk tapi tidak ditemukan di dokumen sumber`,
          details: `Periksa apakah ID ini benar atau ada di dokumen yang sesuai`,
        });
      }
    }
  }

  return issues;
}

// ============================================================
// 4. Check Mermaid Diagram Validity
// ============================================================

/**
 * Basic Mermaid syntax validator (checks structure, not rendering).
 * For a full validation, use mermaid.js parser on the server.
 */
export function validateMermaid(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Extract all mermaid code blocks
  const mermaidBlocks = extractMermaidBlocks(content);

  if (mermaidBlocks.length === 0) {
    // Not an error for all doc types, but worth noting
    return issues;
  }

  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i].trim();
    const blockIssues = checkMermaidBlock(block, i + 1);
    issues.push(...blockIssues);
  }

  return issues;
}

function extractMermaidBlocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

function checkMermaidBlock(block: string, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = block.trim().split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    issues.push({
      type: "error",
      category: "mermaid_empty",
      message: `Blok Mermaid #${index} kosong`,
    });
    return issues;
  }

  const firstLine = lines[0].trim().toLowerCase();

  // Check for valid diagram type
  const validTypes = [
    "graph",
    "flowchart",
    "sequencediagram",
    "classDiagram",
    "erdiagram",
    "gantt",
    "pie",
    "statediagram",
    "journey",
    "gitgraph",
    "mindmap",
    "timeline",
    "c4context",
    "c4container",
    "c4component",
    "c4deployment",
  ];

  const hasValidType = validTypes.some((type) =>
    firstLine.startsWith(type.toLowerCase())
  );

  if (!hasValidType) {
    issues.push({
      type: "error",
      category: "mermaid_invalid_type",
      message: `Blok Mermaid #${index}: tipe diagram tidak dikenal ("${lines[0].trim()}")`,
      details: `Tipe valid: ${validTypes.join(", ")}`,
    });
  }

  // Check for common syntax issues
  if (block.includes("```")) {
    issues.push({
      type: "error",
      category: "mermaid_nested_backticks",
      message: `Blok Mermaid #${index}: ditemukan backtick bersarang di dalam blok`,
    });
  }

  // Check for balanced brackets
  const openParens = (block.match(/\(/g) || []).length;
  const closeParens = (block.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      type: "warning",
      category: "mermaid_unbalanced_parens",
      message: `Blok Mermaid #${index}: kurung tidak seimbang (buka: ${openParens}, tutup: ${closeParens})`,
    });
  }

  const openBrackets = (block.match(/\[/g) || []).length;
  const closeBrackets = (block.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push({
      type: "warning",
      category: "mermaid_unbalanced_brackets",
      message: `Blok Mermaid #${index}: bracket tidak seimbang (buka: ${openBrackets}, tutup: ${closeBrackets})`,
    });
  }

  return issues;
}

// ============================================================
// 5. Validate Minimum Mermaid Diagrams (for Blueprint and MVC)
// ============================================================

export function validateMinMermaidCount(
  content: string,
  docType: DocType
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blocks = extractMermaidBlocks(content);

  const minimums: Record<DocType, number> = {
    prd: 0,
    blueprint: 4, // 1 context + 1 component + 2 sequence
    mvc: 1, // 1 ERD
  };

  const minCount = minimums[docType];

  if (blocks.length < minCount) {
    issues.push({
      type: "error",
      category: "mermaid_insufficient",
      message: `Dokumen ${docType.toUpperCase()} membutuhkan minimal ${minCount} diagram Mermaid, ditemukan ${blocks.length}`,
    });
  }

  return issues;
}

// ============================================================
// 6. Validate ID Coverage (FR Must → MVC Traceability)
// ============================================================

export function validateFRCoverage(
  prdContent: string,
  mvcContent: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find all FR-xxx Must in PRD
  const frMustPattern = /\b(FR-\d{3,})\b.*?\b(Must)\b/gi;
  const frIds = new Set<string>();
  let match;

  while ((match = frMustPattern.exec(prdContent)) !== null) {
    frIds.add(match[1].toUpperCase());
  }

  // Also check for pattern "Must" ... "FR-xxx"  
  const frMustAltPattern = /\bMust\b.*?\b(FR-\d{3,})\b/gi;
  while ((match = frMustAltPattern.exec(prdContent)) !== null) {
    frIds.add(match[1].toUpperCase());
  }

  // If no FR-xxx pattern found at all, try to extract all FR IDs
  if (frIds.size === 0) {
    const allFrPattern = /\b(FR-\d{3,})\b/g;
    while ((match = allFrPattern.exec(prdContent)) !== null) {
      frIds.add(match[1].toUpperCase());
    }
  }

  // Check which FRs appear in MVC traceability
  for (const frId of frIds) {
    if (!mvcContent.includes(frId)) {
      issues.push({
        type: "warning",
        category: "fr_not_in_mvc",
        message: `${frId} tidak ditemukan di Desain MVC`,
        details: `Setiap FR Must harus ada implementasinya di MVC (endpoint atau view)`,
      });
    }
  }

  return issues;
}

// ============================================================
// 7. Combined Document Validator
// ============================================================

export function validateDocument(
  content: string,
  docType: DocType
): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...validateHeadings(content, docType),
    ...validateNoPlaceholders(content),
    ...validateMermaid(content),
    ...validateMinMermaidCount(content, docType),
  ];

  return {
    valid: !allIssues.some((i) => i.type === "error"),
    issues: allIssues,
  };
}

export function validateBriefJSON(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  try {
    const parsed = JSON.parse(content);
    const result = ProductBriefSchema.safeParse(parsed);

    if (!result.success) {
      for (const err of result.error.issues) {
        issues.push({
          type: "error",
          category: "brief_schema",
          message: `Brief validation error at ${err.path.join(".")}: ${err.message}`,
        });
      }
    }
  } catch (e) {
    issues.push({
      type: "error",
      category: "brief_json_parse",
      message: `Brief bukan JSON valid: ${(e as Error).message}`,
    });
  }

  return {
    valid: !issues.some((i) => i.type === "error"),
    issues,
  };
}

export function validateReviewJSON(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  try {
    const parsed = JSON.parse(content);
    const result = ReviewResultSchema.safeParse(parsed);

    if (!result.success) {
      for (const err of result.error.issues) {
        issues.push({
          type: "error",
          category: "review_schema",
          message: `Review validation error at ${err.path.join(".")}: ${err.message}`,
        });
      }
    }
  } catch (e) {
    issues.push({
      type: "error",
      category: "review_json_parse",
      message: `Review bukan JSON valid: ${(e as Error).message}`,
    });
  }

  return {
    valid: !issues.some((i) => i.type === "error"),
    issues,
  };
}

// ============================================================
// Utility
// ============================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
