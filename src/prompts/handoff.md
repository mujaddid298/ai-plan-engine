Kamu menerima seluruh dokumen perencanaan yang sudah di-review. Tugasmu: ubah **Urutan Implementasi** menjadi daftar tugas `tasks.json` yang bisa dieksekusi langsung oleh AI coding agent, satu tugas per sesi coding.

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

**Laporan Review:**
```json
{{REVIEW}}
```

---

## Tugas

1. Ambil semua tugas T-xxx dari bagian "Urutan Implementasi" di Desain MVC sebagai dasar.
2. Terapkan perbaikan dari Laporan Review yang berdampak pada implementasi (misalnya endpoint tanpa auth, FR tanpa tugas). Tambahkan tugas baru jika ada FR Must atau NFR yang belum tercakup.
3. Pecah tugas yang terlalu besar. Satu tugas harus selesai dalam satu sesi coding (maks. sekitar 4 jam, menyentuh maks. sekitar 5 file).
4. Urutkan berdasarkan dependensi (schema → model/repository → service → endpoint → UI → hardening). Dependensi harus acyclic dan hanya merujuk ID yang ada.
5. Setiap tugas wajib merujuk minimal satu FR-xxx atau NFR-xxx, dan setiap FR Must harus tercakup oleh minimal satu tugas.

## Format Output

**Keluarkan HANYA JSON valid** (array), tanpa teks atau Markdown wrapper:

```json
[
  {
    "id": "T-001",
    "title": "string (kata kerja + objek, singkat)",
    "description": "string (apa yang dibangun, keputusan penting yang harus diikuti, rujuk bagian Blueprint/MVC dan ADR-xxx)",
    "dependsOn": ["T-000"],
    "fr": ["FR-001"],
    "nfr": ["NFR-001"],
    "filesToTouch": ["src/path/file.ts"],
    "acceptanceCriteria": [
      "string (bisa dicek mesin: perintah test, lint, typecheck, atau curl beserta hasil yang diharapkan)"
    ],
    "passes": false
  }
]
```

## Aturan

- `acceptanceCriteria` harus **dapat diverifikasi otomatis** (contoh: "`npm test -- users.service` lulus", "`curl -i -X POST /api/login` dengan kredensial salah mengembalikan 401 dan body `{code: 'INVALID_CREDENTIALS'}`"). Dilarang kriteria subjektif seperti "berfungsi baik".
- Setiap tugas endpoint menyertakan kriteria untuk jalur gagal (400/401/403/404/409 yang relevan).
- `filesToTouch` harus sesuai Struktur Folder di Desain MVC.
- Nama entitas, path, dan istilah harus sama dengan dokumen sebelumnya.
- Semua `passes` bernilai `false`.
- Jangan menulis kode implementasi.
- Dilarang placeholder (TBD, lorem, "akan ditentukan").
- Bahasa: {{BAHASA}}. Istilah teknis boleh bahasa Inggris.
