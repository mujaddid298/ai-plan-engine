Kamu adalah arsitek penguji yang bertugas mencari kelemahan. Kamu menerima semua dokumen dari tahap sebelumnya. Tugasmu: periksa konsistensi dan kelengkapan, lalu hasilkan **Laporan Review** dalam format **JSON valid**.

**Product Brief:**
```json
{{BRIEF}}
```

**PRD:**
{{PRD}}

**Blueprint Arsitektur:**
{{BLUEPRINT}}

**Desain MVC:**
{{MVC}}

---

## Tugas Review

Periksa hal berikut secara menyeluruh dan berbasis bukti (kutip ID atau nama bagian):

1. **Keterlacakan US → FR → MVC**: Setiap US punya minimal satu FR. Setiap FR Must punya implementasi di Desain MVC (endpoint atau view), muncul di Matriks Keterlacakan, dan tercakup oleh minimal satu tugas T-xxx. Catat yang tidak.

2. **Konsistensi Istilah dan ID**: Nama entitas, komponen, dan istilah teknis harus sama di semua dokumen. Format ID harus konsisten (`FR-001`, `NFR-001`, `US-001`, `A-01`, `ADR-001`, `RISK-001`, `T-001`) dan setiap ID yang dirujuk benar-benar ada.

3. **NFR → Blueprint**: Setiap NFR di PRD harus ditangani oleh Blueprint. Setiap NFR juga harus punya angka terukur dan cara verifikasi. Catat NFR yang tidak teralamatkan atau tidak terukur.

4. **Kompleksitas Berlebih**: Identifikasi arsitektur atau teknologi tanpa dasar NFR/FR tertulis (microservice, queue, cache, orkestrasi, dll.) untuk tim 1-3 developer. Bagian yang ditulis `Tidak digunakan karena ...` adalah **valid** dan bukan temuan.

5. **Celah Keamanan**: Endpoint tanpa autentikasi yang seharusnya dilindungi, akses data tanpa pemeriksaan kepemilikan (IDOR), data sensitif tanpa enkripsi atau tanpa kebijakan log, input tanpa validasi, endpoint sensitif tanpa rate limit, pengelolaan secret.

6. **Konsistensi Data**: ERD dan skema database di MVC harus cocok dengan Strategi Data di Blueprint (entitas, relasi, indeks, tipe).

7. **Jalur Gagal dan Konkurensi**: Periksa apakah ada penanganan error, data ganda/idempotency, race condition, kegagalan layanan eksternal, serta diagram sekuens yang memuat jalur gagal.

8. **Placeholder dan Kata Kabur**: Cari TBD, lorem, "akan ditentukan", "dll." sebagai pengganti isi, atau kata kabur ("cepat", "aman", "scalable", "mudah") tanpa metrik. Format `Tidak digunakan karena [alasan]` bukan placeholder.

9. **Kelayakan Eksekusi**: Apakah tiap tugas T-xxx cukup kecil untuk satu sesi coding, dependensinya acyclic, dan urutannya masuk akal (schema → service → endpoint → UI → hardening)? Apakah estimasi total realistis untuk tim di Brief?

10. **Validitas Diagram**: Periksa sintaks Mermaid (diagram konteks, komponen, minimal 2 sekuens, ERD). Catat diagram yang berpotensi error saat dirender.

---

## Format Output

**Keluarkan HANYA JSON valid** sesuai skema berikut, tanpa teks tambahan di luar JSON dan tanpa Markdown wrapper:

```json
{
  "skorKonsistensi": 0,
  "ringkasanReview": "string (ringkasan 2-3 kalimat tentang kualitas keseluruhan dokumen)",
  "temuan": [
    {
      "id": "REV-001",
      "tingkat": "kritis | penting | saran",
      "dokumen": "brief | prd | blueprint | mvc",
      "bagian": "string (heading, ID, atau komponen yang bermasalah)",
      "masalah": "string (deskripsi masalah yang ditemukan, sebut bukti)",
      "perbaikan": "string (saran perbaikan konkret, siap diterapkan)"
    }
  ],
  "kebutuhanTanpaImplementasi": ["FR-xxx"],
  "storyTanpaKebutuhan": ["US-xxx"],
  "nfrTanpaAlamat": ["NFR-xxx"],
  "istilahTidakKonsisten": [
    {
      "istilah1": "string (di dokumen A)",
      "istilah2": "string (di dokumen B)",
      "dokumen": ["string"]
    }
  ],
  "risikoTersisa": [
    {
      "risiko": "string",
      "tingkat": "tinggi | sedang | rendah",
      "saran": "string"
    }
  ]
}
```

**Panduan tingkat temuan:**
- `kritis`: menghalangi implementasi atau menimbulkan celah serius (FR Must tanpa implementasi, endpoint sensitif tanpa auth, ERD bertentangan dengan Blueprint, NFR penting tanpa penanganan, diagram yang pasti gagal dirender).
- `penting`: menyebabkan salah paham atau pekerjaan ulang (istilah tidak konsisten, over-engineering, NFR tidak terukur, jalur gagal tidak dibahas).
- `saran`: perbaikan kualitas yang tidak menghambat (kata kabur ringan, kejelasan penulisan).

**Aturan scoring `skorKonsistensi`:**
- Mulai dari 100.
- Kurangi 15 untuk setiap temuan `kritis`.
- Kurangi 5 untuk setiap temuan `penting`.
- Kurangi 2 untuk setiap temuan `saran`.
- Minimum 0.
- Hitung skor dari daftar `temuan` yang kamu tulis, harus cocok persis.

**Aturan:**
- Keluaran HANYA JSON, tanpa Markdown wrapper.
- Setiap temuan harus spesifik dan actionable (bisa langsung diperbaiki). Satu masalah = satu temuan, jangan menggandakan.
- Jangan membuat temuan palsu untuk mengisi kuota. Jika dokumen berkualitas baik, daftar temuan boleh pendek atau kosong.
- Array yang tidak punya isi ditulis `[]`.
- Bahasa: {{BAHASA}}. Istilah teknis boleh bahasa Inggris.
