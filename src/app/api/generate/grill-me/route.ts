import { NextResponse } from "next/server";
import { generateReply, getModelConfig, ChatMessage } from "@/lib/ai/provider";
import { extractJSON } from "@/services/generator/prompt-loader";
import { checkDailyBudget } from "@/lib/budget";

export interface GrillMeOption {
  key: string; // "A", "B", "C", "D"
  label: string;
  details: string[];
}

export interface GrillMeQuestion {
  id: string;
  category: string;
  question: string;
  options: GrillMeOption[];
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idea, language = "Indonesia" } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
      return NextResponse.json(
        { error: "Ide proyek minimal 5 karakter untuk memulai wawancara" },
        { status: 400 }
      );
    }

    // Budget check
    const budgetCheck = await checkDailyBudget();
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: `Anggaran harian terlampaui. Wawancara tidak dapat dijalankan.`,
        },
        { status: 429 }
      );
    }

    const systemPrompt = `Kamu adalah Senior Technical Product Manager dan Lead Software Architect.
Tugasmu adalah menganalisis ide produk software berikut dan mengajukan 3 hingga 4 pertanyaan paling krusial (Discovery / Grill Me Interview) untuk mempertajam spesifikasi sebelum pembuatan PRD dan Arsitektur.

Topik pertanyaan mencakup:
1. Tujuan Bisnis Utama & Metrik Keberhasilan
2. Cakupan Fitur MVP vs Fitur Lanjutan (Prioritas pengguna & batasan ruang lingkup)
3. Model Transaksi / Alur Kerja Kunci / Monetisasi
4. Arsitektur Teknis / Integrasi Pihak Ketiga & Keamanan

Untuk SETIAP pertanyaan:
- Berikan pertanyaan yang tajam, spesifik terhadap ide produk.
- Sediakan 3 hingga 4 pilihan opsi rekomendasi realistis (Opsi A, Opsi B, Opsi C, opsional Opsi D).
- Setiap opsi WAJIB memiliki label singkat dan array 'details' yang menjelaskan tujuan, metrik, atau konsekuensi teknisnya secara gamblang (seperti contoh: "Tujuan: ...", "Metrik Keberhasilan: ...").

Keluaran WAJIB HANYA berupa JSON valid tanpa teks atau markdown di luar blok JSON:
{
  "questions": [
    {
      "id": "q1",
      "category": "Tujuan Bisnis & Metrik",
      "question": "Apa tujuan bisnis utama dari pembuatan sistem ini, dan bagaimana Anda akan mengukur keberhasilannya?",
      "options": [
        {
          "key": "A",
          "label": "Meningkatkan Kunjungan Fisik / Foot Traffic",
          "details": [
            "Tujuan: Mendorong pengguna datang langsung ke lokasi fisik.",
            "Metrik Keberhasilan: Jumlah klik navigasi Google Maps dan kontak WA mencapai target bulanan."
          ]
        },
        {
          "key": "B",
          "label": "Brand Awareness & Viralitas Media",
          "details": [
            "Tujuan: Membangun citra brand yang estetik dan kekinian.",
            "Metrik Keberhasilan: Total unique visitors dan konversi klik ke akun media sosial."
          ]
        },
        {
          "key": "C",
          "label": "Monetisasi Langsung via Booking / Reservasi",
          "details": [
            "Tujuan: Memaksimalkan pendapatan dari transaksi reservasi berbayar online.",
            "Metrik Keberhasilan: Jumlah transaksi sukses dan omzet bulanan."
          ]
        }
      ]
    }
  ]
}`;

    const userPrompt = `Ide Produk:\n${idea.trim()}\n\nBahasa: ${language}\n\nHasilkan 3-4 pertanyaan wawancara terarah dengan opsi rekomendasi yang dapat diklik.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const config = await getModelConfig();

    try {
      const result = await generateReply(messages, {
        model: config.model,
        maxTokens: 3000,
        temperature: 0.5,
      });

      const jsonStr = extractJSON(result.content);
      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return NextResponse.json({
          success: true,
          questions: parsed.questions,
          model: result.model,
        });
      }
    } catch (aiErr: any) {
      console.warn("AI generation for Grill Me questions failed, using smart fallback:", aiErr.message);
    }

    // Fallback smart questions tailored to general software engineering
    const fallbackQuestions: GrillMeQuestion[] = [
      {
        id: "q1",
        category: "Tujuan Bisnis & Metrik",
        question: `Apa tujuan bisnis utama dari pembuatan proyek "${idea.slice(0, 40)}...", dan bagaimana Anda mengukur keberhasilannya?`,
        options: [
          {
            key: "A",
            label: "Meningkatkan Konversi & Penjualan Langsung",
            details: [
              "Tujuan: Mendorong pengguna menyelesaikan transaksi atau reservasi secepat mungkin.",
              "Metrik Keberhasilan: Conversion rate transaksi dan Gross Merchandise Value (GMV).",
            ],
          },
          {
            key: "B",
            label: "Efisiensi Operasional & Otomasi Proses",
            details: [
              "Tujuan: Memangkas waktu kerja manual tim dari hitungan jam ke otomatis hitungan detik.",
              "Metrik Keberhasilan: Waktu penyelesaian tugas berkurang minimal 60% dan zero error.",
            ],
          },
          {
            key: "C",
            label: "Pertumbuhan Pengguna & Brand Engagement",
            details: [
              "Tujuan: Membangun basis pengguna aktif yang loyal dan viral di komunitas.",
              "Metrik Keberhasilan: Daily Active Users (DAU) dan rasio retensi pengguna bulan ke-1.",
            ],
          },
        ],
      },
      {
        id: "q2",
        category: "Strategi Scope & MVP",
        question: "Bagaimana batasan cakupan pengguna dan fitur untuk rilis MVP pertama?",
        options: [
          {
            key: "A",
            label: "Fokus Core Flow Saja (Minimalis & Cepat Rilis)",
            details: [
              "Cakupan: Hanya alur utama dari registrasi hingga transaksi berhasil.",
              "Non-Goals: Belum ada analytics canggih, gamifikasi, atau integrasi multi-channel.",
            ],
          },
          {
            key: "B",
            label: "Self-Service Lengkap dengan Dashboard Admin",
            details: [
              "Cakupan: Portal pengguna publik + dashboard manajemen internal untuk kelola data.",
              "Non-Goals: Belum ada automasi AI atau multi-bahasa lanjutan.",
            ],
          },
          {
            key: "C",
            label: "B2B Multi-Tenancy / Multi-Cabang",
            details: [
              "Cakupan: Dukungan organisasi dengan pemisahan data per tenant/cabang.",
              "Non-Goals: Belum ada marketplace publik antar tenant.",
            ],
          },
        ],
      },
      {
        id: "q3",
        category: "Arsitektur & Integrasi Kunci",
        question: "Integrasi eksternal atau teknologi apa yang wajib tersedia sejak hari pertama?",
        options: [
          {
            key: "A",
            label: "Payment Gateway Lokal (QRIS / Virtual Account Midtrans/Xendit)",
            details: [
              "Kebutuhan: Pembayaran instan otomatis dengan webhook verifikasi status.",
              "Dampak: Memerlukan penanganan idempotensi dan log audit transaksi.",
            ],
          },
          {
            key: "B",
            label: "Notifikasi Realtime (WhatsApp API / Email Transaksional)",
            details: [
              "Kebutuhan: Pengiriman bukti konfirmasi dan pengingat jadwal ke pengguna.",
              "Dampak: Integrasi queue asinkron untuk keandalan pengiriman pesan.",
            ],
          },
          {
            key: "C",
            label: "Geolocation & Maps (Google Maps / OpenStreetMap)",
            details: [
              "Kebutuhan: Peta lokasi, petunjuk arah, dan radius pencarian terdekat.",
              "Dampak: Caching koordinat dan optimasi kuota API Maps.",
            ],
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      isFallback: true,
    });
  } catch (error: any) {
    console.error("Error in Grill Me question generator:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghasilkan pertanyaan wawancara" },
      { status: 500 }
    );
  }
}
