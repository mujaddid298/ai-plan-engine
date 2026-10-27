# Rencana Pembuatan Platform "Ngoding Pakai AI" dengan Next.js

Versi pribadi: satu pengguna (kamu), tanpa login, satu "otak" AI yang bisa dipakai lewat web dan Telegram, terhubung langsung ke API model.

## 1. Ringkasan Perubahan

Proyek ini sekarang asisten AI pribadi dengan dua pintu masuk (web dan Telegram) yang memakai satu backend Next.js dan satu database.

| Aspek | Rencana awal | Versi sekarang |
|---|---|---|
| Pengguna | Publik, banyak akun | Hanya kamu |
| Login | Auth.js, role, langganan | Tanpa login (tetap ada gerbang minimal, lihat bagian 7) |
| Pintu masuk | Web saja | Web dan bot Telegram |
| Model AI | Belum ditentukan | API provider langsung, tanpa perantara |
| Monetisasi | Paket berbayar | Tidak ada |
| Konten kelas, sertifikat, komunitas | Ada | Dibuang (bisa jadi catatan pribadi di fase 2) |
| Database | Postgres | SQLite atau Postgres, tergantung tempat deploy |

## 2. Fitur

### Fase 1 (MVP)

**Web:**

1. Halaman chat dengan streaming jawaban.
2. Daftar percakapan, buat percakapan baru, hapus.
3. Render Markdown dan code block dengan tombol salin.
4. Halaman pengaturan: system prompt, pilihan model, batas token.
5. Halaman penggunaan: jumlah pesan dan perkiraan biaya per hari.

**Telegram:**

1. Kirim pesan ke bot dan terima jawaban AI.
2. Perintah `/start`, `/new` (percakapan baru), `/model`, `/prompt`, `/help`.
3. Hanya akun Telegram kamu yang dilayani (whitelist by user ID).
4. Indikator "sedang mengetik" dan pemecahan pesan panjang.
5. Riwayat Telegram dan web tersimpan di database yang sama, jadi bisa dilihat dari web.

### Fase 2

- Kirim foto atau file ke bot (analisis gambar, baca dokumen).
- Pesan suara: transkripsi lalu dijawab AI.
- Tool use (function calling): cek cuaca, catat to-do, cari web.
- Pengingat dan pesan terjadwal dari bot (cron).
- Catatan pribadi yang dicari lewat embedding (RAG sederhana).

### Fase 3

- Beberapa "persona" atau prompt preset yang bisa dipilih lewat `/persona`.
- Ekspor percakapan ke Markdown.
- Beberapa provider sekaligus dengan fallback otomatis.

## 3. Arsitektur

Satu aplikasi Next.js melayani dua pintu masuk, dan keduanya memanggil logika chat yang sama.

```
  Browser (UI chat)            Telegram (HP/Desktop)
        |                              |
        | POST /api/chat               | webhook (HTTPS)
        v                              v
  +-----------------------------------------------+
  |            Next.js (App Router)               |
  |  /api/chat            /api/telegram           |
  |      \                    /                   |
  |       v                  v                    |
  |        services/chat.ts  (otak bersama)       |
  |        - ambil riwayat   - simpan pesan       |
  |        - cek anggaran    - panggil model      |
  +---------------------+-------------------------+
                        |                 |
                        v                 v
                  Database           API model
              (SQLite / Postgres)   (Anthropic / OpenAI / dll.)
```

Prinsip utamanya: **semua logika ada di `services/chat.ts`**. Route web dan route Telegram hanya penerjemah format (web memakai streaming, Telegram memakai kirim pesan setelah selesai). Kalau nanti kamu menambah pintu masuk baru (WhatsApp, CLI), cukup tambah adapter tipis.

## 4. Tech Stack dan Deployment

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Web dan API dalam satu proyek |
| UI | Tailwind CSS + shadcn/ui | Cepat membuat UI chat yang rapi |
| Bot Telegram | grammY | Ringan, TypeScript, punya adapter webhook untuk Next.js |
| Model AI | SDK resmi provider (misalnya `@anthropic-ai/sdk`) atau Vercel AI SDK dengan paket provider langsung | Langsung ke provider, tanpa gateway pihak ketiga |
| Database | SQLite atau Postgres | Lihat tabel deployment di bawah |
| ORM | Drizzle atau Prisma | Type-safe, migrasi mudah |
| Validasi | Zod | Validasi body request dan env |
| Render Markdown | react-markdown + highlight | Tampilan jawaban AI |

Pilih satu dari dua cara deploy. Ini keputusan terpenting karena menentukan database dan cara Telegram terhubung:

| | Opsi A: Vercel | Opsi B: Server sendiri (VPS atau mini PC) |
|---|---|---|
| Telegram | Webhook | Webhook (butuh HTTPS) atau long polling |
| Database | Postgres (Neon) atau Turso, karena file SQLite tidak awet di serverless | SQLite biasa |
| Biaya | Gratis sampai pemakaian ringan | Sewa VPS atau listrik sendiri |
| Batas waktu request | Ada batas durasi fungsi (cek paket yang dipakai) | Tidak ada |
| Perawatan | Hampir nol | Kamu urus proses (Docker atau pm2), update, backup |
| Cocok jika | Ingin cepat dan tanpa mengurus server | Ingin kontrol penuh dan jawaban panjang tanpa batas waktu |

Rekomendasiku untuk pemakaian pribadi: **Opsi A** dulu karena paling sedikit pekerjaannya. Pindah ke Opsi B kalau batas durasi fungsi mengganggu.

## 5. Integrasi Telegram

**Langkah awal:** buat bot lewat @BotFather, simpan token, lalu ambil user ID Telegram kamu (misalnya lewat bot pengecek ID) untuk whitelist.

**Dua cara menerima pesan:**

| | Webhook | Long polling |
|---|---|---|
| Cara kerja | Telegram memanggil URL `/api/telegram` milikmu | Aplikasimu terus bertanya ke Telegram |
| Cocok untuk | Deploy ke Vercel atau server publik | Development lokal atau server sendiri |
| Syarat | URL HTTPS publik | Proses yang berjalan terus |
| Setup | Panggil `setWebhook` sekali dengan `secret_token` | Jalankan skrip `bot:dev` terpisah |

**Alur satu pesan lewat webhook:**

1. Telegram mengirim update ke `/api/telegram`.
2. Route memeriksa header `X-Telegram-Bot-Api-Secret-Token`. Jika tidak cocok, tolak 401.
3. Route memeriksa `from.id` dengan ID yang diizinkan. Jika bukan kamu, abaikan diam-diam.
4. Cek `update_id` di database agar update yang dikirim ulang tidak diproses dua kali.
5. Kirim aksi "typing", lalu panggil `services/chat.ts` dengan `channel = "telegram"` dan `chat.id` sebagai kunci percakapan.
6. Kirim jawaban ke Telegram, dipecah per 4.096 karakter.

**Hal teknis yang sering bikin bug:**

- **Timeout dan retry.** Telegram mengulang pengiriman jika webhook lama membalas. Balas cepat, dan jalankan pekerjaan berat di belakang (di Vercel pakai `after()` atau `waitUntil`), atau terima risiko batas durasi fungsi.
- **Tidak ada streaming asli.** Telegram tidak menampilkan token bertahap. Ada dua cara: kirim satu pesan setelah selesai (paling sederhana), atau kirim pesan awal lalu `editMessageText` berkala (lebih mulus, tapi kena batas rate Telegram).
- **Format Markdown.** Karakter khusus di MarkdownV2 mudah menyebabkan error. Mulai dengan teks biasa atau HTML parse mode, perbaiki formatnya belakangan.
- **Percakapan.** Satu chat Telegram = satu percakapan aktif. `/new` membuat percakapan baru dan menutup yang lama.

## 6. Integrasi Model AI Langsung

"Langsung" di sini berarti aplikasimu memanggil API provider (Anthropic, OpenAI, Google, dll.) memakai API key milikmu sendiri, tanpa layanan perantara seperti OpenRouter atau gateway lain.

**Bungkus dalam satu modul.** Semua pemanggilan model lewat `lib/ai/provider.ts` dengan dua fungsi: `streamReply(messages, options)` untuk web dan `generateReply(messages, options)` untuk Telegram. Nama model dan provider dibaca dari environment variable atau tabel pengaturan, jangan ditulis keras di kode. Dengan begitu mengganti model atau provider cukup mengubah satu tempat.

**Alur panggilan:**

1. Ambil N pesan terakhir percakapan (misalnya 20) dari database.
2. Susun: system prompt dari pengaturan, lalu riwayat, lalu pesan baru.
3. Panggil API dengan `max_tokens` yang dibatasi.
4. Web: alirkan token ke browser. Telegram: tunggu selesai, lalu kirim.
5. Simpan jawaban beserta jumlah token masuk dan keluar dari respons API.

**Kontrol biaya (penting karena tanpa login):**

- Batas `max_tokens` per jawaban dan batas panjang pesan masuk.
- Batas jendela riwayat (jangan kirim seluruh percakapan selamanya). Opsi lanjutan: ringkas riwayat lama.
- Tabel penggunaan harian dengan anggaran maksimum. Jika terlewati, bot membalas "anggaran harian habis" tanpa memanggil API.
- Setel batas pengeluaran di dashboard provider sebagai pengaman terakhir.

**Error yang harus ditangani:** rate limit (429), server provider sibuk (5xx, coba ulang dengan jeda), pesan terlalu panjang, dan API key salah. Telegram harus tetap membalas ramah di semua kasus itu, bukan diam.

## 7. Keamanan Tanpa Auth

Tanpa login bukan berarti tanpa pengaman. Begitu web ini ada di internet, siapa pun yang menemukan URL-nya bisa mengirim pesan dan menghabiskan kuota API-mu. Ada tiga lapis yang tetap wajib:

1. **Gerbang web yang minimal.** Pilih salah satu:
    - Satu password bersama lewat middleware (HTTP Basic Auth dari environment variable). Ini bukan sistem akun, hanya satu kata sandi.
    - Taruh di balik jaringan privat (Tailscale) atau Cloudflare Access sehingga URL tidak terbuka untuk umum.
    - Jalankan hanya di komputer sendiri jika web tidak perlu diakses dari luar.
2. **Telegram.** Webhook diverifikasi dengan `secret_token`, dan hanya `from.id` milikmu yang dilayani. Pesan dari orang lain diabaikan tanpa memanggil model.
3. **Anggaran dan rate limit.** Batas pesan per menit dan anggaran harian di database, supaya kebocoran URL tidak menjadi tagihan besar.

Hal lain yang tetap berlaku: API key dan token bot hanya di server (jangan pernah diawali `NEXT_PUBLIC_`), file `.env` masuk `.gitignore`, validasi semua input dengan Zod, dan render Markdown jawaban AI dengan sanitasi supaya tidak ada HTML berbahaya yang dieksekusi.

Kalau kamu ingin benar-benar tanpa gerbang web, setidaknya bagian anggaran harian harus tetap aktif.

## 8. Struktur Folder dan Database

```
ai-pribadi/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                  # chat utama
│  │  ├─ c/[id]/page.tsx           # satu percakapan
│  │  ├─ pengaturan/page.tsx       # system prompt, model
│  │  ├─ penggunaan/page.tsx       # token dan biaya
│  │  └─ api/
│  │     ├─ chat/route.ts          # streaming untuk web
│  │     ├─ conversations/route.ts
│  │     └─ telegram/route.ts      # webhook
│  ├─ components/chat/             # daftar pesan, input, sidebar
│  ├─ lib/
│  │  ├─ ai/provider.ts            # satu-satunya tempat memanggil model
│  │  ├─ telegram/bot.ts           # instance grammY dan handler
│  │  ├─ db/                       # client dan skema
│  │  ├─ budget.ts                 # cek anggaran harian
│  │  └─ env.ts                    # validasi env dengan Zod
│  ├─ services/
│  │  └─ chat.ts                   # otak bersama web dan Telegram
│  └─ middleware.ts                # gerbang password (opsional)
├─ scripts/
│  ├─ set-webhook.ts               # daftarkan webhook Telegram
│  └─ bot-polling.ts               # mode polling untuk lokal
├─ .env.example
└─ package.json
```

Skema database (contoh Prisma, mudah diterjemahkan ke Drizzle):

```prisma
model Conversation {
  id          String    @id @default(cuid())
  channel     String                       // "web" | "telegram"
  externalId  String?                      // chat.id Telegram
  title       String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]
  @@index([channel, externalId, isActive])
}

model Message {
  id              String   @id @default(cuid())
  conversationId  String
  role            String                   // "user" | "assistant"
  content         String
  model           String?
  inputTokens     Int?
  outputTokens    Int?
  createdAt       DateTime @default(now())
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
}

model Setting {
  key    String @id                        // "systemPrompt", "model", "maxTokens", "dailyBudgetUsd"
  value  String
}

model DailyUsage {
  date          DateTime @id @db.Date
  inputTokens   Int      @default(0)
  outputTokens  Int      @default(0)
  messageCount  Int      @default(0)
}

model ProcessedUpdate {
  updateId  Int      @id                   // cegah update Telegram diproses dua kali
  createdAt DateTime @default(now())
}
```

Tidak ada tabel `User`. Kalau suatu hari ingin mengizinkan orang lain, tambahkan tabel itu belakangan dan hubungkan ke `Conversation`.

## 9. Environment Variable

| Variabel | Fungsi | Wajib |
|---|---|---|
| `AI_PROVIDER` | Provider aktif (misalnya `anthropic`) | Ya |
| `AI_API_KEY` | API key provider | Ya |
| `AI_MODEL` | Nama model default | Ya |
| `TELEGRAM_BOT_TOKEN` | Token dari @BotFather | Ya |
| `TELEGRAM_WEBHOOK_SECRET` | String acak untuk verifikasi webhook | Ya |
| `TELEGRAM_ALLOWED_USER_ID` | User ID Telegram kamu | Ya |
| `DATABASE_URL` | Koneksi database | Ya |
| `APP_URL` | URL publik untuk mendaftarkan webhook | Ya (produksi) |
| `APP_PASSWORD` | Password gerbang web | Disarankan |
| `DAILY_BUDGET_USD` | Batas pengeluaran harian | Disarankan |

## 10. Roadmap dan Estimasi Prompt

Dengan cakupan yang jauh lebih kecil, perkiraanku turun jadi **sekitar 12 sampai 20 prompt untuk Fase 1**. Ini estimasi kasar, dan bagian Telegram serta deploy yang paling sering butuh putaran perbaikan.

| Tahap | Prompt | Hasil yang bisa dites |
|---|---|---|
| 1. Setup proyek, env, database, skema | 2 sampai 3 | Proyek jalan, migrasi berhasil |
| 2. `provider.ts` dan `services/chat.ts` | 2 sampai 3 | Fungsi chat bisa dites lewat skrip |
| 3. UI chat web dengan streaming | 3 sampai 4 | Bisa ngobrol di browser, riwayat tersimpan |
| 4. Sidebar percakapan dan halaman pengaturan | 2 sampai 3 | Ganti model dan system prompt dari web |
| 5. Bot Telegram (polling lokal dulu) | 2 sampai 3 | Bot membalas di Telegram saat dijalankan lokal |
| 6. Webhook, whitelist, dedupe, pecah pesan | 2 sampai 3 | Siap produksi |
| 7. Anggaran harian dan halaman penggunaan | 1 sampai 2 | Pengeluaran terlihat dan terbatas |
| 8. Gerbang password, deploy, set webhook | 2 sampai 3 | Online dan terlindungi |

Saran urutan: selesaikan tahap 2 dan tes lewat skrip sebelum membuat UI, supaya bug logika tidak bercampur dengan bug tampilan. Mode polling (tahap 5) memungkinkan kamu menguji Telegram tanpa deploy dan tanpa HTTPS publik.

## 11. Checklist Awal dan Prompt Pertama

- [ ] Pilih provider model dan buat API key. Setel batas pengeluaran di dashboard provider.
- [ ] Buat bot di @BotFather dan catat token.
- [ ] Ambil user ID Telegram kamu.
- [ ] Putuskan deploy: Vercel (Opsi A) atau server sendiri (Opsi B).
- [ ] Buat repo kosong dan siapkan `.env` dari `.env.example`.
- [ ] Simpan dokumen ini sebagai `PLAN.md` di repo supaya agen punya konteks tetap.

Contoh prompt pertama untuk Antigravity (sesuaikan pilihanmu):

```markdown
Baca PLAN.md. Buat proyek Next.js (App Router, TypeScript, Tailwind)
untuk asisten AI pribadi satu pengguna tanpa login.

Tugas tahap 1 saja:
1. Inisialisasi proyek dan pasang shadcn/ui, Zod, grammY, Drizzle.
2. Buat src/lib/env.ts yang memvalidasi semua env di PLAN.md bagian 9.
3. Buat skema database sesuai PLAN.md bagian 8 dan jalankan migrasi.
4. Buat .env.example. Jangan buat UI atau route dulu.

Berhenti setelah itu dan tunjukkan cara menjalankan dan memeriksanya.
```

Pola yang sama dipakai untuk tiap tahap: satu tujuan jelas, batasan apa yang belum dikerjakan, dan cara memeriksa hasilnya.

## 12. Pertanyaan yang Menentukan Arah Berikutnya

1. Provider model mana yang akan dipakai (Anthropic, OpenAI, Google, atau lainnya)?
2. Deploy ke Vercel atau server sendiri? Ini menentukan database dan mode Telegram.
3. Apakah web perlu diakses dari luar rumah, atau cukup di komputer sendiri?
4. Apakah bot perlu menerima foto, file, atau suara sejak awal?
5. Apakah tujuan utamanya tetap membantu ngoding, sehingga perlu fitur khusus (misalnya menyimpan snippet dan proyek)?


---

# BAGIAN II: Generator Blueprint, PRD, dan MVC dalam Satu Prompt

Bagian I merancang asisten chat. Bagian II mengubah tujuan produk: web ini menjadi **mesin penyusun dokumen rekayasa perangkat lunak**. Pengguna menulis satu ide, lalu web menghasilkan satu paket dokumen selevel software engineer senior (10 tahun pengalaman).

Ini perubahan arsitektur, bukan sekadar tambahan fitur. Chat itu percakapan bolak-balik, sedangkan generator ini adalah **pipeline bertahap** yang menghasilkan dokumen panjang dan saling konsisten. Sebagian besar kode Bagian I (provider model, anggaran, Telegram, database) tetap dipakai ulang.

> Catatan istilah: aku menafsirkan "MVC" sebagai desain Model-View-Controller (entitas data, halaman, endpoint, struktur folder). Kalau yang kamu maksud MVP, cukup tambah satu dokumen di tahap 5 (lihat bagian 15). PRD di bawah sudah memuat cakupan MVP.

## 13. Hasil yang Diinginkan

**Input:** satu kolom teks, contoh: "Aplikasi booking lapangan futsal untuk pemilik lapangan dan pemain di Indonesia."

**Output (satu paket, satu klik):**

| Dokumen | Isi inti | Pembaca |
|---|---|---|
| Product Brief | Ringkasan ide, asumsi, batasan, pertanyaan terbuka | Semua |
| PRD | Tujuan, persona, user story, kebutuhan fungsional dan non-fungsional, metrik, cakupan MVP, risiko | Product, tim |
| Blueprint (arsitektur) | Konteks sistem, komponen, tech stack beserta alasannya, alur data, deployment, keamanan, skalabilitas, biaya | Engineer |
| Desain MVC | Model dan relasi (ERD), controller dan endpoint, view dan routing, struktur folder, validasi | Developer |
| Laporan Review | Pemeriksaan konsistensi antar dokumen, celah, dan risiko tersisa | Reviewer |

**Definisi "selevel senior engineer"** (ini yang diukur, bukan sekadar terdengar pintar):

1. **Asumsi dinyatakan eksplisit.** Karena hanya satu prompt, tidak ada tanya jawab. Hal yang tidak diketahui ditulis sebagai asumsi bernomor, bukan ditebak diam-diam.
2. **Trade-off, bukan daftar teknologi.** Setiap keputusan penting punya alasan, alternatif yang ditolak, dan konsekuensinya (format ADR singkat).
3. **Non-goals jelas.** Apa yang sengaja tidak dibangun di MVP.
4. **Dapat diuji.** Setiap kebutuhan punya ID dan kriteria penerimaan terukur.
5. **Memikirkan kegagalan.** Error, data ganda, konkurensi, keamanan, dan biaya dibahas, bukan hanya jalur mulus.
6. **Terlacak.** Setiap kebutuhan PRD dapat ditelusuri sampai ke model dan controller yang memenuhinya.
7. **Proporsional.** MVP kecil tidak diberi arsitektur microservice. Kompleksitas harus dibenarkan oleh kebutuhan.

## 14. Arsitektur Pipeline

Satu prompt dari pengguna, tetapi di dalamnya beberapa panggilan AI berurutan. Satu panggilan raksasa menghasilkan dokumen dangkal dan saling bertabrakan. Pipeline membuat tiap dokumen fokus dan konsisten.

```
 Ide pengguna (1 prompt)
        |
        v
 [Tahap 0] Intake & Normalisasi ---> ProductBrief (JSON: asumsi, batasan, tipe produk)
        |
        v
 [Tahap 1] PRD ---------------------> prd.md  (kebutuhan ber-ID: FR-001, NFR-001)
        |
        v
 [Tahap 2] Blueprint ---------------> blueprint.md (+ diagram Mermaid, ADR)
        |
        v
 [Tahap 3] Desain MVC --------------> mvc.md (+ ERD, tabel endpoint, struktur folder)
        |
        v
 [Tahap 4] Review & Konsistensi ----> review.md (celah, kontradiksi, perbaikan)
        |
        v
 [Tahap 5] Perakitan & Ekspor ------> paket .md / .zip
```

**Aturan penting:**

- Tiap tahap menerima **output tahap sebelumnya sebagai konteks**, sehingga PRD, Blueprint, dan MVC memakai istilah, entitas, dan ID yang sama.
- Tahap 0 dan Tahap 4 menghasilkan **JSON terstruktur** (divalidasi Zod). Tahap 1 sampai 3 menghasilkan **Markdown** dengan kerangka heading yang dipaksakan.
- Tahap 4 (review) memakai peran berbeda: kritikus yang mencari kelemahan. Jika menemukan masalah serius, tahap terkait diperbaiki sekali (maksimal satu putaran, supaya biaya terkendali).
- Setiap tahap tersimpan di database begitu selesai. Kalau gagal di tengah, kamu melanjutkan dari tahap terakhir, tidak mengulang dari awal.

## 15. Kerangka Dokumen yang Wajib Dihasilkan

Kerangka ini disisipkan ke prompt tiap tahap dan divalidasi setelah output selesai (heading wajib ada, tidak boleh ada placeholder seperti "TBD" atau "lorem").

### 15.1 Product Brief (JSON)

```json
{
  "namaProduk": "string",
  "ringkasan": "2-3 kalimat",
  "tipeProduk": "web | mobile | api | internal-tool | marketplace | lainnya",
  "masalah": "string",
  "penggunaUtama": ["string"],
  "asumsi": [{ "id": "A-01", "isi": "string", "risikoJikaSalah": "string" }],
  "batasan": ["string"],
  "diLuarCakupan": ["string"],
  "pertanyaanTerbuka": ["string"]
}
```

### 15.2 PRD

1. Ringkasan eksekutif dan latar belakang masalah
2. Tujuan dan metrik keberhasilan (terukur, ada target dan cara mengukur)
3. Non-goals
4. Persona (tujuan, frustrasi, konteks pakai)
5. User journey utama
6. User story dengan kriteria penerimaan (format Given-When-Then), diberi ID `US-001`
7. Kebutuhan fungsional, diberi ID `FR-001`, diprioritaskan (Must, Should, Could)
8. Kebutuhan non-fungsional, diberi ID `NFR-001` (performa, keamanan, ketersediaan, aksesibilitas, kepatuhan data)
9. Cakupan MVP dan alasan pemotongan, serta rencana rilis bertahap
10. Dependensi, asumsi (rujuk `A-xx`), dan risiko beserta mitigasinya
11. Pertanyaan terbuka

### 15.3 Blueprint

1. Tujuan dan konteks sistem (diagram konteks Mermaid)
2. Driver arsitektur (kebutuhan NFR yang paling membentuk desain)
3. Gaya arsitektur yang dipilih dan alasannya (monolit modular, dll.)
4. Komponen dan tanggung jawabnya (diagram komponen)
5. Tech stack, tiap pilihan dengan alasan dan alternatif yang ditolak
6. Alur data dan alur kritis (diagram sekuens untuk 2 sampai 3 alur terpenting)
7. Strategi data: penyimpanan, indeks, cache, migrasi, backup
8. Keamanan: autentikasi, otorisasi, proteksi data, ancaman utama dan mitigasinya
9. Skalabilitas dan performa: titik leher botol yang diperkirakan dan kapan perlu ditangani
10. Deployment, environment, CI/CD
11. Observabilitas: log, metrik, alert
12. Estimasi biaya kasar dan pendorong biayanya
13. Catatan keputusan (ADR): konteks, keputusan, alternatif, konsekuensi
14. Risiko teknis dan rencana mitigasi

### 15.4 Desain MVC

1. **Model:** tiap entitas dengan field, tipe, constraint, indeks, relasi, dan aturan bisnis; ERD Mermaid
2. **Controller:** tabel endpoint (method, path, controller#action, auth, validasi input, respons sukses dan error, kebutuhan PRD yang dipenuhi)
3. **View:** daftar halaman dan komponen, rute, data yang dibutuhkan tiap halaman, state kosong, loading, dan error
4. **Service layer:** logika bisnis yang tidak boleh ada di controller
5. **Validasi dan penanganan error:** konvensi format error, kode status
6. **Struktur folder** proyek (pohon direktori)
7. **Skema database** (siap salin ke Prisma atau SQL)
8. **Matriks keterlacakan:** `FR-xxx` ke Model, Controller, View
9. **Urutan implementasi:** daftar tugas berurutan dengan dependensi, siap dijadikan prompt coding

### 15.5 Laporan Review (JSON lalu dirender ke Markdown)

```json
{
  "skorKonsistensi": 0,
  "temuan": [{
    "tingkat": "kritis | penting | saran",
    "dokumen": "prd | blueprint | mvc",
    "masalah": "string",
    "perbaikan": "string"
  }],
  "kebutuhanTanpaImplementasi": ["FR-007"],
  "risikoTersisa": ["string"]
}
```

## 16. Rancangan Prompt

Inilah bagian yang paling menentukan kualitas hasil. Semua tahap berbagi **persona dasar**, lalu ditambah instruksi spesifik tahap.

### 16.1 Persona dasar (system prompt bersama)

```text
Kamu adalah Principal Software Engineer dengan pengalaman 10+ tahun
merancang dan mengirim produk nyata (web, API, sistem terdistribusi).
Kamu menulis dokumen untuk tim yang akan benar-benar membangunnya.

Prinsip kerja:
1. Jika informasi kurang, jangan bertanya. Tulis asumsi bernomor
   (A-01, A-02, ...) dan sebutkan dampaknya jika asumsi itu salah.
2. Setiap keputusan teknis harus memuat alasan, alternatif yang ditolak,
   dan konsekuensinya. Hindari daftar teknologi tanpa alasan.
3. Pilih solusi paling sederhana yang memenuhi kebutuhan. Jangan menambah
   kompleksitas (microservice, queue, cache) tanpa kebutuhan yang tertulis.
4. Selalu bahas jalur gagal: error, data ganda, konkurensi, keamanan, biaya.
5. Kebutuhan harus terukur dan dapat diuji. Hindari kata kabur
   ("cepat", "mudah", "aman") tanpa angka atau kriteria.
6. Gunakan ID yang konsisten (US-, FR-, NFR-, A-, ADR-) dan rujuk silang.
7. Dilarang menulis placeholder (TBD, dll.) atau mengulang isi
   dokumen sebelumnya. Rujuk lewat ID.
8. Bahasa: {{BAHASA}}. Istilah teknis boleh bahasa Inggris.
9. Keluarkan hanya dokumen yang diminta, sesuai kerangka, tanpa basa-basi.
```

### 16.2 Prompt per tahap (kerangka)

**Tahap 0, Intake.**
Tugas: ubah ide mentah menjadi Product Brief JSON sesuai skema 15.1. Wajib menentukan `tipeProduk`, menyatakan minimal 5 asumsi, dan membatasi cakupan agar realistis untuk tim kecil. Keluaran hanya JSON.

**Tahap 1, PRD.**
Input: Product Brief. Tugas: tulis PRD mengikuti kerangka 15.2. Aturan tambahan: minimal 8 user story dengan kriteria penerimaan Given-When-Then; setiap FR menunjuk ke minimal satu US; MVP harus memuat hanya kebutuhan Must; sertakan non-goals; metrik harus punya angka target.

**Tahap 2, Blueprint.**
Input: Brief dan PRD. Tugas: tulis Blueprint mengikuti kerangka 15.3. Aturan tambahan: pilih arsitektur berdasarkan NFR yang ada di PRD dan sebut NFR mana yang menjadi pendorongnya; sertakan minimal 3 ADR; sertakan diagram Mermaid yang valid (konteks, komponen, minimal dua sekuens); bahas biaya dan keamanan secara konkret.

**Tahap 3, MVC.**
Input: Brief, PRD, Blueprint. Tugas: tulis desain MVC mengikuti kerangka 15.4. Aturan tambahan: setiap FR Must harus punya minimal satu endpoint atau view; nama entitas harus sama dengan yang dipakai di Blueprint; tampilkan ERD Mermaid valid; akhiri dengan matriks keterlacakan dan urutan implementasi.

**Tahap 4, Review.**
Input: semua dokumen. Peran: arsitek penguji yang mencari kelemahan. Tugas: periksa (a) setiap FR punya implementasi di MVC, (b) tidak ada istilah atau entitas yang bertentangan antar dokumen, (c) NFR terpenuhi oleh Blueprint, (d) ada kompleksitas berlebih, (e) celah keamanan. Keluaran JSON sesuai 15.5.

### 16.3 Aturan teknis pemanggilan

- Setel `max_tokens` per tahap sesuai panjang dokumen (PRD dan MVC paling panjang).
- Suhu rendah sampai sedang untuk konsistensi. Tahap review lebih rendah.
- Tahap 0 dan 4: minta keluaran JSON, validasi dengan Zod, ulang sekali jika gagal parse.
- Tahap 1 sampai 3: setelah selesai, validasi heading wajib dan keberadaan ID. Jika kurang, minta model melengkapi bagian yang hilang saja (bukan menulis ulang semua).
- Diagram Mermaid divalidasi dengan parser Mermaid di server. Jika tidak valid, kirim pesan error ke model untuk perbaikan satu kali.
- Prompt dan kerangka disimpan sebagai file template di repo (`prompts/`), bukan teks panjang di dalam kode, supaya mudah diperbaiki tanpa mengubah logika.

## 17. Desain Teknis di Next.js

### 17.1 Struktur tambahan

```
src/
├─ app/
│  ├─ buat/page.tsx                  # satu kolom prompt + pilihan (bahasa, gaya)
│  ├─ proyek/[id]/page.tsx           # hasil: tab Brief | PRD | Blueprint | MVC | Review
│  ├─ proyek/page.tsx                # daftar proyek
│  └─ api/
│     ├─ generate/route.ts           # mulai pipeline, kembalikan projectId
│     ├─ generate/[id]/stage/route.ts# jalankan satu tahap (streaming)
│     ├─ projects/[id]/export/route.ts  # unduh .md atau .zip
│     └─ telegram/route.ts           # + perintah /buat
├─ services/generator/
│  ├─ pipeline.ts                    # urutan tahap dan konteks antar tahap
│  ├─ stages/{intake,prd,blueprint,mvc,review}.ts
│  ├─ validators.ts                  # cek heading, ID, placeholder, Mermaid
│  └─ assemble.ts                    # gabung dan ekspor
├─ prompts/
│  ├─ persona.md
│  └─ {intake,prd,blueprint,mvc,review}.md
└─ components/generator/
   ├─ StageStepper.tsx               # progres per tahap
   ├─ DocViewer.tsx                  # render Markdown + Mermaid
   └─ ExportMenu.tsx
```

### 17.2 Tambahan skema database

```prisma
model Project {
  id         String   @id @default(cuid())
  title      String
  idea       String                       // prompt asli pengguna
  language   String   @default("id")
  status     String   @default("running") // running | done | failed
  createdAt  DateTime @default(now())
  documents  Document[]
  runs       StageRun[]
}

model Document {
  id         String   @id @default(cuid())
  projectId  String
  type       String                       // brief | prd | blueprint | mvc | review
  version    Int      @default(1)
  content    String                       // Markdown, atau JSON untuk brief dan review
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([projectId, type, version])
}

model StageRun {
  id           String   @id @default(cuid())
  projectId    String
  stage        String
  status       String                      // pending | running | done | failed
  model        String?
  inputTokens  Int?
  outputTokens Int?
  error        String?
  startedAt    DateTime @default(now())
  finishedAt   DateTime?
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

### 17.3 Menjalankan pipeline panjang dengan aman

Satu paket lengkap kemungkinan memakan beberapa menit. Ini benturan langsung dengan batas durasi fungsi di Vercel. Pilihannya:

| Pendekatan | Cara kerja | Cocok untuk |
|---|---|---|
| **Klien menyambung tahap** | Browser memanggil `/stage` satu per satu (tiap tahap = satu request pendek, di-stream). Progres bisa dilanjutkan jika koneksi putus karena tersimpan per tahap. | Web di Vercel, paling sederhana |
| **Antrean latar** | `/generate` menaruh job ke Inngest atau QStash, worker menjalankan tahap berurutan, UI polling status. | Vercel yang ingin tetap jalan saat tab ditutup |
| **Proses panjang di server sendiri** | Satu proses Node menjalankan pipeline tanpa batas durasi. | Opsi B (VPS) |

Rekomendasi: mulai dari **klien menyambung tahap**. Untuk Telegram, pakai antrean latar atau server sendiri, karena bot harus tetap bisa membalas tanpa menunggu browser.

### 17.4 Pengalaman pengguna

- Satu halaman: kolom prompt besar, tombol "Buat Paket Dokumen".
- Opsi ringan (opsional): bahasa dokumen, tipe produk (otomatis), tingkat detail (ringkas atau mendalam).
- Saat berjalan: stepper lima tahap, dokumen muncul bertahap lewat streaming sehingga pengguna sudah bisa membaca PRD sementara Blueprint masih ditulis.
- Hasil: tab per dokumen, render Mermaid sebagai diagram, tombol salin dan unduh.
- Aksi lanjutan: **Regenerasi satu tahap** (misalnya hanya Blueprint dengan catatan "pakai Postgres, bukan MongoDB"), dengan dokumen hilir ditandai kedaluwarsa.
- Ekspor: satu file `.md` gabungan, atau `.zip` berisi `prd.md`, `blueprint.md`, `mvc.md`, `review.md`, `PLAN.md` siap taruh di repo untuk Antigravity.

### 17.5 Integrasi Telegram

- `/buat <ide>`: memulai pipeline dan membalas "sedang dibuat" beserta nomor proyek.
- Bot mengirim kabar tiap tahap selesai, lalu mengirim dokumen sebagai file (`sendDocument`), bukan teks panjang, karena batas 4.096 karakter per pesan.
- `/proyek` menampilkan daftar, `/ulang <id> <tahap>` meregenerasi satu tahap.

## 18. Kontrol Biaya dan Waktu

Satu paket penuh adalah beberapa panggilan besar. Pantau, jangan menebak.

- Catat token per tahap di `StageRun`, lalu tampilkan biaya per proyek di halaman penggunaan.
- Anggaran harian dari Bagian I tetap berlaku. Cek **sebelum** tahap dimulai, dan berikan estimasi sebelum pengguna menekan tombol.
- Mode "ringkas" dan "mendalam": ringkas membatasi jumlah user story dan panjang bagian, mendalam menambahnya.
- Model berbeda per tahap diperbolehkan lewat pengaturan: model terkuat untuk PRD, Blueprint, dan Review (di sini kualitas paling terasa), model lebih hemat untuk Intake.
- Batas satu putaran perbaikan pada tahap review supaya biaya tidak melonjak.
- Sertakan batas panjang prompt pengguna (misalnya 2.000 karakter).

## 19. Pengujian Kualitas

Tanpa pengujian, kualitas generator akan naik turun tiap kali prompt diubah.

**Set ide uji (golden prompts), minimal 5 dan beragam:**

1. Aplikasi CRUD sederhana (todo atau inventaris)
2. Marketplace dua sisi (booking, jual beli)
3. Sistem dengan pembayaran dan webhook
4. Tool internal berbasis data (dashboard)
5. API publik dengan rate limit

**Pemeriksaan otomatis untuk tiap hasil:**

- Semua heading wajib ada dan tidak kosong.
- Tidak ada placeholder (TBD, lorem, "akan ditentukan").
- Setiap `FR-` Must muncul di matriks keterlacakan MVC.
- Setiap ID yang dirujuk memang ada di dokumen asalnya.
- Semua blok Mermaid lolos parser.
- Nama entitas di Blueprint dan MVC cocok.
- Minimal 3 ADR dan 5 asumsi.

**Pemeriksaan manual berkala:** bandingkan hasil dengan dokumen buatan engineer sungguhan, dan perbaiki prompt berdasarkan temuan. Simpan versi prompt di Git sehingga setiap perubahan bisa dibandingkan hasilnya.

## 20. Risiko dan Cara Menanganinya

| Risiko | Dampak | Penanganan |
|---|---|---|
| Dokumen terdengar meyakinkan tetapi keliru | Tim membangun di atas keputusan buruk | Tahap review, asumsi eksplisit, dan pengguna tetap memeriksa keputusan inti |
| Dokumen antar tahap tidak konsisten | Kebingungan saat implementasi | Konteks berantai, ID bersama, validator keterlacakan |
| Hasil generik untuk ide yang berbeda | Tidak terasa "senior" | Persona kuat, kewajiban trade-off dan ADR, golden prompts |
| Timeout dan biaya membengkak | Pipeline gagal atau mahal | Tahap per request, simpan per tahap, anggaran, batas panjang |
| Mermaid tidak valid | Diagram rusak | Validasi server dan satu kali perbaikan otomatis |
| Prompt injection lewat ide pengguna | Model keluar jalur | Perlakukan ide sebagai data dalam delimiter, abaikan instruksi di dalamnya |

## 21. Roadmap Lanjutan dan Estimasi Prompt

Bagian I dianggap sudah jadi (kamu menyebut web-nya sudah selesai). Tahap berikut dibangun di atasnya.

| Tahap | Prompt | Hasil yang bisa dites |
|---|---|---|
| A. Skema Project, Document, StageRun dan migrasi | 1 sampai 2 | Tabel baru siap |
| B. File template prompt dan validator (Zod, heading, ID) | 2 sampai 3 | Validator lolos pada contoh dokumen |
| C. Tahap 0 dan 1 (Intake, PRD) lewat skrip | 2 sampai 3 | PRD valid dari satu ide |
| D. Tahap 2 dan 3 (Blueprint, MVC) + validasi Mermaid | 3 sampai 4 | Dokumen berantai konsisten |
| E. Tahap 4 (Review) + satu putaran perbaikan | 2 | Laporan temuan dan keterlacakan |
| F. UI: halaman buat, stepper, tab dokumen, render Mermaid | 3 sampai 4 | Alur lengkap di browser |
| G. Ekspor .md dan .zip, regenerasi per tahap | 2 | Paket siap unduh |
| H. Perintah Telegram `/buat`, kirim file | 2 sampai 3 | Paket dikirim ke Telegram |
| I. Pengujian golden prompts dan penyempurnaan prompt | 3 sampai 5 | Kualitas stabil |

Perkiraan total **sekitar 20 sampai 30 prompt**. Tahap I paling tidak bisa diperkirakan karena menyempurnakan prompt biasanya butuh beberapa putaran. Saran urutan: bangun dan uji pipeline lewat skrip (tahap B sampai E) **sebelum** membuat UI, supaya kualitas dokumen dipastikan lebih dulu.

## 22. Prompt Pertama untuk Antigravity (Bagian II)

```markdown
Baca PLAN.md (Bagian I dan II). Proyek chat sudah ada. Sekarang tambahkan
generator dokumen satu-prompt sesuai Bagian II. Kerjakan tahap A dan B saja:

1. Tambahkan model Project, Document, StageRun ke skema (PLAN.md 17.2)
   dan jalankan migrasi tanpa merusak tabel yang ada.
2. Buat folder src/prompts dengan persona.md dan lima file tahap,
   isi sesuai PLAN.md bagian 16. Template memakai placeholder
   {{BAHASA}}, {{IDE}}, {{BRIEF}}, {{PRD}}, {{BLUEPRINT}}, {{MVC}}.
3. Buat src/services/generator/validators.ts: cek heading wajib,
   cek placeholder terlarang, cek ID yang dirujuk ada, cek Mermaid valid,
   dan skema Zod untuk Brief serta Review (PLAN.md 15.1 dan 15.5).
4. Tulis unit test untuk validators dengan contoh dokumen benar dan salah.

Jangan buat UI atau route dulu. Berhenti setelah test lolos dan
tunjukkan cara menjalankannya.
```

Prompt tahap berikutnya mengikuti pola yang sama: satu tahap, batasan jelas, dan cara memeriksa hasil.

## 23. Checklist Peluncuran Bagian II

- [ ] Lima golden prompts menghasilkan paket yang lolos semua validator.
- [ ] Setiap hasil dibaca manual minimal sekali, terutama Blueprint dan MVC.
- [ ] Biaya rata-rata per paket sudah diukur dan masih dalam anggaran.
- [ ] Anggaran harian dan gerbang password aktif.
- [ ] Ekspor `.zip` bisa langsung dipakai sebagai `PLAN.md` proyek baru.
- [ ] Prompt dan template tersimpan di Git dengan nomor versi.

## 24. Pertanyaan Lanjutan

1. "MVC" yang kamu maksud memang Model-View-Controller, atau MVP? Ini menentukan dokumen tahap 3.
2. Dokumen cukup berbahasa Indonesia, atau perlu pilihan bahasa Inggris juga?
3. Hasil akhir dipakai untuk apa: diberikan ke AI coding agent (Antigravity), ke tim manusia, atau keduanya? Kalau untuk agent, kita tambah dokumen "urutan prompt coding" otomatis.
4. Bagian mana dari web yang kamu bangun sekarang yang terasa tidak sesuai harapan? Jawabanmu membantu aku memperbaiki rencana, bukan hanya menambah.


---

# BAGIAN III: Pemilih Model Dinamis dan Koneksi Nyata ke Gateway

Bagian ini memperbaiki masalah pada halaman pengaturan: model yang tampil tidak sama dengan model yang tersedia di 9Router, dan tombol "Tes Koneksi" belum membuktikan bahwa model benar-benar bisa dipakai.

## 25. Diagnosis Masalah

Dari screenshot pengaturan, ada tiga penyebab yang saling bertumpuk:

1. **Daftar "Model Populer" ditulis manual di kode** (Gemini 2.0 Flash, Claude 3.5 Sonnet, GPT-4o, DeepSeek V3). Daftar ini tidak pernah bertanya ke 9Router, jadi pasti tidak sinkron dengan provider yang kamu sambungkan di dashboard 9Router.
2. **Format ID model berbeda antar gateway.** Nilai `google/gemini-2.0-flash-exp:free` adalah gaya penamaan OpenRouter. 9Router memakai ID berprefiks sendiri (contoh gaya `cc/claude-opus-4-6` atau `kr/claude-sonnet-4.5`, sesuai provider yang tersambung). ID dari satu gateway ditempel ke gateway lain akan ditolak.
3. **"Tes Koneksi" kemungkinan hanya memeriksa URL atau key**, bukan benar-benar memanggil model yang dipilih. Koneksi bisa tampak sukses, tapi chat gagal karena ID model salah.

Satu konsekuensi lain: kolom "Model Identifier" sekarang teks bebas, jadi salah ketik langsung lolos tanpa peringatan.

## 26. Solusi: Ambil Model Langsung dari Endpoint

Hampir semua gateway yang kompatibel dengan OpenAI menyediakan `GET {baseUrl}/models`. Di 9Router, endpoint itu mengembalikan model dari provider yang sudah tersambung di dashboard-nya. Jadi sumber kebenaran daftar model adalah **gateway itu sendiri**, bukan kode kita.

Perubahan perilaku:

| Sekarang | Seharusnya |
|---|---|
| Chip model ditulis manual | Daftar diambil dari `/models` setelah URL dan key terisi |
| ID model diketik bebas | Combobox bisa dicari, dengan opsi tetap boleh mengetik ID kustom |
| Tes koneksi tidak jelas | Dua langkah: (1) muat model, (2) kirim pesan uji ke model terpilih |
| Ganti provider tapi model lama tetap | Ganti provider mengosongkan pilihan model |
| Model hanya di pengaturan | Model bisa diganti per percakapan dari kolom chat |
| Error umum | Pesan error spesifik (key salah, URL salah, model tidak ada, rate limit) |

## 27. Catatan Khusus 9Router

Ini hal yang perlu diperhatikan karena perilakunya berbeda dari OpenAI atau OpenRouter:

- **Metadata minim.** Respons `/v1/models` 9Router bisa hanya berisi `id`, `object`, dan `owned_by`, tanpa panjang konteks atau harga. UI jangan menampilkan kolom yang kosong, dan jangan memaksa metadata ada.
- **ID berprefiks.** Gunakan ID persis seperti yang dikembalikan endpoint, jangan diubah atau dinormalkan.
- **Combo.** 9Router punya fitur combo (rantai fallback). Combo mungkin muncul sebagai model di daftar, atau mungkin tidak. Karena itu **input ID kustom harus tetap tersedia**.
- **API key.** Pada instalasi yang bisa diakses dari luar, `/v1/*` biasanya mewajibkan Bearer key dari dashboard 9Router, dan tanpa key responsnya 401. Key ini berbeda dari key provider di dalamnya.
- **Localhost.** Instalasi lokal 9Router biasanya di `http://localhost:20128/v1`. Alamat itu hanya bisa dijangkau jika aplikasi web kamu juga berjalan di komputer yang sama. Kalau web di-deploy ke Vercel, `localhost` merujuk ke server Vercel, bukan komputermu, jadi harus memakai URL publik atau tunnel.
- **Verifikasi manual.** Bandingkan dengan perintah ini. Jika hasilnya berbeda dari UI, bug ada di aplikasi, bukan di gateway:

```bash
curl -s https://api.9router.com/v1/models \
  -H "Authorization: Bearer KEY_KAMU" | head -c 1500
```

## 28. Alur Pengguna di Halaman Pengaturan

1. Pilih provider (preset mengisi Base URL otomatis dan mengosongkan model terpilih).
2. Isi atau ubah API Key.
3. Tombol **Muat Model** (otomatis berjalan setelah jeda 800 ms saat URL dan key terisi). Hasil: daftar model, jumlahnya, dan waktu pembaruan terakhir.
4. Pilih model dari combobox (pencarian, dikelompokkan per prefiks atau `owned_by`), atau pilih "Pakai ID kustom: …".
5. Tombol **Tes Koneksi** mengirim pesan sungguhan ("balas dengan kata OK", `max_tokens` kecil) ke model terpilih. Tampilkan: berhasil atau gagal, latensi, potongan balasan, dan penyebab jika gagal.
6. **Simpan**. Jika tes belum lulus, tetap boleh disimpan tetapi dengan peringatan.

Di halaman chat, kolom bawah (tempat tertulis "Apple Style • Personal Engine") ditambah **chip model aktif**. Menekannya membuka pemilih model yang sama, dan pilihan berlaku untuk percakapan itu saja.

## 29. Kode Inti (sesuaikan dengan struktur proyekmu)

### 29.1 `src/lib/ai/models.ts`

```ts
export type ModelInfo = {
  id: string;
  label: string;
  group: string;
  ownedBy?: string;
  contextLength?: number;
  isChat: boolean;
};

export type UpstreamCode =
  | "AUTH" | "NOT_FOUND" | "RATE_LIMIT" | "TIMEOUT"
  | "NOT_JSON" | "NETWORK" | "MODEL_INVALID" | "UPSTREAM";

export class UpstreamError extends Error {
  constructor(public code: UpstreamCode, message: string, public status?: number) {
    super(message);
  }
}

const NON_CHAT = /(embed|whisper|tts|speech|transcri|moderation|rerank|dall-e|imagen|image-gen|sora|veo)/i;

export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) throw new UpstreamError("NETWORK", "Base URL harus diawali http:// atau https://");
  u = u.replace(/\/+$/, "").replace(/\/(chat\/completions|models)$/i, "");
  return u;
}

async function call(url: string, apiKey: string | undefined, init: RequestInit = {}, timeoutMs = 15000) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError") throw new UpstreamError("TIMEOUT", "Server tidak merespons dalam 15 detik.");
    throw new UpstreamError("NETWORK", `Tidak bisa terhubung ke ${new URL(url).host}. Cek URL dan jaringan.`);
  }

  const text = await res.text();
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  let body: any = null;
  if (isJson) { try { body = JSON.parse(text); } catch {} }

  if (res.status === 401 || res.status === 403)
    throw new UpstreamError("AUTH", "API key ditolak atau belum diisi.", res.status);
  if (res.status === 429)
    throw new UpstreamError("RATE_LIMIT", "Terkena batas penggunaan (rate limit).", res.status);
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? text.slice(0, 200);
    if (res.status === 404 || res.status === 400)
      throw new UpstreamError(/model/i.test(msg) ? "MODEL_INVALID" : "NOT_FOUND", msg, res.status);
    throw new UpstreamError("UPSTREAM", msg, res.status);
  }
  if (!body)
    throw new UpstreamError("NOT_JSON", "Respons bukan JSON. Base URL kemungkinan salah (biasanya harus berakhir di /v1).");
  return body;
}

export async function fetchModels(baseUrl: string, apiKey?: string): Promise<ModelInfo[]> {
  const base = normalizeBaseUrl(baseUrl);
  const body = await call(`${base}/models`, apiKey);
  const raw: any[] = Array.isArray(body) ? body : body.data ?? body.models ?? [];
  const seen = new Set<string>();
  const out: ModelInfo[] = [];
  for (const m of raw) {
    const id = typeof m === "string" ? m : m.id ?? m.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: (typeof m === "object" && m.name) || id,
      group: id.includes("/") ? id.split("/")[0] : (m.owned_by ?? "lainnya"),
      ownedBy: m.owned_by,
      contextLength: m.context_length ?? m.context_window,
      isChat: !NON_CHAT.test(id),
    });
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}

export async function testModel(baseUrl: string, apiKey: string | undefined, model: string) {
  const base = normalizeBaseUrl(baseUrl);
  const t0 = Date.now();
  const body = await call(`${base}/chat/completions`, apiKey, {
    method: "POST",
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Balas hanya dengan kata: OK" }],
      max_tokens: 16,
      stream: false,
    }),
  }, 30000);
  const reply = body.choices?.[0]?.message?.content;
  if (typeof reply !== "string")
    throw new UpstreamError("UPSTREAM", "Respons tidak berformat OpenAI (tidak ada choices[0].message.content).");
  return { latencyMs: Date.now() - t0, reply: reply.slice(0, 120) };
}
```

### 29.2 Route API

```ts
// src/app/api/models/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchModels, UpstreamError } from "@/lib/ai/models";
import { getProviderConfig, saveModelCache } from "@/lib/db/provider";

const Body = z.object({
  baseUrl: z.string().min(1).optional(),
  apiKey: z.string().optional(),     // kosong = pakai key tersimpan
});

export async function POST(req: Request) {
  const input = Body.parse(await req.json());
  const saved = await getProviderConfig();
  const baseUrl = input.baseUrl ?? saved?.baseUrl;
  const apiKey = input.apiKey || saved?.apiKey;
  if (!baseUrl) return NextResponse.json({ ok: false, code: "NETWORK", message: "Base URL belum diisi." }, { status: 400 });

  try {
    const models = await fetchModels(baseUrl, apiKey);
    await saveModelCache(baseUrl, models);
    return NextResponse.json({ ok: true, count: models.length, models, fetchedAt: Date.now() });
  } catch (e) {
    if (e instanceof UpstreamError)
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 200 });
    throw e;
  }
}
```

```ts
// src/app/api/models/test/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { testModel, UpstreamError } from "@/lib/ai/models";
import { getProviderConfig } from "@/lib/db/provider";

const Body = z.object({
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
});

export async function POST(req: Request) {
  const input = Body.parse(await req.json());
  const saved = await getProviderConfig();
  const baseUrl = input.baseUrl ?? saved?.baseUrl;
  const apiKey = input.apiKey || saved?.apiKey;
  if (!baseUrl) return NextResponse.json({ ok: false, code: "NETWORK", message: "Base URL belum diisi." });

  try {
    const r = await testModel(baseUrl, apiKey, input.model);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof UpstreamError)
      return NextResponse.json({ ok: false, code: e.code, message: e.message });
    throw e;
  }
}
```

Catatan: pemanggilan ke gateway **selalu dari server**. Jangan memanggil dari browser, karena terkena CORS dan API key akan terlihat di tab Network. Respons ke browser tidak boleh memuat API key (kirim hanya `hasKey: true` atau empat karakter terakhir).

### 29.3 Komponen `ModelPicker` (ringkas)

```tsx
"use client";
import { useMemo, useState } from "react";
import type { ModelInfo } from "@/lib/ai/models";

type Props = {
  models: ModelInfo[];
  value: string;
  loading?: boolean;
  error?: string | null;
  onChange: (id: string) => void;
  onReload: () => void;
};

export function ModelPicker({ models, value, loading, error, onChange, onReload }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return models.filter((m) => m.isChat && (!s || m.id.toLowerCase().includes(s)));
  }, [models, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const m of filtered) map.set(m.group, [...(map.get(m.group) ?? []), m]);
    return [...map.entries()];
  }, [filtered]);

  const exists = models.some((m) => m.id === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 font-mono text-sm"
          placeholder={loading ? "Memuat model..." : "Cari atau ketik ID model"}
          value={open ? q : value}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={onReload} className="rounded-lg px-3 py-2 text-sm">
          {loading ? "..." : "Muat ulang"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && models.length > 0 && (
        <p className="text-xs text-zinc-400">{models.length} model dimuat dari gateway</p>
      )}
      {value && models.length > 0 && !exists && (
        <p className="text-xs text-amber-400">
          ID "{value}" tidak ada di daftar gateway. Jalankan Tes Koneksi untuk memastikan.
        </p>
      )}

      {open && (
        <div className="max-h-72 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950">
          {q.trim() && !models.some((m) => m.id === q.trim()) && (
            <button
              className="block w-full px-3 py-2 text-left text-sm"
              onClick={() => { onChange(q.trim()); setOpen(false); }}
            >
              Pakai ID kustom: <span className="font-mono">{q.trim()}</span>
            </button>
          )}
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="px-3 pt-2 text-xs uppercase text-zinc-500">{group}</div>
              {items.map((m) => (
                <button
                  key={m.id}
                  className="block w-full px-3 py-1.5 text-left font-mono text-sm hover:bg-zinc-900"
                  onClick={() => { onChange(m.id); setOpen(false); }}
                >
                  {m.id}
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && !loading && (
            <p className="px-3 py-3 text-sm text-zinc-500">Tidak ada model yang cocok.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## 30. Perubahan Database

```prisma
model ProviderConfig {
  id        String   @id @default("default")
  preset    String                       // 9router | openrouter | openai | deepseek | groq | custom
  baseUrl   String
  apiKey    String                       // terenkripsi (lihat 31)
  model     String?                      // model default global
  updatedAt DateTime @updatedAt
}

model ModelCache {
  baseUrl   String   @id                 // kunci cache per gateway
  modelsJson String                      // JSON array ModelInfo
  fetchedAt DateTime @default(now())
}

model FavoriteModel {
  baseUrl String
  modelId String
  @@id([baseUrl, modelId])
}
```

Tambahkan juga kolom `model String?` pada `Conversation`. Aturan pemilihan model saat chat: **model percakapan, lalu model default global, lalu error jelas "belum ada model dipilih"**.

## 31. Aturan Keamanan Tambahan

- **Enkripsi API key** di SQLite memakai AES-256-GCM dengan kunci dari environment variable `APP_SECRET`. Menyimpan key sebagai teks biasa berisiko jika file database bocor atau ikut ke backup.
- **Jangan pernah mengirim key kembali ke browser.** Endpoint pengaturan hanya mengembalikan `hasKey` dan empat karakter terakhir. Kolom key kosong saat disimpan berarti "jangan ubah".
- **Validasi Base URL:** hanya `http` atau `https`, tanpa username dan password di URL, `redirect: "error"` agar permintaan tidak dialihkan ke alamat lain, dan batas waktu. Karena ini aplikasi pribadi, alamat privat seperti `localhost` boleh dipakai, **asalkan halaman pengaturan berada di belakang gerbang password** (Bagian I, bagian 7). Tanpa gerbang itu, endpoint ini bisa dipakai orang lain untuk memanggil alamat internal dari servermu.
- **Batasi laju** endpoint `/api/models` dan `/api/models/test` (misalnya 10 per menit), karena tombol "Tes Koneksi" memicu panggilan berbayar.

## 32. Integrasi ke Chat dan Telegram

**Chat web:**

- Request chat memakai `baseUrl`, `apiKey`, dan `model` dari konfigurasi, dengan model percakapan didahulukan.
- Tampilkan model yang dipakai di bawah tiap jawaban (kolom `Message.model` sudah ada).
- Jika upstream membalas `MODEL_INVALID`, tampilkan pesan "Model tidak tersedia di gateway" dengan tombol **Pilih model lain**, bukan error mentah.
- Beberapa gateway tidak mengirim `usage` pada streaming. Simpan token sebagai kosong dan jangan membuat hitungan anggaran error.

**Telegram:**

- `/model` menampilkan model aktif dan 8 model favorit atau terakhir dipakai sebagai tombol inline.
- `/model <kata>` mencari di cache dan menampilkan hasil sebagai tombol.
- `callback_data` Telegram dibatasi 64 byte, sedangkan ID model bisa panjang. Simpan pemetaan indeks pendek ke ID model di cache (contoh `m:12`), bukan ID lengkap di tombol.

## 33. Kriteria Selesai dan Daftar Uji

**Kriteria selesai:**

- [ ] Chip "Model Populer" yang ditulis manual sudah dihapus. Daftar model hanya berasal dari endpoint `/models`, kecuali gateway tidak menyediakannya, dan dalam kasus itu ditandai jelas sebagai "daftar bawaan, belum diverifikasi".
- [ ] Jumlah model di UI sama dengan jumlah di `curl /v1/models` pada gateway yang sama.
- [ ] Mengganti provider mengosongkan model terpilih dan daftar lama.
- [ ] Tes Koneksi mengirim pesan nyata ke model terpilih, bukan hanya mengecek URL.
- [ ] Setiap jenis error punya pesan sendiri.
- [ ] Model bisa diganti per percakapan dari kolom chat.
- [ ] API key tidak pernah muncul di respons API ke browser.

**Skenario uji manual:**

| Skenario | Hasil yang diharapkan |
|---|---|
| URL benar, key benar | Daftar model muncul, tes berhasil dengan latensi |
| Key salah | Pesan "API key ditolak" |
| URL salah (tanpa `/v1`) | Pesan "Respons bukan JSON" atau "Tidak ditemukan" |
| Host tidak ada | Pesan "Tidak bisa terhubung" |
| ID model diketik salah | Tes gagal dengan "Model tidak tersedia" |
| Ganti dari 9Router ke OpenRouter | Model dan daftar dikosongkan, muat ulang otomatis |
| Gateway mati saat chat | Pesan error ramah, aplikasi tidak crash |
| Model baru ditambah di dashboard 9Router | Muncul setelah klik "Muat ulang" |

## 34. Preset Provider

Isi Base URL otomatis saat preset dipilih. Pengguna tetap bisa mengubahnya.

| Preset | Base URL | Catatan |
|---|---|---|
| 9Router | `https://api.9router.com/v1` (sesuai yang ada di aplikasimu) atau `http://localhost:20128/v1` untuk instalasi lokal | Key berasal dari dashboard 9Router |
| OpenRouter | `https://openrouter.ai/api/v1` | Daftar model besar, ada penanda `:free` |
| OpenAI Direct | `https://api.openai.com/v1` | Filter model non-chat |
| DeepSeek Direct | `https://api.deepseek.com` | Normalizer menangani akhiran `/v1` |
| Groq | `https://api.groq.com/openai/v1` | Daftar model termasuk model audio, perlu difilter |
| Custom | diisi manual | Cocok untuk Ollama atau LM Studio lokal |

Cek ulang Base URL tiap provider pada dokumentasi resmi masing-masing sebelum dikunci di kode, karena bisa berubah.

## 35. Prompt untuk Antigravity (Bagian III)

```markdown
Baca PLAN.md Bagian III (bagian 25 sampai 35). Perbaiki fitur pemilihan model
pada proyek yang sudah ada. Jangan mengubah fitur lain.

Masalah: daftar "Model Populer" di halaman pengaturan ditulis manual dan tidak
cocok dengan model di gateway (9Router). Tes Koneksi tidak membuktikan model
bisa dipakai.

Kerjakan:
1. Buat src/lib/ai/models.ts persis sesuai bagian 29.1 (fetchModels, testModel,
   normalizeBaseUrl, UpstreamError). Sesuaikan impor dengan struktur proyek.
2. Buat route POST /api/models dan POST /api/models/test (bagian 29.2).
   Pemanggilan ke gateway hanya dari server. Respons tidak boleh memuat API key.
3. Tambahkan model ProviderConfig, ModelCache, FavoriteModel, dan kolom
   Conversation.model (bagian 30), lalu migrasi tanpa menghapus data.
4. Enkripsi API key dengan AES-256-GCM memakai APP_SECRET (bagian 31).
5. Ganti chip model manual dan kolom teks bebas di halaman pengaturan dengan
   komponen ModelPicker (bagian 29.3): muat otomatis setelah URL dan key terisi
   (debounce 800 ms), tombol Muat ulang, pencarian, grup, dan opsi ID kustom.
6. Ubah Tes Koneksi agar memanggil /api/models/test dan menampilkan latensi,
   potongan balasan, dan pesan error spesifik.
7. Tambahkan chip model aktif di kolom input chat yang membuka ModelPicker dan
   menyimpan pilihan ke Conversation.model.
8. Ganti preset provider mengosongkan model terpilih.

Setelah selesai, jalankan skenario uji di bagian 33 dan laporkan hasilnya.
Jika ada yang gagal, jelaskan penyebabnya, jangan menyembunyikan error.
```

Jika hasil dari agen masih tidak sesuai, jalankan `curl` dari bagian 27 dan tempel dua hal ke percakapan: hasil `curl` dan isi respons dari `/api/models`. Dengan dua data itu, penyebabnya (URL, key, atau parsing) biasanya langsung terlihat.
