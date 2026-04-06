# 📖 Panduan NgopiGakApp untuk Laravel Developer ☕

Selamat datang! Jika Anda terbiasa dengan **PHP Laravel**, arsitektur berbasis *Controller*, *Eloquent ORM*, dan *Blade*, berpindah ke aplikasi *Single Page Application* (React) + *BaaS* (Supabase) mungkin terasa berbeda di awal.

Dokumen ini ditulis khusus agar Anda bisa menerapkan *"Mental Model"* Laravel Anda langsung ke *codebase* NgopiGakApp!

---

## 🏗️ 1. Arsitektur: Laravel vs React + Supabase

Kunci utama perbedaan filosofisnya adalah: **Pergeseran Beban Backend**.

*   **Di Laravel:** Server melakukan semuanya. Route mengarah ke Controller, Controller memanggil Model (Eloquent database), dan mengembalikan HTML/JSON (Blade).
*   **Di NgopiGak (React + Supabase):** 
    *   **React (Frontend)** memegang kendali atas "Route" dan "Controller". React merender UI secara mandiri.
    *   **Supabase (Backend)** berfungsi layaknya *database API instan*. Anda tak butuh Controller Backend, React langsung "ngobrol" ke Database.

### Peta Konsep File
| Apa Fungsi di Laravel | Di NgopiGakApp (React) | Penjelasan |
| :--- | :--- | :--- |
| **`routes/web.php`** | `App.jsx` (State `view`) | Transisi antar halaman (`home`, `session`, `history`) diatur dari *Value State* (bukan URL murni). |
| **`app/Http/Controllers/`** | `App.jsx` (Functions) | Aksi-aksi/method (contoh: `startSession()`, `addOrder()`) ada di `App.jsx`. |
| **`app/Services/`** | `src/store.js` (`api` object) | Tempat menyimpan fungsi eksekusi logic database. |
| **`app/Models/` (Eloquent)** | `supabase.js` + `store.js` | Kita query manual pakai sintaks Query Builder ala Supabase js. |
| **`resources/views/*.blade.php`** | `App.jsx` (`renderHome()`, dll) | HTML tidak ditulis di *file* terpisah, melainkan digabung di script (disebut JSX). |
| **Laravel Echo / Pusher** | Supabase Realtime | Fitur websocket `supabase.channel()` di dalam `store.js` |
| **Mix / Vite Server** | `npm run dev` | Sama seperti menjalankan `npm run dev` di ekosistem Laravel modern (menjalankan Server Vite di `localhost:5173`). |

---

## 💾 2. Pengganti Eloquent ORM: Supabase JS

Di Laravel, jika Anda ingin mengambil semua sesi yang statusnya '*open*', Anda akan menulis code seperti ini:
```php
// Laravel
$activeSessions = Session::where('status', 'open')->get();
```

Di Supabase (lihat modul `store.js`), API-nya sangat mirip dengan metode *Query Builder* di Laravel, hanya saja bersifat *Asynchronous*:
```javascript
// NgopiGak (Supabase JS)
const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('status', 'open');
```
*Karena React berjalan asinkronus (tidak menunggu), setiap query DB harus wajib dipasangi tempelan `await` layaknya Anda menangani Guzzle HTTP Request di PHP.*

---

## ⚡ 3. Livewire vs State React (`App.jsx`)

Bayangkan `App.jsx` seperti satu komponen *Livewire* berukuran besar yang membungkus keseluruhan halaman web.

Apabila di Laravel Anda ingin me-refresh sebuah view karena ada user baru yang bergabung, Anda pasti me-reload halaman atau memancarkan event `wire:poll` via Livewire. 

**Bagaimana React melakukannya?**
1. React memiliki wadah variabel (State) bernama `useState()`.
2. Setiap kali isi dalam `useState` berubah nilainya (seperti `setStore({...baru})` atau `setView('session')`), **React otomatis me-render ulang Blade-nya (JSX)** tanpa harus me-reload browser.

Di `App.jsx` pada baris sekitar `1067`, Anda akan melihat ini:
```jsx
// Anggap ini mirip seperti if-else @include di blade
<main className="main-content">
  {view === 'home' && renderHome()}
  {view === 'session' && renderSession()}
</main>
```

---

## 📡 4. Laravel Broadcast (Pusher) vs Supabase Realtime

Sistem ini bisa membuat HP User ke-2 otomatis berubah melihat "Sesi Aktif" saat User ke-1 memencet "Buat Sesi", bahkan tanpa User ke-2 menyentuh layarnya sedikitpun.

Di Laravel, Anda umumnya harus men-setup **WebSockets**, mendaftarkan Channel di `routes/channels.php`, dan menangkapnya dengan **Echo**.

Di NgopiGakApp, semuanya dilakukan di `store.js` lewat **Supabase Realtime**:
```javascript
export async function initSupabaseSync() {
  // Mirip seperti Echo.channel('..')->listen('..')
  supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        // Setiap kali ada kolom apa saja yang di Insert/Update/Delete di posgreSQL
        // Fungsi ini dipanggil untuk menarik ulang data secara total dari Supabase.
        fetchFullState();
      }
    )
    .subscribe();
}
```

Ketika Supabase mendeteksi perubahan, fungsi `fetchFullState()` menarik ulang data dan memanggil `notifyLocalUpdate()`. `App.jsx` secara proaktif mendengarkan perintah ini dan secara ajaib memaksa UI melakukan rendering ulang!

---

## 🔮 Ringkasan Alur Kerja

Membayangkan alur sistem NgopiGak yang berjalan sinkron:

1. **User (Browser):** Klik `Buka Sesi (App.jsx)`.
2. **"Controller":** Menarik `api.createSession(UserA)` di `store.js`.
3. **"Eloquent":** Query Database meng-`INSERT` record baru dengan status *'open'* ke tabel `sessions`.
4. **"Pusher Webhooks":** Database PostgreSQL yang disuntik *trigger* berteriak "Woi, ada data masuk!" ke semua HP user terkoneksi.
5. **Realtime Listener:** `supabase.channel()` menangkap teriakan database.
6. **Re-Fetch State:** Fungsi `fetchFullState()` yang mirip `Resource API` merangkum semua tabel (*sessions*, *orders*, dll) seutuhnya.
7. **Reaktivitas UI:** Menyuntik memori `setStore(...)` di `App.jsx`. React dengan kepintarannya me-refresh antarmuka dengan membedakan *HTML DOM* lama vs baru. 

Semoga panduan analogi ini merubah persepsi Anda tentang React + Supabase! Frameworknya mungkin asing pada awalnya, tapi tujuannya sama: Memanipulasi "state" (status terkini), lalu merendernya ke pengguna. 🚀
