Kamu menerima **Product Brief**, **PRD**, dan **Blueprint Arsitektur** dari tahap sebelumnya. Tugasmu: tulis **Desain Implementasi MVC (Model-View-Controller)** lengkap dalam format Markdown mengikuti kerangka di bawah.

**Product Brief:**
```json
{{BRIEF}}
```

**PRD:**
{{PRD}}

**Blueprint Arsitektur:**
{{BLUEPRINT}}

---

## Prinsip Utama

- Dokumen ini adalah jembatan ke kode. Developer junior atau AI coding agent harus bisa mengerjakan tiap tugas tanpa menebak.
- Ikuti Blueprint: nama entitas, komponen, tech stack, dan strategi data harus **sama persis**. Jangan memperkenalkan teknologi baru yang tidak ada di Blueprint.
- Jika tipe produk di Brief bukan web (misalnya API-only), tulis bagian View sebagai `Tidak digunakan karena produk API-only (rujuk Brief)` dan gantikan dengan **kontrak respons** (contoh payload sukses/error per endpoint).
- Jika sebuah bagian memang tidak diperlukan, **jangan dikosongkan**: tulis `Tidak digunakan karena [alasan + rujukan ID]`.
- Rujuk lewat ID (US-xxx, FR-xxx, NFR-xxx, ADR-xxx). Jangan menyalin ulang isi PRD atau Blueprint.

---

## Kerangka Desain MVC (heading wajib, urutan wajib)

### 1. Model (Entitas Data)
Untuk setiap entitas:
- Nama entitas (sama dengan Blueprint)
- Tabel field: nama, tipe data, constraint (PK, FK, NOT NULL, UNIQUE, DEFAULT, CHECK)
- Indeks yang diperlukan beserta alasannya (query mana yang dilayani)
- Relasi dengan entitas lain (kardinalitas dan perilaku ON DELETE)
- Aturan bisnis dan invariant (contoh: "stok tidak boleh negatif")

Sertakan **ERD** (Mermaid `erDiagram`) yang memuat semua entitas dan relasi. ERD harus cocok dengan Strategi Data di Blueprint.

### 2. Controller (Endpoint API)
| Method | Path | Controller#Action | Auth (publik / login / peran) | Validasi Input | Respons Sukses | Respons Error | FR |
|---|---|---|---|---|---|---|---|

Aturan:
- Setiap endpoint menunjuk ke minimal satu FR-xxx.
- Endpoint selain login/registrasi/health check **wajib** memiliki Auth, dan endpoint yang mengakses data milik pengguna harus menyebut **pemeriksaan kepemilikan** (pencegahan IDOR).
- Endpoint yang menulis data kritis menyebut mekanisme **idempotency** atau penanganan duplikat bila relevan.
- Kolom Respons Error mencantumkan minimal 400/401/403/404/409/422 yang relevan, bukan hanya "error".

### 3. View (Halaman dan Komponen)
Untuk setiap halaman:
- Nama halaman dan rute
- Data yang dibutuhkan (endpoint sumber)
- State: kosong, loading, error, sukses (jelaskan tampilan masing-masing)
- Komponen reusable yang dipakai
- US terkait

Sertakan daftar komponen reusable beserta props utamanya.

### 4. Service Layer
Tabel atau daftar service dan logika bisnis yang **tidak boleh ada di controller**:
- Nama service
- Tanggung jawab
- Method utama (signature: input → output, error yang dilempar)
- Dependency (repository, layanan eksternal)
- Penanganan transaksi database dan konkurensi bila relevan

### 5. Validasi dan Penanganan Error
- Konvensi format error response JSON (contoh struktur lengkap dengan `code`, `message`, `details`, `requestId`)
- Kode status HTTP yang dipakai dan kapan
- Strategi validasi input (library, lokasi validasi: boundary controller, bukan tersebar)
- Penanganan error tak terduga (500 tidak membocorkan stack trace) dan kegagalan layanan eksternal (timeout, retry, fallback)
- Rate limiting pada endpoint sensitif (angka batas, rujuk NFR)

### 6. Struktur Folder
Pohon direktori proyek lengkap (format tree), termasuk folder test dan konfigurasi. Beri komentar singkat per folder penting.

```
project/
├─ src/
│  ├─ ...
```

### 7. Skema Database
SQL atau ORM schema (Prisma/Drizzle, sesuai Blueprint) **siap salin**:
- CREATE TABLE atau definisi schema lengkap dengan constraint
- Indeks
- Seed data minimum untuk development dan test

### 8. Matriks Keterlacakan
| FR-ID | Prioritas | US | Model | Endpoint (Controller#Action) | View | NFR Terkait |
|---|---|---|---|---|---|---|

**Setiap FR Must wajib muncul**, dan FR Should/Could sebaiknya juga ada. Setiap FR Must harus punya minimal satu endpoint atau view.

### 9. Urutan Implementasi
| ID | Tugas | Dependensi | FR | Estimasi (jam) |
|---|---|---|---|---|
| T-001 | ... | - | FR-001 | 2 |

Aturan:
- Urutan: setup proyek → schema/migrasi → model/repository → service → endpoint → UI → hardening (keamanan, error handling, observabilitas) → test akhir.
- Tiap tugas cukup kecil untuk **satu prompt coding** (maks. sekitar 4 jam).
- Dependensi harus acyclic dan merujuk ID T-xxx yang ada.
- Setiap FR Must tercakup oleh minimal satu tugas. Tugas non-fungsional (setup, CI, hardening) merujuk NFR-xxx pada kolom FR (tulis `NFR-xxx`).

---

## Aturan

- Semua heading wajib ada dan berisi. Pengecualian hanya format `Tidak digunakan karena [alasan + rujukan ID]`.
- Nama entitas sama dengan Blueprint.
- ERD Mermaid harus **valid**: beri tipe dan nama atribut tanpa spasi, relasi memakai notasi yang benar (`||--o{`), dan tidak ada atribut tanpa tipe.
- Dilarang placeholder (TBD, lorem, "akan ditentukan").
- Jangan menulis kode aplikasi selain DDL/schema dan contoh payload.
- Bahasa: {{BAHASA}}. Istilah teknis boleh bahasa Inggris.
- Keluarkan hanya dokumen Desain MVC, tanpa kata pengantar.
