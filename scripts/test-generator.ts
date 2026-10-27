import * as dotenv from "dotenv";
dotenv.config();

import { loadPersona, loadPromptTemplate, fillTemplate, extractJSON, extractMarkdown } from "../src/services/generator/prompt-loader";
import {
  validateBriefJSON,
  validateReviewJSON,
  validateDocument,
  validateNoPlaceholders,
  validateMermaid,
  validateReferencedIds,
  validateFRCoverage,
  ProductBriefSchema,
  ReviewResultSchema,
} from "../src/services/generator/validators";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
  }
}

async function testPromptLoader() {
  console.log("\n🧪 1. Testing Prompt Loader...");

  // Persona
  const persona = loadPersona("Indonesia");
  assert(persona.length > 50 && persona.includes("Principal Software Engineer"), "Load Persona (ID)");

  // Templates
  const templates = ["intake", "prd", "blueprint", "mvc", "review"] as const;
  for (const t of templates) {
    const content = loadPromptTemplate(t);
    assert(content.length > 50, `Load template: ${t}.md`);
  }

  // Placeholder filling
  const filled = fillTemplate("Halo {{NAMA}}, proyekmu {{PROYEK}} siap!", {
    NAMA: "Jamal",
    PROYEK: "AI Plan Engine",
  });
  assert(filled === "Halo Jamal, proyekmu AI Plan Engine siap!", "Fill template placeholders");

  // JSON extraction
  const wrappedJson = "Berikut hasilnya:\n```json\n{\"test\": 123}\n```\nSemoga membantu!";
  assert(extractJSON(wrappedJson) === '{"test": 123}', "Extract JSON from markdown fence");

  // Markdown extraction
  const wrappedMd = "```markdown\n# Judul Dokumen\nIsi dokumen di sini.\n```";
  assert(extractMarkdown(wrappedMd) === "# Judul Dokumen\nIsi dokumen di sini.", "Extract Markdown from fence");
}

async function testValidators() {
  console.log("\n🧪 2. Testing Validators & Zod Schemas...");

  // Valid Brief JSON (min 5 asumsi, format A-01)
  const validBrief = {
    namaProduk: "SmartPlanner",
    ringkasan: "Aplikasi perencanaan cerdas berbasis AI untuk startup dan tech lead.",
    tipeProduk: "web",
    masalah: "Startup kesulitan membuat PRD dan arsitektur sistem yang konsisten.",
    penggunaUtama: ["Product Manager", "Tech Lead", "Solo Founder"],
    asumsi: [
      { id: "A-01", isi: "Pengguna memahami konsep produk dasar.", risikoJikaSalah: "Perlu wizard panduan onboarding." },
      { id: "A-02", isi: "Sistem dijalankan di lingkungan Node.js v18+.", risikoJikaSalah: "Perlu build polyfill mundur." },
      { id: "A-03", isi: "Model AI memiliki context window minimal 32k.", risikoJikaSalah: "Perlu chunking dokumen generator." },
      { id: "A-04", isi: "Database SQLite cukup untuk skala single-tenant.", risikoJikaSalah: "Migrasi ke PostgreSQL/Turso." },
      { id: "A-05", isi: "Koneksi internet stabil untuk request API AI.", risikoJikaSalah: "Perlu retry mechanism dan offline cue." }
    ],
    batasan: ["Hanya mendukung bahasa Indonesia dan Inggris", "Database SQLite di lokal"],
    diLuarCakupan: ["Mobile app native iOS/Android di fase awal"],
    pertanyaanTerbuka: ["Apakah perlu integrasi GitHub issue tracker?"]
  };

  const briefResult = validateBriefJSON(JSON.stringify(validBrief));
  assert(briefResult.valid, "Valid Brief JSON should pass validation");

  // Invalid Brief JSON (missing required field namaProduk)
  const invalidBrief = { ...validBrief };
  delete (invalidBrief as any).namaProduk;
  const invalidBriefResult = validateBriefJSON(JSON.stringify(invalidBrief));
  assert(!invalidBriefResult.valid, "Invalid Brief JSON (missing field) should fail validation");

  // Placeholder Validator
  const cleanText = "Sistem ini menggunakan SQLite untuk database lokal.";
  const placeholderText = "Fitur pembayaran akan ditentukan nanti (TBD / TODO).";
  assert(validateNoPlaceholders(cleanText).length === 0, "Clean text has 0 placeholder issues");
  assert(validateNoPlaceholders(placeholderText).length > 0, "Text with TODO/TBD caught by placeholder validator");

  // Mermaid Validator
  const validMermaid = "```mermaid\ngraph TD\n  A[Frontend] --> B[API Backend]\n  B --> C[(SQLite)]\n```";
  const invalidMermaid = "```mermaid\nunknownType\n  A --> [Unclosed\n```";
  assert(validateMermaid(validMermaid).length === 0, "Valid Mermaid block has 0 issues");
  assert(validateMermaid(invalidMermaid).length > 0, "Invalid Mermaid block detected");

  // PRD Heading Validator
  const samplePrdContent = `
# Product Requirements Document (PRD)

## 1. Ringkasan Eksekutif
Deskripsi ringkasan produk.

## 2. Tujuan dan Metrik
Target adopsi 1000 pengguna.

## 3. Non-goals
Tidak mencakup blockchain atau web3.

## 4. Persona
Tech lead dan software engineer.

## 5. User Journey
Alur mulai dari input prompt hingga export.

## 6. User Story
[US-01] Sebagai dev, saya ingin membuat dokumen otomatis.

## 7. Kebutuhan Fungsional
[FR-001] (Must) Sistem harus memvalidasi format JSON.
[FR-002] (Must) Sistem harus mendukung export ZIP.

## 8. Kebutuhan Non-Fungsional
[NFR-01] Latensi streaming < 200ms.

## 9. Cakupan MVP
Fokus pada 5 dokumen inti generator.

## 10. Dependensi
OpenAI API kompatibel, SQLite.

## 11. Pertanyaan Terbuka
Mekanisme webhook Telegram bot.
`;

  const prdValidation = validateDocument(samplePrdContent, "prd");
  assert(prdValidation.valid, "Well-formed PRD passes all heading checks");

  // Missing Headings in PRD
  const incompletePrd = "# PRD\n## 1. Ringkasan Eksekutif\nSelesai.";
  const incompletePrdResult = validateDocument(incompletePrd, "prd");
  assert(!incompletePrdResult.valid, "Incomplete PRD fails heading validation");

  // Valid Review JSON
  const validReview = {
    skorKonsistensi: 92,
    ringkasanReview: "Dokumentasi sangat konsisten dan komprehensif di seluruh bagian.",
    temuan: [
      {
        id: "REV-001",
        tingkat: "saran",
        dokumen: "blueprint",
        bagian: "Arsitektur Data",
        masalah: "Indeks pada tabel dokumen belum ditentukan secara eksplisit.",
        perbaikan: "Tambahkan index pada foreign key projectId di schema SQLite."
      }
    ],
    kebutuhanTanpaImplementasi: [],
    nfrTanpaAlamat: [],
    istilahTidakKonsisten: [],
    risikoTersisa: [
      {
        risiko: "Batas token model kecil bisa terlampaui pada PRD sangat panjang.",
        tingkat: "sedang",
        saran: "Gunakan model dengan context window >= 32k."
      }
    ]
  };

  const reviewResult = validateReviewJSON(JSON.stringify(validReview));
  assert(reviewResult.valid, "Valid Review JSON passes validation");

  // ID Reference Validator
  const docWithIds = "Persyaratan FR-001 dan FR-002 telah diimplementasikan di controller.";
  const sourceDoc = "Daftar kebutuhan: FR-001 sistem validasi, FR-002 sistem export, NFR-01 latensi.";
  const idResult = validateReferencedIds({
    content: docWithIds,
    sourceContent: sourceDoc,
    prefixes: ["FR-", "NFR-"]
  });
  assert(idResult.length === 0, "All referenced IDs found in source document");

  const docWithMissingId = "Persyaratan FR-999 diimplementasikan.";
  const missingIdResult = validateReferencedIds({
    content: docWithMissingId,
    sourceContent: sourceDoc,
    prefixes: ["FR-"]
  });
  assert(missingIdResult.length > 0, "Missing FR-999 detected by ID reference validator");

  // FR Coverage Validator
  const sampleMvc = "Implementasi FR-001 pada ValidationService dan FR-002 pada ExportController.";
  const coverageResult = validateFRCoverage(samplePrdContent, sampleMvc);
  assert(coverageResult.length === 0, "All Must FRs in PRD are covered in MVC");
}

async function main() {
  console.log("==================================================");
  console.log("  NGODING PAKAI AI - GENERATOR PIPELINE TEST SUITE");
  console.log("==================================================");

  await testPromptLoader();
  await testValidators();

  console.log("\n--------------------------------------------------");
  console.log(`📊 Hasil Pengujian: ${passedTests}/${totalTests} Lulus (${failedTests} Gagal)`);
  console.log("--------------------------------------------------");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
