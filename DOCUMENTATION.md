# NgopiGakApp Documentation
## (A Guide for Laravel Developers)

Selamat datang di dokumentasi teknis **NgopiGakApp**. Dokumen ini disusun khusus untuk membantu Anda memahami struktur arsitektur React modern ini dengan menganalogikannya ke konsep-konsep Laravel yang sudah Anda kuasai.

---

## 1. Arsitektur Umum: Mindset Shift
Jika di Laravel Anda terbiasa dengan pola **MVC (Model-View-Controller)**, di aplikasi React ini kita menggunakan pola **Modular View-Store**:

| Konsep Laravel | Analogi di Proyek Ini | Lokasi File |
| :--- | :--- | :--- |
| **Routes (web.php)** | State-based Routing | `src/App.jsx` |
| **Blade/Inertia Views** | View Components | `src/views/*.jsx` |
| **Eloquent / Services** | API Wrapper & Store | `src/store.js` |
| **Service Container** | AppContext (Provider) | `src/context/AppContext.jsx` |
| **Laravel Echo** | Supabase Realtime | `src/store.js` |

---

## 2. Struktur Folder

```text
src/
├── components/      # "Atomic Components" (seperti Blade Components)
├── context/         # "Global State" (seperti Singleton di Service Container)
├── views/           # "Pages" (seperti Resources/Views atau Inertia Pages)
├── utils/           # "Helpers" (seperti app/Helpers.php)
├── App.jsx          # "Main Kernel & Router"
├── store.js         # "Business Logic & Data Layer" (Service Layer)
└── supabase.js      # "Database Configuration"
```

---

## 3. Jalur Data (The Data Flow)

### 3.1 Global State (AppContext)
Di Laravel, Anda mungkin menggunakan `Session` atau `Shared Data` di Middleware. Di sini, kita menggunakan **React Context**.
- **File**: `src/context/AppContext.jsx`
- **Fungsi**: Menyediakan data `store` dan objek `api` ke seluruh bagian aplikasi tanpa perlu *prop drilling*.
- **Cara Pakai**: Mirip dengan memanggil `app('ServiceName')`. Di komponen, cukup gunakan `const { store, api } = useAppContext();`.

### 3.2 Service Layer (Store & API)
Objek `api` di `src/store.js` adalah tempat semua logika bisnis berada.
- Jika Anda ingin menambah fitur (misal: menghapus pesanan), Anda tidak membuat Controller baru.
- Anda menambahkan fungsi di `api` (dalam `store.js`), lalu memanggilnya dari View.
- Ini mirip dengan membuat **Service Class** di Laravel.

---

## 4. Routing & Controller Logic
Aplikasi ini menggunakan **State-based Routing**.
- Di `src/App.jsx`, terdapat state `view`.
- Logika pemilihan halaman dilakukan di dalam `render` method (JSX):
  ```javascript
  {view === 'home' && <HomeView />}
  {view === 'orders' && <MyOrdersView />}
  ```
- Ini analog dengan `Route::get('/', ...)` yang mengembalikan `Inertia::render('Home')`.

---

## 5. Sinkronisasi Realtime (Database)
Aplikasi ini menggunakan Supabase Realtime.
- **Analogi**: Ini seperti kombinasi **Laravel Eloquent** dan **Laravel Echo**.
- Setiap kali ada perubahan di database (PostgreSQL), Supabase mengirimkan sinyal ke `initSupabaseSync` di `store.js`.
- Begitu sinyal diterima, aplikasi akan memanggil `fetchFullState()` untuk memperbarui tampilan semua pengguna secara otomatis (HMR-like experience).

---

## 6. Tips Mengembangkan Fitur Baru

Jika Anda ingin menambahkan fitur baru (misal: "Review Kopi"):

1. **Database**: Tambahkan tabel di Supabase (seperti membuat Migration).
2. **Store**: Buat fungsi `api.addReview` di `src/store.js` (seperti membuat Service method).
3. **View**: Buat file `src/views/ReviewView.jsx` (seperti membuat Blade/Inertia view).
4. **App.jsx**: Daftarkan tampilan baru tersebut di logic routing `App.jsx`.

---

## 7. Penutup
Arsitektur ini didesain agar tetap ringan namun terstruktur. Dengan memisahkan logika data (`store.js`) dari logika tampilan (`views/`), Anda bisa dengan mudah melakukan *maintenance* atau migrasi di masa depan, sangat mirip dengan cara kerja aplikasi Laravel modern yang menggunakan Inertia.js.

---
*Dokumentasi ini dibuat untuk mempermudah transisi dari Backend-heavy ke Modern Frontend development.*
