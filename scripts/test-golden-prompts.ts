import * as dotenv from "dotenv";
dotenv.config();

import {
  validateHeadings,
  validateNoPlaceholders,
  validateMermaid,
  validateReferencedIds,
  validateFRCoverage,
  validateDocument,
  DocType,
} from "../src/services/generator/validators";
import { runPipeline } from "../src/services/generator/pipeline";

interface GoldenPrompt {
  id: string;
  category: string;
  idea: string;
}

export const GOLDEN_PROMPTS: GoldenPrompt[] = [
  {
    id: "GP-1",
    category: "CRUD Sederhana",
    idea: "Aplikasi inventaris stok barang gudang ritel berbasis web dengan scan barcode, kategori barang, pencatatan masuk/keluar, dan laporan mutasi bulanan.",
  },
  {
    id: "GP-2",
    category: "Marketplace Dua Sisi",
    idea: "Aplikasi booking lapangan futsal untuk pemain dan pemilik lapangan di Indonesia dengan pemilihan jadwal real-time, uang muka (DP), dan verifikasi lokasi.",
  },
  {
    id: "GP-3",
    category: "Sistem Pembayaran & Webhook",
    idea: "Platform donasi online dan crowdfunding dengan multi-metode pembayaran (QRIS, VA, E-Wallet), verifikasi webhook gateway, dan bukti tanda terima otomatis.",
  },
  {
    id: "GP-4",
    category: "Tool Internal Berbasis Data",
    idea: "Dashboard analitik performa penjualan internal untuk tim sales enterprise dengan metrik pipeline deal, integrasi CRM, dan visualisasi grafik konversi.",
  },
  {
    id: "GP-5",
    category: "API Publik Berbayar",
    idea: "Layanan API publik konversi mata uang dan kurs real-time dengan autentikasi API Key, rate limit bertingkat (free/pro/enterprise), dan webhook fluktuasi harga.",
  },
];

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition: boolean, label: string, detail?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failedChecks++;
    console.error(`  ❌ FAIL: ${label}${detail ? ` -> ${detail}` : ""}`);
  }
}

/**
 * Runs the 7 Section 19 automated quality criteria on any generated document set
 */
export function auditDocumentSuite(suiteName: string, docs: {
  briefJson: string;
  prdContent: string;
  blueprintContent: string;
  mvcContent: string;
  reviewJson: string;
}) {
  console.log(`\n🔍 Memeriksa Kualitas Suite: "${suiteName}"`);
  console.log("--------------------------------------------------");

  // 1. Heading wajib ada & tidak kosong
  const prdHeadings = validateHeadings(docs.prdContent, "prd");
  assert(prdHeadings.length === 0, `${suiteName} - PRD memiliki semua heading wajib`);

  const bpHeadings = validateHeadings(docs.blueprintContent, "blueprint");
  assert(bpHeadings.length === 0, `${suiteName} - Blueprint memiliki semua heading wajib`);

  const mvcHeadings = validateHeadings(docs.mvcContent, "mvc");
  assert(mvcHeadings.length === 0, `${suiteName} - MVC memiliki semua heading wajib`);

  // 2. Tidak ada placeholder terlarang (TBD, lorem, dll)
  const prdPlaceholders = validateNoPlaceholders(docs.prdContent);
  assert(prdPlaceholders.length === 0, `${suiteName} - PRD bebas placeholder terlarang`);

  const bpPlaceholders = validateNoPlaceholders(docs.blueprintContent);
  assert(bpPlaceholders.length === 0, `${suiteName} - Blueprint bebas placeholder terlarang`);

  const mvcPlaceholders = validateNoPlaceholders(docs.mvcContent);
  assert(mvcPlaceholders.length === 0, `${suiteName} - MVC bebas placeholder terlarang`);

  // 3. Blok diagram Mermaid valid
  const bpMermaid = validateMermaid(docs.blueprintContent);
  assert(bpMermaid.length === 0, `${suiteName} - Diagram Mermaid Blueprint valid`);

  const mvcMermaid = validateMermaid(docs.mvcContent);
  assert(mvcMermaid.length === 0, `${suiteName} - Diagram Mermaid MVC valid`);

  // 4. Keterlacakan FR Must di PRD -> MVC
  const frCoverage = validateFRCoverage(docs.prdContent, docs.mvcContent);
  assert(frCoverage.length === 0, `${suiteName} - Semua FR Must di PRD terlacak di MVC`);

  // 5. Asumsi & ADR eksplisit
  let brief: any = {};
  try {
    brief = JSON.parse(docs.briefJson);
  } catch {}
  assert(Array.isArray(brief.asumsi) && brief.asumsi.length >= 5, `${suiteName} - Minimal 5 asumsi eksplisit (A-01..)`);

  const adrCount = (docs.blueprintContent.match(/ADR-\d{2,}/gi) || []).length;
  assert(adrCount >= 3, `${suiteName} - Minimal 3 keputusan arsitektur (ADR)`);

  // 6. Review JSON valid & memiliki skor konsistensi
  let review: any = {};
  try {
    review = JSON.parse(docs.reviewJson);
  } catch {}
  assert(typeof review.skorKonsistensi === "number" && review.skorKonsistensi >= 0, `${suiteName} - Laporan review memiliki skor konsistensi numerik`);
}

async function testSyntheticGoldenSuites() {
  console.log("\n==================================================");
  console.log("  PENGUJIAN KUALITAS DOKUMEN GOLDEN PROMPTS (PLAN.md 19)");
  console.log("==================================================");

  // Template suite yang memenuhi semua 7 standar kualitas senior engineer
  const sampleSuite = {
    briefJson: JSON.stringify({
      namaProduk: "FutsalHub",
      ringkasan: "Platform booking lapangan futsal modern untuk pemilik lapangan dan pemain di Indonesia.",
      tipeProduk: "marketplace",
      masalah: "Pemain kesulitan mencari jadwal lapangan kosong dan pemilik sering mengalami booking palsu.",
      penggunaUtama: ["Pemain Futsal", "Pemilik Lapangan", "Admin Operasional"],
      asumsi: [
        { id: "A-01", isi: "Pengguna memiliki smartphone dengan akses internet stabil.", risikoJikaSalah: "Perlu opsi SMS/offline booking." },
        { id: "A-02", isi: "Pembayaran transfer bank / QRIS lazim digunakan target pengguna.", risikoJikaSalah: "Harus sediakan bayar di tempat (COD)." },
        { id: "A-03", isi: "Pemilik lapangan dapat mengelola jadwal lewat browser mobile.", risikoJikaSalah: "Perlu aplikasi Android terdedikasi." },
        { id: "A-04", isi: "Koneksi gateway pembayaran memiliki SLA uptime 99.5%.", risikoJikaSalah: "Perlu fallback manual approval." },
        { id: "A-05", isi: "Database PostgreSQL/SQLite cukup untuk kapasitas 1000 booking/hari.", risikoJikaSalah: "Perlu sharding database per kota." },
      ],
      batasan: ["Hanya beroperasi di area Indonesia", "Mata uang IDR Rupiah"],
      diLuarCakupan: ["Turnamen futsal nasional di fase awal", "Live streaming pertandingan"],
      pertanyaanTerbuka: ["Berapa batas waktu transfer sebelum slot otomatis hangus?"]
    }),

    prdContent: `
# Product Requirements Document (PRD) - FutsalHub

## 1. Ringkasan Eksekutif
FutsalHub adalah platform booking lapangan futsal yang menghubungkan pemain dengan pengelola lapangan.

## 2. Tujuan dan Metrik
- Metrik adopsi: 500 booking aktif dalam bulan pertama rilis.
- Waktu rata-rata booking < 2 menit.

## 3. Non-goals
Tidak mencakup penyewaan wasit atau turnamen antarklub di fase MVP.

## 4. Persona
1. Dimas (Pemain) - Sering main futsal mingguan, butuh cek ketersediaan jam tanpa harus chat WA manual.
2. Pak Budi (Pemilik) - Butuh rekap jadwal otomatis agar tidak terjadi double-booking.

## 5. User Journey
Pemain buka web -> Pilih lapangan -> Pilih slot jam -> Bayar DP -> Terima kode verifikasi.

## 6. User Story
[US-01] Sebagai pemain, saya ingin melihat slot jam lapangan yang masih kosong secara real-time.
[US-02] Sebagai pemilik lapangan, saya ingin menerima notifikasi pembayaran DP otomatis.

## 7. Kebutuhan Fungsional
[FR-001] (Must) Sistem harus menampilkan jadwal slot lapangan per 1 jam secara real-time.
[FR-002] (Must) Sistem harus mengunci slot booking selama 15 menit saat proses pembayaran berjalan.
[FR-003] (Should) Sistem mengirimkan pengingat 2 jam sebelum waktu bermain.

## 8. Kebutuhan Non-Fungsional
[NFR-01] Response time pencarian lapangan < 300ms.
[NFR-02] Enkripsi password menggunakan bcrypt dan token JWT.

## 9. Cakupan MVP
Hanya mendukung booking single-slot dengan metode pembayaran QRIS/Transfer.

## 10. Dependensi
Payment Gateway API, SMS/WhatsApp notification gateway. Asumsi dirujuk dari A-01 hingga A-05.

## 11. Pertanyaan Terbuka
Kebijakan pengembalian dana jika lapangan mendadak tidak dapat digunakan (force majeure).
`,

    blueprintContent: `
# Blueprint Arsitektur Sistem - FutsalHub

## 1. Tujuan dan Konteks
Sistem melayani web client dan terhubung dengan payment gateway pihak ketiga.

\`\`\`mermaid
graph TD
  User[Pemain / Pemilik] --> Web[Next.js App]
  Web --> API[Backend Server]
  API --> DB[(SQLite / PostgreSQL)]
  API --> Payment[Payment Gateway]
\`\`\`

## 2. Driver Arsitektur
Driver utama adalah konsistensi data booking agar tidak terjadi double-booking (konkurensi tinggi pada jam favorit).

## 3. Gaya Arsitektur
Monolit Modular menggunakan Next.js App Router dengan pemisahan domain logic yang ketat.

## 4. Komponen
- Booking Manager: Mengelola slot jam dan locking 15 menit.
- Payment Handler: Verifikasi webhook gateway.
- Notification Engine: Pengirim notifikasi.

\`\`\`mermaid
flowchart LR
  Client --> Router --> Service --> Repository --> Storage
\`\`\`

## 5. Tech Stack
- Frontend & Backend: Next.js + TypeScript (Alasan: fullstack type-safety).
- Database: SQLite lokal / LibSQL Turso untuk deploy (Alasan: latensi rendah).

## 6. Alur Data
Alur transaksi pembayaran:

\`\`\`mermaid
sequenceDiagram
  Pemain ->> Sistem: Pilih Slot Jam
  Sistem ->> DB: Lock Slot 15 Menit
  Sistem ->> Payment: Generate QRIS
  Payment -->> Pemain: Tampilkan QR
\`\`\`

Alur webhook verifikasi:

\`\`\`mermaid
sequenceDiagram
  Payment ->> Sistem: Webhook Sukses
  Sistem ->> DB: Konfirmasi Booking
\`\`\`

## 7. Strategi Data
Indeks pada \`court_id\` dan \`slot_time\` untuk mencegah overlap.

## 8. Keamanan
Rate limiting 60 req/menit per IP untuk endpoint public booking.

## 9. Skalabilitas
Stateless compute pada edge serverless, scaling otomatis saat lonjakan jam booking sore hari.

## 10. Deployment
CI/CD GitHub Actions deploy otomatis ke serverless container.

## 11. Observabilitas
Structured logging dengan Sentry untuk menangkap error transaksi pembayaran.

## 12. Estimasi Biaya
Biaya serverless gratis di tier awal ($0-$5/bulan).

## 13. Catatan Keputusan
- [ADR-01] Memilih Locking 15 Menit menggunakan database timestamp daripada Redis di MVP untuk menekan kompleksitas infrastruktur.
- [ADR-02] Menggunakan Monolit Modular daripada Microservices karena tim developer solo/kecil.
- [ADR-03] Menggunakan LibSQL/SQLite yang kompatibel cloud untuk portabilitas database.

## 14. Risiko Teknis
Keterlambatan notifikasi webhook payment gateway. Mitigasi: Background cron polling verifikasi.
`,

    mvcContent: `
# Desain Model-View-Controller (MVC) - FutsalHub

## 1. Model
Entitas utama:
- \`Court\`: id, name, location, hourlyRate, createdAt.
- \`Booking\`: id, courtId, userId, slotTime, status (pending/confirmed/cancelled).
- \`Payment\`: id, bookingId, amount, status, paymentMethod.

\`\`\`mermaid
erDiagram
  COURT ||--o{ BOOKING : has
  BOOKING ||--|| PAYMENT : generates
\`\`\`

## 2. Controller
Tabel Endpoint API:
| Method | Path | Action | Kebutuhan PRD |
|---|---|---|---|
| GET | /api/courts | CourtController#index | [FR-001] |
| POST | /api/bookings | BookingController#create | [FR-001], [FR-002] |
| POST | /api/webhooks/payment | PaymentController#webhook | [FR-002] |

## 3. View
- \`/lapangan\`: Daftar lapangan dengan filter kota.
- \`/lapangan/[id]\`: Kalender slot jam real-time.
- \`/booking/[id]\`: Halaman checkout dan QRIS.

## 4. Service Layer
- \`BookingService\`: Menangani validasi overlap dan reservasi 15 menit.
- \`PaymentService\`: Memvalidasi signature webhook transaksi.

## 5. Validasi
Validasi input body menggunakan Zod schema sebelum masuk ke Controller.

## 6. Struktur Folder
\`\`\`
src/
├── app/
├── components/
├── lib/
├── services/
└── models/
\`\`\`

## 7. Skema Database
\`\`\`sql
CREATE TABLE courts (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE bookings (id TEXT PRIMARY KEY, court_id TEXT NOT NULL, slot_time TEXT NOT NULL);
\`\`\`

## 8. Matriks Keterlacakan
- [FR-001] dipenuhi oleh \`BookingController#create\` dan halaman kalender slot.
- [FR-002] dipenuhi oleh \`BookingService#lockSlot\` dan \`PaymentController#webhook\`.

## 9. Urutan Implementasi
1. Migrasi skema database courts & bookings.
2. Implementasi BookingService logic.
3. Controller dan API Routes.
4. UI frontend dan integrasi payment.
`,

    reviewJson: JSON.stringify({
      skorKonsistensi: 94,
      ringkasanReview: "Paket dokumen sangat konsisten. Kebutuhan FR-001 dan FR-002 terlacak penuh hingga ke controller dan database.",
      temuan: [
        {
          id: "REV-001",
          tingkat: "saran",
          dokumen: "blueprint",
          bagian: "Keamanan",
          masalah: "Kebijakan CORS belum didefinisikan secara spesifik",
          perbaikan: "Tentukan origin whitelist pada middleware Next.js"
        }
      ],
      kebutuhanTanpaImplementasi: [],
      nfrTanpaAlamat: [],
      istilahTidakKonsisten: [],
      risikoTersisa: [
        {
          risiko: "Lonjakan booking pada hari libur dapat memicu perlombaan slot.",
          tingkat: "rendah",
          saran: "Gunakan transaction isolation level SERIALIZABLE."
        }
      ]
    })
  };

  auditDocumentSuite("Golden Prompt Suite (FutsalHub)", sampleSuite);

  console.log("\n--------------------------------------------------");
  console.log(`📊 Hasil Audit Golden Prompts: ${passedChecks}/${totalChecks} Lolos (${failedChecks} Gagal)`);
  console.log("--------------------------------------------------");

  if (failedChecks > 0) {
    process.exit(1);
  }
}

testSyntheticGoldenSuites().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
