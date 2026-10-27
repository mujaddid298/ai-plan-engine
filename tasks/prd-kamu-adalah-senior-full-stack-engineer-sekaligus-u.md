# PRD: MLTrack

## 1. Introduction / Overview
MLTrack dashboard pelacak pembelajaran mandiri Machine Learning dan Deep Learning berbasis web murni client-side. Produk selesaikan masalah hilangnya arah dan motivasi pembelajar mandiri via jalur belajar terstruktur, konten markdown/LaTeX, quiz interaktif, dan visualisasi heatmap kontribusi harian ala GitHub tanpa backend database (rujuk Brief).

## 2. Goals
* 90% pengguna menyelesaikan penelusuran modul dan log durasi belajar harian dalam waktu < 15 detik per sesi.
* FCP (First Contentful Paint) < 1.5 detik pada koneksi internet 4G standar (10 Mbps, RTT 100ms) di 95% pengujian.
* 0% data hilang akibat crash aplikasi lokal selama kuota storage tersisa > 500 KB.
* 100% materi statis (markdown, LaTeX, quiz) dirender tanpa error parsial di browser major (Chrome, Firefox, Safari, Edge versi 2 tahun terakhir).

## 3. User Stories

### US-001: Visualisasi Modul & Jalur Belajar
**Description:** As a Pembelajar ML, I want melihat jalur belajar terstruktur dan status penyelesaian modul so that saya paham posisi dan alur pembelajaran saya.

**Acceptance Criteria:**
- [ ] Given pengguna membuka halaman utama, When data lokal dimuat, Then sistem menampilkan daftar modul (Track -> Topic -> Lesson) beserta status progress (Belum Mulai, Selesai) dalam bentuk daftar dan progress bar persentase (0-100%).
- [ ] Given file seed data materi rusak atau format JSON invalid, When aplikasi memuat halaman, Then sistem menampilkan pesan error fallback "Gagal memuat struktur materi" dan menyediakan tombol "Reset Data Lokal".
- [ ] Typecheck/lint `tsc --noEmit` dan `eslint` lulus tanpa error.
- [ ] Diverifikasi via browser manual test: visual rendering daftar modul sesuai hierarchy tree.

### US-002: Membaca Materi Markdown & LaTeX
**Description:** As a Pembelajar ML, I want membaca materi berbasis Markdown dengan sintaks formula matematika LaTeX so that saya paham teori matematis Machine Learning.

**Acceptance Criteria:**
- [ ] Given pengguna memilih satu *Lesson*, When halaman materi terbuka, Then sistem merender Markdown, LaTeX formula ($...$ dan $$...$$), serta syntax highlighting kode Python dalam waktu < 300ms.
- [ ] Given materi mengandung LaTeX invalid, When parser berjalan, Then sistem menampilkan raw string formula dengan indikator warna merah tanpa membuat UI crash (*error boundary* ditangkap).
- [ ] Typecheck/lint `tsc --noEmit` dan `eslint` lulus tanpa error.
- [ ] Diverifikasi via browser manual test: LaTeX $\sum_{i=1}^n x_i$ dirender menjadi simbol matematika presisi.

### US-003: Pencatatan Log Aktivitas & Durasi Belajar
**Description:** As a Pembelajar ML, I want menandai materi selesai dan mencatat durasi belajar harian so that ritme belajar saya terekam di dashboard.

**Acceptance Criteria:**
- [ ] Given pengguna di halaman *Lesson*, When pengguna mencentang "Tandai Selesai" dan memasukkan durasi belajar (misal: 45 menit), Then data tersimpan ke `localStorage` key `mltrack_v1_activity` dan heatmap kontribusi harian diperbarui secara real-time.
- [ ] Given pengguna memasukkan durasi negatif (< 0) atau non-angka (string/empty), When tombol simpan diklik, Then sistem menampilkan pesan validasi "Durasi harus berupa angka bulat positif 1-1440 menit" dan membatalkan simpan.
- [ ] Typecheck/lint `tsc --noEmit` dan `eslint` lulus tanpa error.
- [ ] Diverifikasi via browser manual test: kotak heatmap berubah warna sesuai intensitas durasi harian yang diinput.

### US-004: Quiz Interaktif Evaluasi Pemahaman
**Description:** As a Pembelajar ML, I want mengerjakan quiz di akhir materi so that saya bisa menguji pemahaman materi yang baru dipelajari.

**Acceptance Criteria:**
- [ ] Given pengguna membuka tab Quiz pada materi, When memilih jawaban dan menekan "Kirim Jawaban", Then sistem memberikan skor instant (0-100%), menunjukkan jawaban benar/salah, dan menyimpan riwayat kuis ke `localStorage`.
- [ ] Given pengguna belum memilih semua jawaban wajib, When tombol "Kirim Jawaban" diklik, Then sistem menonaktifkan tombol submit dan memberikan indikator visual pada nomor soal yang belum terisi.
- [ ] Typecheck/lint `tsc --noEmit` dan `eslint` lulus tanpa error.
- [ ] Diverifikasi via browser manual test: riwayat skor kuis muncul di ringkasan progress modul.

### US-005: Penanganan Kuota Storage Penuh (Jalur Gagal Data)
**Description:** As a Pengguna, I want mendapatkan peringatan saat kuota penyimpanan lokal hampir/sudah habis so that saya tidak kehilangan data progress yang baru diisi.

**Acceptance Criteria:**
- [ ] Given `localStorage` browser melempar exception `QuotaExceededError`, When pengguna mencoba menyimpan progress/log, Then sistem melempar modal peringatan "Penyimpanan Browser Penuh" dan menyediakan opsi "Ekspor Data (JSON)" serta "Bersihkan Log Lama".
- [ ] Given kuota penuh, When operasi simpan gagal, Then state UI tidak berubah seolah-olah berhasil (mencegah data *desynchronization*).
- [ ] Typecheck/lint `tsc --noEmit` dan `eslint` lulus tanpa error.
- [ ] Diverifikasi via browser manual test dengan mock `localStorage.setItem` melempar `DOMException`.

## 4. Functional Requirements

| ID | Kebutuhan (diawali "Sistem harus ...") | Prioritas | US Terkait |
|---|---|---|---|
| FR-001 | Sistem harus menampilkan daftar modul terstruktur (Track, Topic, Lesson) dari seed data lokal. | Must | US-001 |
| FR-002 | Sistem harus menghitung dan menampilkan persentase progress penyelesaian per modul dan total keseluruhan. | Must | US-001 |
| FR-003 | Sistem harus merender konten Markdown, formula LaTeX, dan blok kode dengan syntax highlighting Python. | Must | US-002 |
| FR-004 | Sistem harus menyediakan formulir input manual durasi belajar (dalam menit) dan checklist status penyelesaian *Lesson*. | Must | US-003 |
| FR-005 | Sistem harus menyajikan visualisasi heatmap kontribusi harian menggunakan Recharts berdasarkan log durasi belajar. | Must | US-003 |
| FR-006 | Sistem harus menyajikan kuis pilihan ganda interaktif, menghitung skor otomatis, dan menampilkan kunci jawaban. | Must | US-004 |
| FR-007 | Sistem harus menyimpan seluruh state progress, riwayat quiz, dan log aktivitas ke `localStorage` browser. | Must | US-001, US-003, US-004, US-005 |
| FR-008 | Sistem harus menyediakan fitur Ekspor dan Impor data progress pengguna dalam format file `.json`. | Should | US-005 |
| FR-009 | Sistem harus menyediakan fitur "Reset Progress" untuk mengembalikan data ke kondisi awal setelah konfirmasi pengguna. | Should | US-001 |

*Rasio Prioritas Must: 7/9 = 77.7% (Berdasarkan batasan MVP murni client-side).*

## 5. Non-Functional Requirements

| ID | Kategori | Target Terukur | Cara Verifikasi |
|---|---|---|---|
| NFR-001 | Performa | First Contentful Paint (FCP) < 1.5 detik pada koneksi 4G Fast (Throttled Chrome DevTools) | Lighthouse Audit CI / Browser DevTools |
| NFR-002 | Performa | Render waktu perpindahan halaman materi & parser LaTeX < 300 ms | Performance API (`performance.measure`) |
| NFR-003 | Keamanan | Content Security Policy (CSP) memblokir `unsafe-eval` dan eksekusi skrip pihak ketiga yang tidak terdaftar | Header/Meta CSP Check via HTML Validator |
| NFR-004 | Ketersediaan | 100% Client-side Uptime (Aplikasi dapat diakses penuh secara offline setelah initial load via Service Worker/Static Hosting) | Pengujian offline mode via Chrome DevTools |
| NFR-005 | Biaya | $0/bulan biaya infrastruktur backend (Static Site Hosting: Vercel/Netlify/GitHub Pages tier gratis) | Tagihan/Laporan dashboard hosting |
| NFR-006 | Aksesibilitas| Kontras warna UI minimal ratio 4.5:1 untuk teks normal (WCAG 2.1 AA) dan navigasi keyboard penuh | Axe DevTools audit / Lighthouse Accessibility score >= 90 |

## 6. Non-Goals (Out of Scope)
* Sistem autentikasi akun pengguna (login/register) dan sinkronisasi data cloud terpusat. (Rujuk `diLuarCakupan` Brief)
* Lingkungan eksekusi kode terisolasi (Jupyter Notebook / Python WASM runner) di dalam browser. (Rujuk `diLuarCakupan` Brief)
* Fitur jejaring sosial, leaderboard publik, forum diskusi, atau statistik perbandingan antar pengguna. (Rujuk `diLuarCakupan` Brief)

## 7. Design Considerations
* **Antarmuka (UI):** Menggunakan pola GitHub Profile Contribution Grid (Heatmap 52 minggu / log harian) dan Shadcn UI components.
* **Layout Utama:** Two-column layout (Sidebar kiri: Tree Navigation Track/Topic/Lesson; Main panel kanan: Content Viewer / Quiz / Visualisasi Heatmap).
* **Tema Warna Visual:** Mengikuti standar token Shadcn UI / Tailwind CSS neutral palette (Fallback resmi jika theme setup `cedar-ledger` tidak tersedia).
* **Aksesibilitas & Input:** Seluruh elemen interaktif (Checklist, Quiz option, Form input durasi) wajib memiliki `aria-label`, visible focus indicator (`ring-2`), dan dapat dijangkau via navigasi keyboard (`Tab`, `Space`, `Enter`).

## 8. Technical Considerations
* **Arsitektur Client-Side Only:** Tidak ada REST/GraphQL API external backend. Data dimuat dari static JSON files (seed data) yang dibundel saat build time.
* **Manajemen State & Storage:** State aplikasi dikelola via React State/Context, dipersistensikan ke `localStorage` dengan key namespace berversi (`mltrack_v1_data`).
* **Dependensi Eksternal:** 
  * Recharts (visualisasi heatmap & statistik progress).
  * KaTeX / MathJax ringan (rendering LaTeX).
  * Markdown Parser (react-markdown / remark-math / rehype-katex).
* **Konsekuensi Kegagalan Dependensi:**
  * Jika library LaTeX gagal dimuat: Fallback merender plain text math string tanpa membuat DOM React crash.
  * Jika `localStorage` diblokir (e.g., Private Browsing strict mode): Sistem beroperasi dalam mode In-Memory State dengan banner peringatan "Data tidak akan tersimpan setelah tab ditutup".

## 9. Success Metrics
* **Tingkat Retensi Penggunaan Lokal:** >= 60% pengguna aktif lokal membuka aplikasi dan mencatat aktivitas minimal 3 kali dalam 7 hari pertama (diukur via log tanggal `localStorage` lokal).
* **Tingkat Penyelesaian Quiz:** Rata-rata completion rate quiz per lesson >= 75% dari total pengguna yang membuka lesson tersebut (diukur via agregasi status quiz lokal).
* **Error Rate Rendering Client-side:** 0% crash UI (*Uncaught Exception*) saat memuat LaTeX dan Markdown di 100 sampel materi (diukur via React Error Boundary logging / automated end-to-end test).

## 10. Asumsi dan Open Questions

### Asumsi
* **A-01:** Kapasitas kuota localStorage browser (sekitar 5MB) mencukupi untuk menyimpan data progress, catatan personal, dan riwayat quiz. (Dampak jika salah: Data terpotong/gagal simpan; Mitigasi: US-005 & FR-008 ekspor JSON).
* **A-02:** Pengguna mencatat dan memperbarui status pelajaran serta log durasi secara manual. (Dampak jika salah: Visualisasi heatmap tidak akurat).
* **A-03:** Seed data materi statis dalam repositori mencukupi untuk MVP. (Dampak jika salah: Update materi butuh re-deploy aplikasi).
* **A-04:** Rendering markdown/LaTeX di client-side tidak lag di HP low-end. (Dampak jika salah: UI patah-patah saat scrolling materi panjang).
* **A-05:** Perintah CLI style fallback ke standard Tailwind CSS jika package `cedar-ledger` tidak ada. (Dampak jika salah: Tampilan visual divergen dari spesifikasi).
* **A-06 (Asumsi Baru):** Struktur JSON Track/Topic/Lesson bersifat *immutable* pada versi schema `v1`. Jika schema berubah di versi berikutnya, migrasi data dilakukan via skrip *transformer* berbasis versi key pada saat *startup* aplikasi. (Dampak jika salah: Data pengguna lama terbaca *undefined* atau corrupt saat update aplikasi).
* **A-07 (Asumsi Baru):** Latihan coding/proyek mini diselesaikan pengguna di environment lokal mereka sendiri dan diproses via checklist penyelesaian manual tanpa auto-grader. (Dampak jika salah: Pengguna butuh validasi otomatis yang memerlukan infrastruktur backend eksekusi kode).

### Open Questions

| ID | Pertanyaan | Default Sementara | Penanggung Jawab & Target Selesai |
|---|---|---|---|
| OQ-01 | Bagaimana strategi migrasi skema data localStorage agar tidak merusak data pengguna lama ketika struktur data Track atau Lesson diperbarui di masa mendatang? | Gunakan versioning key `mltrack_v1_progress`. Buat fungsi migrasi `migrateStorage(oldData, newVersion)` saat inisialisasi aplikasi. | Lead Architect / Sprint 1 Planning |
| OQ-02 | Apakah latihan coding/proyek mini membutuhkan mekanisme validasi otomatis atau cukup berupa checklist penyelesaian manual? | Cukup checklist manual dan tautan referensi ke jawaban/modul solusi. | Product Manager / Sebelum Release MVP |
| OQ-03 | Bagaimana bentuk fallback token warna dan variabel CSS jika perintah setup style `cedar-ledger` gagal dieksekusi di lingkungan lokal? | Menggunakan variabel warna bawaan Tailwind CSS (`slate` / `zinc` theme palette) yang dikonfigurasi di `tailwind.config.js`. | Frontend Lead / Sprint 1 Day 1 |