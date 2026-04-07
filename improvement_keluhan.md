# Solusi Improvement Keluhan Aplikasi                                                                                                                                                                                                                      ,

Berikut adalah rekomendasi solusi untuk menangani 4 poin keluhan yang disampaikan:

### 1. Masalah Sesi "Abadi" (Lifecycle Management)
**Masalah:** Sesi hanya selesai jika semua ditandai lunas secara manual, menyebabkan sesi menggantung jika ada yang lupa.
**Solusi:**
- **Tombol "Selesaikan Sesi" (Manual Override):** Menambahkan tombol di sisi Pembayar untuk menyelesaikan sesi secara paksa meskipun masih ada "hutang". Ini akan mengarsipkan sesi ke history dan mencatat siapa saja yang belum lunas.
- **Tombol "Tagih Semua" (Reminder):** Fitur untuk mengirim notifikasi ulang ke semua anggota yang statusnya belum lunas.
- **Auto-Archive:** Jika sesi sudah dalam status `active` lebih dari 12 jam, sistem otomatis memindahkannya ke history sebagai "Selesai (dengan Debtors)".

### 2. Histori Order Menumpuk di Mobile
**Masalah:** Panel history tidak bisa di-scroll di HP dan tidak bisa ditutup tanpa refresh.
**Solusi:**
- **CSS Fix (Overflow Control):** Memperbaiki properti `max-height: 85vh` dan `overflow-y: auto` pada kontainer modal history agar konten tetap berada di dalam frame layar dan bisa di-scroll.
- **Floating Close Button:** Menambahkan tombol "Tutup" (X) yang tetap (fixed) di pojok kanan atas modal agar selalu bisa diakses meskipun list history sangat panjang.
- **Pagination/Limit:** Membatasi jumlah history yang dimuat awal (misal 5 sesi terakhir) dengan tombol "Load More".

### 3. Notifikasi Terpotong di Mobile
**Masalah:** UI notifikasi tidak responsif pada layar kecil/HP.
**Solusi:**
- **Responsive Dropdown:** Menyesuaikan lebar dropdown notifikasi pada media query mobile (misal `width: 90vw` dan `left: 5vw`) agar selalu berada di tengah layar.
- **Text Wrapping:** Memastikan teks pesan di dalam notifikasi menggunakan `word-break: break-word` dan tidak menggunakan `white-space: nowrap`.

### 4. Validasi Pembayaran (Bukti Bayar)
**Masalah:** Member bisa asal tekan "Sudah Bayar" tanpa bukti nyata.
**Solusi:**
- **Upload Bukti Bayar:** Menambahkan input file (gambar) saat member menekan tombol "Sudah Bayar". Member wajib/disarankan melampirkan screenshot transfer.
- **Status Review:** Di sisi Pembayar, item akan berubah status menjadi "Menunggu Verifikasi" dengan tombol "Lihat Bukti". Pembayar baru kemudian menekan "Tandai Lunas" setelah melihat bukti tersebut.
- **Database Update:** Menambahkan kolom `payment_proof` (TEXT/URL) pada tabel `orders` untuk menyimpan referensi gambar tersebut.

---

*File ini dibuat sebagai referensi untuk implementasi perbaikan pada kode program.*
