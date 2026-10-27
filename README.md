# 🚀 AI PlanEngine — Autonomous AI Project Planning & PRD Generation Platform

> **AI PlanEngine** adalah platform perencana proyek dan arsitektur perangkat lunak cerdas yang dirancang untuk menjembatani ide kasar menjadi **PRD lengkap, diagram arsitektur Mermaid, spesifikasi sistem, dan task breakdown siap pakai untuk AI Coding Agents** (seperti Cursor, Claude Code, Windsurf, Aider, dan v0).

Dilengkapi dengan antarmuka ganda (**Web Dashboard modern ala Apple Design System** dan **Bot Telegram pribadi via grammY**), didukung oleh **Drizzle ORM + LibSQL (SQLite / Turso)** serta integrasi multi-provider AI melalui **OpenRouter / OpenAI / Anthropic / Google**.

---

## ✨ Fitur Unggulan

### 1. 🎯 Multi-Stage Generation Pipeline
* **Tahap 1 — Intake & Scoping:** Ekstraksi ide mentah, perumusan batasan masalah, dan identifikasi target pengguna.
* **Tahap 2 — Grill-Me Interview:** Sesi tanya-jawab interaktif AI untuk menguji asumsi, menggali *edge cases*, dan menentukan preferensi teknis sebelum PRD dibuat.
* **Tahap 3 — PRD (Product Requirements Document):** Penyusunan dokumen PRD komprehensif, pemisahan fitur MVP vs Fase 2, *acceptance criteria*, dan *non-functional requirements*.
* **Tahap 4 — Blueprint & Arsitektur:** Rekomendasi tech stack, spesifikasi database schema, serta diagram Mermaid visual (*Architecture Diagram, ERD, dan User Flow*).
* **Tahap 5 — MVC & AI Agent Task Breakdown:** Roadmap pengerjaan berurutan (*step-by-step*) yang diformat khusus untuk `.cursorrules`, `CLAUDE.md`, Windsurf, Aider, dan v0.
* **Tahap 6 — Review & Quality Checklist:** Audit otomatis kelengkapan dokumen, deteksi ambiguitas, dan rekomendasi mitigasi risiko.
* **Tahap 7 — Ekspor Lengkap:** Download dokumen dalam format Markdown individual atau bundel arsip ZIP sekali klik.

### 2. 🌐 Dual-Entry Interface (Web & Telegram)
* **Web Dashboard:** Antarmuka responsif dengan tema Apple Minimalist (Dark/Light mode), streaming respons LLM, live tabbed viewer, Mermaid diagram interactive viewer, dan token usage monitor.
* **Telegram Bot:** Pintu masuk cepat dari perangkat seluler via bot Telegram (mendukung mode polling lokal dan webhook serverless). Riwayat obrolan tersinkronisasi otomatis dengan database web.
* **Whitelisted Access:** Keamanan bot dibatasi hanya untuk Telegram User ID yang terdaftar.

### 3. 🧠 Multi-Provider AI Gateway
* Mendukung **OpenRouter, Anthropic Claude, OpenAI, Google Gemini, Ollama,** dan custom base URL.
* Dynamic Model Discovery: Memilih model langsung dari UI, mengatur parameter token, temperature, dan batas konteks.
* **Daily Budget Safeguard:** Pemantauan biaya harian otomatis dengan limit anggaran harian (`DAILY_BUDGET_USD`).

### 4. 🗄️ Database & Keamanan
* **Drizzle ORM + LibSQL:** Kompatibel dengan SQLite lokal (`file:local.db`) untuk mode dev/VPS, atau Turso DB untuk deployment serverless di Vercel.
* **Zero Secret Leak:** Seluruh database lokal (`*.db`, `.data/`) dan kredensial API telah diproteksi ketat di `.gitignore`.

---

## 🏗️ Tech Stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) | React 18, TypeScript |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Apple-inspired design tokens, Lucide Icons |
| **Database & ORM** | [Drizzle ORM](https://orm.drizzle.team/) + [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) | SQLite lokal / Turso Cloud |
| **AI Integration** | [OpenAI SDK](https://github.com/openai/openai-node) (OpenRouter compatible) | Streaming response, custom models |
| **Bot Telegram** | [grammY](https://grammy.dev/) | Polling & Webhook support |
| **Diagrams & Markdown** | [Mermaid.js](https://mermaid.js.org/), `react-markdown`, `remark-gfm` | Render interaktif PRD & ERD |
| **Utilities** | [JSZip](https://stuk.github.io/jszip/), [Zod](https://zod.dev/) | Validasi skema & download bundle ZIP |

---

## 📁 Struktur Direktori

```
ai-plan-engine/
├── drizzle/                    # File migrasi skema SQL (Drizzle Kit)
│   ├── 0000_big_imperial_guard.sql
│   └── 0001_mixed_joystick.sql
├── scripts/                    # Script CLI pengujian & utility
│   ├── bot-polling.ts          # Menjalankan bot Telegram mode polling
│   ├── set-webhook.ts          # Konfigurasi webhook Telegram bot
│   ├── test-generator.ts       # Uji pipeline generator PRD
│   ├── test-chat.ts            # Uji API chat streaming
│   └── test-model-discovery.ts # Uji konektivitas gateway AI
├── src/
│   ├── app/                    # Next.js App Router (Halaman & API Routes)
│   │   ├── api/
│   │   │   ├── chat/           # Endpoint chat streaming
│   │   │   ├── generate/       # Endpoint pipeline: start, stage, grill-me
│   │   │   ├── telegram/       # Webhook endpoint untuk Telegram bot
│   │   │   ├── models/         # Model discovery & listing
│   │   │   └── usage/          # Pencatatan biaya & token usage
│   │   ├── buat/               # UI pembuatan perencanaan proyek
│   │   ├── proyek/             # Dashboard daftar proyek tersimpan
│   │   ├── c/                  # Chat session UI
│   │   ├── pengaturan/         # Halaman settings AI & Model
│   │   └── penggunaan/         # Halaman analitik anggaran & token
│   ├── components/             # Komponen UI modular
│   │   ├── generator/          # Stage stepper, Grill-Me, Mermaid viewer, Markdown
│   │   ├── chat/               # Chat composer, bubbles, dan message actions
│   │   └── GatewayModelPicker  # Selector model & provider interaktif
│   ├── lib/
│   │   └── db/                 # Konfigurasi database Drizzle, skema & client
│   ├── prompts/                # Prompt templates sistem (Intake, PRD, Blueprint, MVC)
│   └── services/               # Core business logic (chat, pipeline, validator)
├── .env.example                # Panduan konfigurasi environment variables
├── drizzle.config.ts           # Konfigurasi Drizzle Kit
├── package.json
└── tailwind.config.ts
```

---

## ⚡ Panduan Instalasi & Penggunaan

### 1. Prasyarat
* **Node.js** versi 18.17 atau lebih baru
* **npm** atau **pnpm**
* API Key salah satu provider AI (misalnya [OpenRouter](https://openrouter.ai/) atau OpenAI)
* *(Opsional)* Akun bot dari Telegram [@BotFather](https://t.me/BotFather) jika ingin mengaktifkan integrasi bot Telegram

### 2. Kloning Repositori
```bash
git clone https://github.com/USERNAME/ai-plan-engine.git
cd ai-plan-engine
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan sesuaikan nilainya:
```env
# AI Model Provider (Direkomendasikan: OpenRouter)
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
AI_MODEL=anthropic/claude-3.5-sonnet
AI_BASE_URL=https://openrouter.ai/api/v1

# Database (Gunakan local SQLite untuk dev)
DATABASE_URL=file:local.db

# Proteksi Akses & Anggaran
APP_PASSWORD=password_rahasia_kamu
APP_URL=http://localhost:3000
DAILY_BUDGET_USD=5.0

# (Opsional) Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USER_ID=123456789
TELEGRAM_WEBHOOK_SECRET=token_acak_minimal_8_karakter
```

### 5. Inisialisasi Database
Jalankan migrasi database SQLite lokal:
```bash
npm run db:push
```
Atau jalankan skrip migrasi bawaan:
```bash
npm run db:migrate
```

### 6. Menjalankan Aplikasi Web
Jalankan server pengembangan:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### 7. (Opsional) Menjalankan Bot Telegram

#### Mode Polling (Lokal / Development):
```bash
npm run bot:dev
```
Bot akan langsung merespons pesan Telegram dari ID yang diizinkan di `TELEGRAM_ALLOWED_USER_ID`.

#### Mode Webhook (Produksi / Vercel):
Pastikan domain publik Anda telah aktif (misal `https://your-domain.vercel.app`), lalu daftarkan webhook:
```bash
npm run bot:webhook
```

---

## 🛠️ Daftar Perintah (Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server Next.js lokal di port 3000 |
| `npm run build` | Membuat build produksi Next.js |
| `npm run start` | Menjalankan server build produksi |
| `npm run lint` | Menjalankan pemeriksaan kode ESLint |
| `npm run db:push` | Mendorong perubahan skema Drizzle langsung ke database |
| `npm run db:migrate` | Menjalankan migrasi database via script Drizzle |
| `npm run db:studio` | Membuka Drizzle Studio web GUI untuk mengelola database |
| `npm run bot:dev` | Menjalankan bot Telegram via long polling |
| `npm run bot:webhook` | Mendaftarkan URL webhook bot Telegram ke API Telegram |
| `npm run test:generator` | Menjalankan automated test generator PRD pipeline |
| `npm run test:chat` | Menguji streaming chat respons via terminal |
| `npm run test:models` | Memeriksa ketersediaan model AI pada provider |

---

## 🔒 Privasi & Keamanan Data

* **Database Lokal Tidak Diikutsertakan:** Berkas database SQLite (`local.db`, `*.db`, `*.sqlite*`, `.data/`) otomatis dikecualikan dari Git melalui `.gitignore`.
* **Kredensial Aman:** File `.env` berisi kunci API tidak pernah di-commit ke repositori publik.
* **Akses Terbatas:** Aplikasi dilengkapi gerbang password minimalis serta filter Telegram ID agar asisten hanya melayani pemilik bot.

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT. Silakan gunakan dan sesuaikan untuk kebutuhan perencanaan proyek dan pengembangan software Anda.
