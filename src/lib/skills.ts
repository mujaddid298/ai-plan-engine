export interface Skill {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** Membangun teks untuk kolom ketik. userText = apa yang sudah diketik user (boleh kosong). */
  build: (userText: string) => string;
}

const PRD_PLANNING_INSTRUCTIONS = `Kamu adalah Senior Technical Product Manager & Lead Architect.
Tugasmu adalah menyusun Product Requirements Document (PRD) yang detail, jelas, actionable, dan cocok untuk langsung diimplementasikan oleh developer (termasuk junior developer atau AI coding agent).

PENTING: JANGAN LANGSUNG MULAI MEMBUAT KODE IMPLEMENTASI. HANYA BUAT DOKUMEN PRD.

---

## TAHAP 1: Clarifying Questions (Pertanyaan Klarifikasi)
Jika deskripsi ide/fitur masih memiliki ambiguitas, ajukan 3-5 pertanyaan esensial sebelum menyusun PRD lengkap.
Fokus pertanyaan:
- Problem/Goal: Masalah apa yang diselesaikan?
- Core Functionality: Aksi-aksi utama apa yang bisa dilakukan pengguna?
- Scope/Boundaries: Apa yang sengaja TIDAK dilakukan (out of scope)?
- Success Criteria: Bagaimana kita tahu fitur ini selesai dan berhasil?

FORMAT WAJIB PERTANYAAN (dengan opsi berhuruf A, B, C, D agar pengguna mudah menjawab misal "1A, 2C, 3B"):
1. [Pertanyaan 1]?
   A. [Opsi A]
   B. [Opsi B]
   C. [Opsi C]
   D. Lainnya: [spesifikasikan]

2. [Pertanyaan 2]?
   A. [Opsi A]
   B. [Opsi B]
   C. [Opsi C]
   D. Lainnya: [spesifikasikan]

(Jika pengguna sudah memberikan jawaban atau instruksi sudah lengkap, langsung susun PRD di Tahap 2).

---

## TAHAP 2: Struktur PRD
Susun PRD dengan bagian-bagian berikut:

# PRD: [Feature / Product Name]

## 1. Introduction / Overview
Deskripsi singkat tentang fitur/produk dan masalah yang diselesaikan.

## 2. Goals
Tujuan spesifik dan terukur (bullet list).

## 3. User Stories
Setiap story harus berukuran kecil untuk satu sesi pengerjaan terarah:
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Kriteria spesifik yang dapat diverifikasi (bukan kriteria kabur)
- [ ] Kriteria validasi / edge case
- [ ] Typecheck/lint passes
- [ ] **[UI stories only]** Verify in browser using dev-browser skill

## 4. Functional Requirements
Daftar bernomor fungsi spesifik:
- FR-1: Sistem harus memungkinkan pengguna untuk...
- FR-2: Ketika pengguna mengklik X, sistem harus...

## 5. Non-Goals (Out of Scope)
Apa yang SENGAJA TIDAK dimasukkan dalam versi ini untuk mengelola batasan cakupan.

## 6. Design Considerations (Optional)
Kebutuhan UI/UX, tata letak, komponen yang dapat dipakai ulang.

## 7. Technical Considerations (Optional)
Batasan teknis, dependensi, titik integrasi sistem, performa.

## 8. Success Metrics
Bagaimana keberhasilan diukur (misal: "Mengurangi waktu selesai X hingga 50%").

## 9. Open Questions
Area yang masih membutuhkan klarifikasi di masa mendatang.

---

## Pedoman Penulisan untuk Developer:
- Eksplisit dan tidak ambigu.
- Beri nomor pada setiap requirement agar mudah dirujuk (US-001, FR-1).
- Gunakan contoh konkret.

## Format Output:
- Format: Markdown (.md)
- Lokasi penyimpanan: tasks/
- Nama berkas: tasks/prd-[feature-name].md (kebab-case)`;

export const SKILLS: Skill[] = [
  {
    id: 'planning-se',
    title: 'PRD Generator & Planning',
    desc: 'Wawancara 3-5 pertanyaan beropsi A/B/C/D, lalu susun PRD terstruktur ke tasks/prd-[name].md',
    icon: '🧭',
    build: (userText) =>
      `${PRD_PLANNING_INSTRUCTIONS}\n\n---\nIde / fitur yang ingin direncanakan:\n${userText.trim() || ''}`,
  },
  {
    id: 'code-review',
    title: 'Code Review Mendalam',
    desc: 'Review kode: bug, keamanan, performa, keterbacaan',
    icon: '🔍',
    build: (userText) =>
      `Lakukan code review mendalam secara komprehensif (analisis bug, keamanan, performa, dan arsitektur kode).\n\nKode / konteks:\n${userText.trim() || ''}`,
  },
];

export const getSkill = (id: string) => SKILLS.find((s) => s.id === id);
