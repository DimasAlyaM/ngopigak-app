# ☕ NgopiGak App

Aksi patungan kopi tim jadi lebih asyik! NgopiGak adalah aplikasi web berbasis React yang mensimulasikan sesi pemesanan kopi bersama, dengan pembagian peran adil (Pembayar & Pendamping), fitur real-time sync, serta integrasi manajemen database yang keren.

Proyek ini dibangun sebagai alat *belajar* bagaimana membangun aplikasi modern berbasis state, reaktivitas secara langsung antar device, dan integrasi dengan **Supabase**.

## ✨ Fitur Utama
- **Real-time Sync**: Semua device / layar pengguna akan otomatis terupdate ketika ada pesanan baru, pembayaran, penutupan sesi, maupun pergantian peran! Memanfaatkan fitur `postgres_changes` dari Supabase.
- **Fair-play Volunteer Rotation**: Secara algoritmik melacak histori relawan pembayaran (`payerHistory`), lalu mengutamakan pengguna yang paling jarang membayar untuk menjadi donatur sesi.
- **Peran Sistem**:
  - 👑 **Pembayar**: Mengkoordinasikan tagihan dan menerima uang penitip.
  - 🛡️ **Pendamping**: Menemani pembayar (Otomatis dipilih).
  - 📦 **Penitip**: Cukup memesan, pantau pembelian, dan konfirmasi jika sudah lunas.
- **Sistem Notifikasi**: Lonceng interaktif untuk notifikasi seperti penarikan bayaran, update pembelian, dll.

## 🛠️ Tech Stack
- Frontend: **React** (v19) + **Vite**
- Backend & Realtime DB: **Supabase** (PostgreSQL)
- Styling: Custom UI dengan efek *Glassmorphism* (Vanilla CSS)
- Deployment: Vercel (bisa diakses dimana saja secara online)

## 🚀 Panduan Setup Lokal

Karena repositori ini sudah membersihkan API Key sensitif, Anda harus menghubungkannya ke Database Anda sendiri (Supabase):

### 1. Setup Supabase Project
1. Buat project baru di [Supabase Dashboard](https://supabase.com/).
2. Buka **SQL Editor** pada Supabase.
3. Jalankan file `supabase_schema.sql` yang ada di root repo ini.
   - Script ini akan membuat semua struktur tabel (`sessions`, `orders`, `notifications`, dsb.)
   - Script ini otomatis mengaktifkan publication `supabase_realtime` sehingga React bisa "mendengar" setiap perubahan tabel.
   - Script ini mematikan RLS (Row Level Security) sementara demi memudahkan prototyping secara lokal.

### 2. Setup Env Variables
1. Salin format URL & Anon Key dari project Supabase Anda (bisa didapatkan di **Project Settings -> API**).
2. Buat file konfidensial baru bernama `.env` di folder utama project ini.
3. Isikan kode berikut:
```env
VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```

### 3. Jalankan Aplikasi
1. Install dependencies:
```bash
npm install
```
2. Nyalakan Vite Server:
```bash
npm run dev
```
3. Buka `http://localhost:5173` di browser Anda.

## 📚 Apa yang Bisa Dipelajari di Proyek Ini?
- **Reaktivitas Antar Device (React + Supabase):** Anda akan belajar bagaimana file `store.js` mensinkronisasi data antara Supabase dan State React tanpa me-refresh halaman (mengandalkan teknik perbandingan State Referensi di Javascript).
- **Membangun Stateful UI Peran:** Logika *rendering* di file `App.jsx` berubah tajam tergantung peran (*role*) dari User yang Login. 
- **Vanilla CSS Tingkat Lanjut:** Mengelola variabel warna *gradient*, font modern, desain *card* mengambang (Glassmorphism), dan state `.active`.

## 🛡️ License
Proyek ini dibuat untuk edukasi - silakan fork, bedah, maupun kembangkan sesuai keinginan Anda!
