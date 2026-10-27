# PRD: GudangHub

## 1. Introduction / Overview
GudangHub sistem B2B SaaS manajemen inventaris multi-gudang berbasis PWA/Web. Mengatasi masalah inakurasi stok dan *overselling* di Shopee dan Tokopedia serta alokasi order manual yang lambat bagi UMKM (rujuk Brief). Sistem menyediakan pemindaian barcode kamera smartphone, sinkronisasi stok otomatis, alokasi order multi-gudang, dan notifikasi stok kritis via WhatsApp.

## 2. Goals
* **G-001**: Mengurangi tingkat *overselling* di Shopee dan Tokopedia hingga 0% dalam 30 hari pertama setelah rilis.
* **G-002**: Pengguna menyelesaikan alokasi order otomatis < 3 detik per pesanan pada 99% transaksi.
* **G-003**: Operator gudang menyelesaikan pemindaian 1 barcode SKU via PWA < 2 detik pada 95% percobaaan.
* **G-004**: Sinkronisasi perubahan stok ke Shopee dan Tokopedia selesai < 5 detik untuk 98% kejadian update stok.
* **G-005**: Pengguna baru menyelesaikan proses pendaftaran tenant dan pendaftaran 1 gudang pertama < 5 menit pada 90% percobaan.

## 3. User Stories

### US-001: Pemindaian Barcode SKU via Kamera PWA
**Description:** As a Staf Gudang, I want memindai barcode fisik SKU menggunakan kamera HP di web/PWA so that proses masuk/keluar barang cepat tanpa alat pemindai fisik tambahan.

**Acceptance Criteria:**
- [ ] Given operator muka halaman scan PWA, When kamera diarahkan ke barcode standar (EAN-13/QR), Then sistem berhasil membaca string barcode < 2 detik dan menampilkan detail produk.
- [ ] Given kamera tidak mendapat izin browser (permission denied), When halaman scan dibuka, Then sistem menampilkan pesan error explicit "Akses kamera ditolak. Berikan izin di pengaturan browser" dan opsi input manual SKU.
- [ ] Typecheck/lint/test unit pemroses kode barcode lulus tanpa error.
- [ ] Diverifikasi di browser Chrome Android dan Safari iOS.

### US-002: Sinkronisasi Stok Real-Time ke Marketplace
**Description:** As a Pemilik UMKM, I want perubahan stok di gudang otomatis memperbarui kuantitas produk di Shopee dan Tokopedia so that tidak terjadi *overselling*.

**Acceptance Criteria:**
- [ ] Given jumlah stok SKU X berubah di gudang A dari 10 menjadi 5, When sistem mencatat perubahan tersebut, Then sistem mengirim request update stok ke API Shopee dan Tokopedia dalam kurun waktu < 5 detik.
- [ ] Given API Shopee/Tokopedia mengembalikan error 5xx atau timeout, When sinkronisasi gagal, Then sistem mencatat log kegagalan dan melakukan retrying otomatis dengan mekanisme *exponential backoff* maksimum 3 kali retries.
- [ ] Typecheck/lint/test integrasi adapter marketplace lulus.

### US-003: Alokasi Order Otomatis Multi-Gudang
**Description:** As a Pemilik UMKM, I want order masuk dari marketplace dialokasikan otomatis ke gudang terdekat yang memiliki stok so that alokasi tidak perlu dilakukan manual.

**Acceptance Criteria:**
- [ ] Given pesanan masuk dari Shopee untuk SKU Y kuantitas 2, When Gudang A memiliki stok 0 dan Gudang B memiliki stok 5, Then sistem mengalokasikan pesanan ke Gudang B dan mengurangi stok Gudang B sebanyak 2.
- [ ] Given seluruh gudang tidak memiliki stok yang cukup untuk memenuhi order (stok total < kuantitas pesanan), Then sistem menandai order dengan status "Pending Stock" dan mengirim notifikasi kegagalan alokasi ke dashboard.
- [ ] Typecheck/lint/test logika alokasi order lulus.

### US-004: Peringatan Stok Kritis via WhatsApp
**Description:** As a Pemilik UMKM, I want menerima pesan WhatsApp otomatis saat stok SKU mencapai ambang batas minimum so that re-stock barang dilakukan tepat waktu.

**Acceptance Criteria:**
- [ ] Given ambang batas minimum SKU Z diatur ke angka 5, When stok SKU Z berkurang menjadi 4 akibat transaksi, Then sistem memicu pengiriman pesan WhatsApp ke nomor terdaftar dalam waktu < 10 detik dengan format: `[GudangHub Alert] Stok SKU Z tersisa 4 di Gudang A. Segera lakukan restock.`.
- [ ] Given nomor WhatsApp tidak valid atau gateway WhatsApp *down*, When pengiriman gagal, Then sistem mencatat error pada sistem log dan menandai notifikasi sebagai "Failed-Retrying" tanpa menghentikan proses kurangi stok.
- [ ] Typecheck/lint/test modul pengirim notifikasi lulus.

### US-005: Penanganan Transaksi Konkuren (Stok Terakhir)
**Description:** As a Sistem, I want mengunci (*lock*) data stok saat dua pesanan masuk bersamaan untuk stok tersisa 1 so that tidak terjadi alokasi ganda (*overselling*).

**Acceptance Criteria:**
- [ ] Given SKU W tersisa 1 unit di Gudang A, When dua transaksi (Shopee dan Tokopedia) masuk bersamaan pada milidetik yang sama, Then hanya 1 transaksi yang berhasil mengalokasikan stok, dan transaksi ke-2 ditandai "Pending Stock / Out of Stock".
- [ ] Given kondisi balapan (*race condition*) terjadi, Then jumlah stok SKU W di database tidak boleh bernilai negatif (< 0).
- [ ] Typecheck/lint/test tingkat konkurensi (concurrency test) lulus.

## 4. Functional Requirements

| ID | Kebutuhan | Prioritas | US Terkait |
|---|---|---|---|
| FR-001 | Sistem harus menyediakan UI PWA untuk memindai barcode EAN/UPC/QR via kamera smartphone. | Must | US-001 |
| FR-002 | Sistem harus menyediakan fitur input SKU manual jika kamera tidak dapat digunakan. | Must | US-001 |
| FR-003 | Sistem harus memperbarui stok di Shopee dan Tokopedia via webhook/API secara otomatis saat ada perubahan stok gudang. | Must | US-002 |
| FR-004 | Sistem harus melakukan *retry* maksimum 3 kali dengan *exponential backoff* jika panggilan API marketplace gagal. | Should | US-002 |
| FR-005 | Sistem harus mengalokasikan order dari marketplace ke gudang secara otomatis berdasarkan ketersediaan stok produk. | Must | US-003 |
| FR-006 | Sistem harus mengunci row data stok (*atomic update/pessimistic lock*) saat memproses pemotongan stok konkuren. | Must | US-005 |
| FR-007 | Sistem harus mengirimkan notifikasi WhatsApp ke pengguna ketika stok suatu SKU berada di bawah nilai ambang batas minimum (*minimum threshold*). | Should | US-004 |
| FR-008 | Sistem harus mencatat seluruh riwayat perubahan stok (*audit log*) beserta ID pengguna atau ID transaksi trigger. | Should | US-002, US-003 |

*Rasio Must = 4 / 8 = 50% (Sesuai aturan < 70%).*

## 5. Non-Functional Requirements

| ID | Kategori | Target Terukur | Cara Verifikasi |
|---|---|---|---|
| NFR-001 | Performa | p95 latensi endpoint baca/tulis stok < 200 ms pada 100 pengguna konkuren (asumsi A-06). | Load test menggunakan `k6` |
| NFR-002 | Keamanan | Seluruh komunikasi data wajib HTTPS (TLS 1.3), enkripsi token API marketplace di database menggunakan AES-256-GCM. | Security Audit / Penetration Test & Code Review |
| NFR-003 | Ketersediaan | Uptime API dan Dashboard minimal 99.5% dalam sebulan (downtime maks. 3 jam 39 menit / bulan). | Monitoring uptime (UptimeRobot / Prometheus) |
| NFR-004 | Biaya | Biaya infrastruktur MVP < Rp 1.500.000 / bulan untuk melayani hingga 20 tenant aktif. | Laporan tagihan *cloud provider* bulanan |
| NFR-005 | Privasi Data | Seluruh data nomor HP merchant dan customer marketplace dienkripsi saat diam (*at rest*), sesuai regulasi UU PDP Indonesia. | Audit skema database dan pengecekan enkripsi kolom |

## 6. Non-Goals (Out of Scope)
* Tidak mendukung integrasi ke marketplace TikTok Shop, Lazada, WooCommerce, Blibli, atau platform e-commerce lain di luar Shopee dan Tokopedia (rujuk Brief).
* Tidak menyediakan fitur pencetakan resi pengiriman massal dan integrasi API logistik (JNE, J&T, SiCepat, dll.) (rujuk Brief).
* Tidak menyediakan fitur peramalan stok berbasis AI (*AI demand forecasting*) dan modul manajemen keuangan/akuntansi (rujuk Brief).
* Tidak menyediakan aplikasi native Android/iOS (APK/IPA); aplikasi hanya disajikan dalam bentuk Web PWA.

## 7. Design Considerations
* **UI/UX PWA Mobile-First**: Layout difokuskan untuk layar smartphone staf gudang (viewports 360px - 414px) dan desktop admin untuk UMKM.
* **Scanner Component**: Area pemindaian kamera memiliki *viewfinder overlay* yang jelas dengan indikator audio/vibrasi saat barcode berhasil terbaca.
* **Aksesibilitas & Kontras**: Kontras warna komponen utama minimal rasio 4.5:1 (WCAG AA). Ukuran tombol minimum 48x48 px untuk memudahkan interaksi staf gudang menggunakan satu tangan.
* **Offline Handling Notice**: Komponen UI harus menampilkan indikator "Offline Mode" di header jika koneksi internet terputus, dan menonaktifkan fungsi simpan stok.

## 8. Technical Considerations
* **Dependensi Eksternal**:
  1. REST API & Webhook Shopee Partner API.
  2. REST API & Webhook Tokopedia Seller API.
  3. WhatsApp Business API / Gateway pihak ketiga.
* **Penanganan Kegagalan Integrasi**:
  * **Shopee/Tokopedia Rate-limit**: Terapkan *Rate-Limiter* lokal menggunakan Redis Token Bucket untuk membatasi request keluar agar tidak melebihi batas kuota API marketplace (rujuk NFR-001, A-01).
  * **WhatsApp Outage**: Kegagalan pengiriman notifikasi WhatsApp tidak boleh membatalkan (*rollback*) transaksi pemotongan stok di database. Notifikasi dimasukkan ke antrean (*fallback log*) untuk dicoba lagi nanti.
* **Konkurensi & Data Integrity**: Pengurangan stok wajib menggunakan SQL Transaction berbasis atomic update (`UPDATE stock SET qty = qty - N WHERE id = X AND qty >= N`) untuk mencegah *race condition* stok bernilai negatif.

## 9. Success Metrics
* **SM-001**: **Zero Overselling Event**: 0 laporan transaksi batalkan otomatis oleh Shopee/Tokopedia akibat stok habis dalam periode 30 hari pasca-layanan digunakan tenant.
* **SM-002**: **Scan Success Rate**: > 98% percobaan pemindaian barcode fisik berhasil membaca data SKU secara tepat pada percobaan pertama, diukur via event tracking PWA bulanan.
* **SM-003**: **Stock Sync Speed**: p99 waktu sinkronisasi stok dari sistem lokal hingga ter-update di Shopee/Tokopedia < 5 detik, diukur via log timestamps aplikasi bulanan.

## 10. Asumsi dan Open Questions

### Asumsi
* **A-01**: API Shopee dan Tokopedia menyediakan akses webhook dan kuota rate-limit yang mencukupi untuk sinkronisasi stok real-time (Dampak jika salah: Terjadi delay sinkronisasi/pemblokiran IP, memicu overselling).
* **A-02**: Kamera smartphone milik staf gudang memiliki resolusi dan fokus yang memadai untuk memindai barcode standar via browser web (Dampak jika salah: Proses pemindaian barcode gagal, adopsi PWA gagal).
* **A-03**: Target UMKM bersedia membayar biaya berlangganan bulanan SaaS multi-tenant (Dampak jika salah: Model bisnis gagal mencapai target MRR).
* **A-04**: Layanan pihak ketiga WhatsApp Gateway memiliki tingkat keterandalan tinggi (uptime > 99%) (Dampak jika salah: Peringatan stok kritis tidak terkirim tepat waktu).
* **A-05**: Sebagian besar produk milik UMKM telah memiliki label barcode fisik standar (EAN/UPC/QR) yang unik (Dampak jika salah: Sistem wajib menambah fitur pencetak dan generator barcode internal).
* **A-06** *(Asumsi Baru)*: Beban puncak rata-rata MVP adalah 20 tenant aktif dengan total beban 100 pengguna konkuren secara bersamaan (Dampak jika salah: Target NFR-001 performa harus disesuaikan ulang).
* **A-07** *(Asumsi Baru)*: Merchant telah memiliki akun Shopee Developer dan Tokopedia Seller API yang sudah disetujui (Dampak jika salah: Tenant tidak bisa menghubungkan integrasi marketplace pada saat onboarding).

### Open Questions
* **OQ-001**: Berapa batas pasti kuota rate-limit API resmi dari Shopee dan Tokopedia untuk tiap kategori akun merchant?
  * *PIC/Tenggat*: Tech Lead / H-7 sebelum fase pengembangan modul integrasi.
  * *Default Sementara*: Mengasumsikan batas rate-limit aman adalah 5 request/detik per tenant.
* **OQ-002**: Bagaimana alur penanganan konflik stok jika transaksi di Shopee dan Tokopedia terjadi secara bersamaan dalam detik yang sama saat stok tersisa 1?
  * *PIC/Tenggat*: Product Manager & Architect / H-3 sebelum implementasi DB Locking.
  * *Default Sementara*: First-come, first-served berbasis timestamp kedatangan webhook di server GudangHub. Order pertama dapat stok, order kedua ditolak/dibatalkan.
* **OQ-003**: Layanan WhatsApp Gateway mana yang paling efisien dari segi biaya dan stabilitas untuk diintegrasikan pada arsitektur multi-tenant?
  * *PIC/Tenggat*: Tech Lead / H-5 sebelum pembuatan modul notifikasi.
  * *Default Sementara*: Menggunakan provider Fonnte / Wablas dengan mekanisme pay-per-broadcast sebagai pilihan paling ekonomis untuk MVP.