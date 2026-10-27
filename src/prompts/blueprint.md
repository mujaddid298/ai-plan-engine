Kamu menerima **Product Brief** dan **PRD** dari tahap sebelumnya. Tugasmu: tulis **Blueprint Arsitektur** dalam format Markdown mengikuti kerangka di bawah.

**Product Brief:**
```json
{{BRIEF}}
```

**PRD:**
{{PRD}}

---

## Prinsip Utama

1. **Sederhana dulu.** Pilih arsitektur paling sederhana yang memenuhi FR dan NFR di PRD. Default untuk tim 1-3 developer adalah monolith modular dengan satu database. Microservices, message queue, cache terdistribusi, atau infrastruktur tambahan **hanya boleh** dipilih jika ada NFR-xxx terukur yang tidak bisa dipenuhi tanpanya, dan NFR itu harus dirujuk.
2. **Setiap keputusan** memuat alasan, alternatif yang ditolak, dan konsekuensi (positif dan negatif).
3. **Bahas jalur gagal**: kegagalan layanan eksternal, data ganda (idempotency), race condition, timeout, dan pemulihan.
4. Jangan mengulang isi PRD. Rujuk lewat ID (FR-xxx, NFR-xxx, US-xxx, A-xx).

---

## Kerangka Blueprint (heading wajib, urutan wajib)

Semua heading wajib ada. Jika sebuah topik memang tidak diperlukan (misalnya cache), **jangan dikosongkan**: tulis `Tidak digunakan karena [alasan + rujukan NFR/FR/A-xx]` dan sebutkan kondisi kapan akan dipertimbangkan.

### 1. Tujuan dan Konteks Sistem
Satu paragraf tujuan sistem. Sertakan **diagram konteks** (Mermaid `graph TD`) yang menunjukkan sistem, aktor, dan sistem eksternal.

### 2. Driver Arsitektur
Tabel NFR yang paling mempengaruhi arsitektur: `NFR-xxx | Target | Dampak pada keputusan`. Tambahkan FR yang bersifat menentukan (misalnya integrasi pembayaran) bila ada.

### 3. Gaya Arsitektur
Gaya yang dipilih (monolith modular, serverless, dll.) dengan alasan, alternatif yang ditolak, dan konsekuensi.

### 4. Komponen dan Tanggung Jawab
Tabel: `Komponen | Tanggung jawab | Bergantung pada`. Sertakan **diagram komponen** (Mermaid `flowchart LR`). Nama komponen dan entitas di sini akan dipakai apa adanya oleh dokumen Desain MVC.

### 5. Tech Stack
| Lapisan | Pilihan | Alasan | Alternatif Ditolak | Konsekuensi |
|---|---|---|---|---|

Wajib mencakup minimal: runtime/bahasa, framework, database, auth, hosting, dan tooling testing. Hormati stack wajib/dilarang dari Brief.

### 6. Alur Data dan Alur Kritis
Minimal **2 diagram sekuens** (Mermaid `sequenceDiagram`) untuk alur bisnis terpenting (rujuk FR-xxx). Minimal satu diagram wajib memuat **jalur gagal** (misalnya `alt`/`else` untuk error, timeout, atau duplikat). Jelaskan alur data dari input ke output dalam teks singkat.

### 7. Strategi Data
- Penyimpanan dan alasan pemilihan
- Entitas utama (nama harus final dan akan dipakai MVC) dan indeks penting
- Strategi cache (atau `Tidak digunakan karena ...`)
- Migrasi database (tool dan alur rollback)
- Backup dan restore dengan target **RPO dan RTO angka**
- Penanganan konkurensi dan idempotency untuk operasi tulis kritis

### 8. Keamanan
- Autentikasi dan manajemen sesi/token
- Otorisasi (model peran, pemeriksaan kepemilikan data untuk mencegah IDOR)
- Proteksi data (enkripsi in transit/at rest, penyimpanan secret, data pribadi)
- Tabel ancaman: `Ancaman | Dampak | Mitigasi | NFR terkait`. Minimal bahas: injection, XSS/CSRF (jika web), brute force/rate limiting, kebocoran secret, dan dependensi rentan.

### 9. Skalabilitas dan Performa
Titik bottleneck yang diperkirakan, **ambang angka** kapan harus ditangani (contoh: "CPU > 70% selama 15 menit"), dan strategi scaling bertahap. Hubungkan dengan NFR performa.

### 10. Deployment, Environment, CI/CD
Arsitektur deployment, environment (dev/staging/prod atau alasan hanya sebagian), manajemen konfigurasi dan secret, tahapan pipeline CI/CD (lint, test, build, migrasi, deploy), dan strategi rollback.

### 11. Observabilitas
Strategi logging (format, level, larangan mencatat data sensitif), metrik utama, dan alerting dengan **ambang angka dan penerima** alert.

### 12. Estimasi Biaya
Tabel per bulan: `Komponen | Asumsi penggunaan | Biaya per bulan (USD) | Pendorong biaya`. Tulis total dan rentang (rendah/tinggi). Rujuk NFR biaya dan asumsi beban dari PRD.

### 13. Catatan Keputusan (ADR)
**Minimal 3 ADR**, ID `ADR-001`, `ADR-002`, dst. Format setiap ADR:
- **Konteks:** Mengapa keputusan perlu diambil (rujuk FR/NFR).
- **Keputusan:** Apa yang dipilih.
- **Alternatif:** Apa yang ditolak dan mengapa.
- **Konsekuensi:** Dampak positif dan negatif.

### 14. Risiko Teknis dan Mitigasi
Tabel: `ID (RISK-001..) | Risiko | Dampak | Tingkat (tinggi/sedang/rendah) | Mitigasi | Pemicu pemantauan`.

---

## Aturan

- Semua heading wajib ada dan berisi. Pengecualian hanya format `Tidak digunakan karena [alasan + rujukan ID]`.
- Minimal: 3 ADR, 2 diagram sekuens, 1 diagram konteks, 1 diagram komponen.
- **Mermaid harus valid:** beri tanda kutip pada label yang mengandung spasi, kurung, atau tanda baca (`A["Label (detail)"]`), jangan memakai karakter `;` atau `"` di dalam label, ID node tanpa spasi, dan setiap `alt`/`loop`/`opt` ditutup dengan `end`.
- Setiap NFR di PRD harus teralamatkan di salah satu bagian Blueprint (tampilkan di bagian 2, 8, 9, 10, 11, atau 12).
- Rujuk NFR dan FR dengan ID 3 digit (`NFR-001`, `FR-001`).
- Dilarang placeholder (TBD, lorem, "akan ditentukan").
- Bahasa: {{BAHASA}}. Istilah teknis boleh bahasa Inggris.
- Keluarkan hanya dokumen Blueprint, tanpa kata pengantar.
