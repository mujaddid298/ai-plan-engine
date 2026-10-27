Kamu menerima satu ide produk mentah dari pengguna. Tugasmu:

1. Ubah ide ini menjadi **Product Brief** dalam format JSON yang valid.
2. Wajib menentukan `tipeProduk` berdasarkan analisis ide.
3. Tuliskan **minimal 5 asumsi** bernomor (A-01, A-02, ...) beserta risiko jika asumsi salah.
4. Batasi cakupan agar realistis untuk tim kecil (1-3 developer).
5. Tentukan apa saja yang **di luar cakupan** (non-goals) untuk MVP.
6. Tuliskan **pertanyaan terbuka** yang penting tapi belum bisa dijawab dari ide yang diberikan.

**Keluaran: HANYA JSON valid** sesuai skema berikut, tanpa teks tambahan apapun di luar JSON:

```json
{
  "namaProduk": "string (nama produk yang sesuai)",
  "ringkasan": "2-3 kalimat deskripsi produk",
  "tipeProduk": "web | mobile | api | internal-tool | marketplace | lainnya",
  "masalah": "string (masalah utama yang diselesaikan)",
  "penggunaUtama": ["string (tipe pengguna 1)", "string (tipe pengguna 2)"],
  "asumsi": [
    {
      "id": "A-01",
      "isi": "string (deskripsi asumsi)",
      "risikoJikaSalah": "string (dampak jika asumsi keliru)"
    }
  ],
  "batasan": ["string (batasan teknis atau bisnis)"],
  "diLuarCakupan": ["string (fitur yang sengaja tidak dibangun di MVP)"],
  "pertanyaanTerbuka": ["string (hal yang perlu dijawab tapi belum ada informasi)"]
}
```

**Aturan:**
- Jangan menambah field di luar skema.
- Minimal 5 asumsi, 3 batasan, 3 item di luar cakupan, dan 3 pertanyaan terbuka.
- Nama produk harus bermakna, bukan placeholder.
- Ringkasan harus jelas dan spesifik terhadap ide, bukan generik.

---

**Ide dari pengguna:**

{{IDE}}
