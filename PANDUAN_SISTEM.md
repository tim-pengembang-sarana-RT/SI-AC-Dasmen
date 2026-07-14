# Walkthrough Sistem Informasi AC (Modul Log & Automasi)

Proses pengembangan antarmuka dan logika Modul Log telah berhasil diselesaikan. Berikut adalah rincian apa saja yang telah dibangun di dalam sistem:

## 1. Antarmuka Baru (UI)
- **Menu Navigasi Tambahan:** Di menu sisi (*sidebar*), sekarang terdapat 3 tombol baru, yaitu:
  - **Log Pemeliharaan:** Untuk mencatat perawatan teknisi dan penggantian suku cadang.
  - **Log Mutasi:** Untuk mencatat pergerakan/pemindahan AC antar ruangan/gedung.
  - **Log Usul Hapus:** Untuk mencatat AC yang rusak dan diusulkan untuk masuk gudang.
- **Tabel Interaktif:** Masing-masing menu log kini memiliki tabel datanya sendiri yang memuat data asli dari spreadsheet (Google Drive) yang sudah diintegrasikan.
- **Formulir Input (Modal):** Ketika Anda menekan tombol "Tambah Log" di masing-masing menu, sebuah formulir (*modal popup*) bergaya *glassmorphism* akan muncul.

## 2. Automasi Cerdas (Robot)
Saya telah menyalin dan menanamkan 3 Robot logika Apps Script Anda ke dalam arsitektur *Javascript* lokal kita:

> [!TIP]
> **Robot 1: Alarm Usul Hapus (90 Hari)**
> Ketika sistem dijalankan, aplikasi akan menghitung AC dengan status `✅ MASUK GUDANG` di *Log Usul Hapus*. Jika usia usulan tersebut lebih dari 90 hari, sebuah *Alert/Popup* akan muncul otomatis mengingatkan Anda untuk menghapus aset secara permanen.

> [!TIP]
> **Robot 2: Auto-fill & Sync Mutasi**
> Saat membuat log mutasi, mengisi `No. Seri Indoor` akan otomatis melengkapi `Lokasi Asal`. Jika *checkbox* **Sinkronisasi ke Master Data** dicentang saat menyimpan, data Lokasi di tabel utama akan ter-update otomatis secara *real-time*.

> [!TIP]
> **Robot 3: Sync Usul Hapus**
> Serupa dengan Mutasi, jika *checkbox* **Sinkronisasi ke Master Data** dicentang di form Usul Hapus, lokasi AC di tabel utama akan otomatis dipindahkan ke Gudang dan statusnya berubah menjadi `✅ MASUK GUDANG`.

## 3. Arsitektur "Serverless" (Google Sheets API)
Aplikasi ini sekarang berjalan dalam mode **100% Cloud / Serverless**. Kita tidak lagi menggunakan *script* VBScript, `.bat`, atau Node.js lokal. Seluruh beban database telah dipindahkan dengan aman ke **Google Sheets Anda sendiri**.

> [!IMPORTANT]
> **Cara Menjalankan Aplikasi Mulai Sekarang:**
> Karena sudah tidak ada server lokal, aplikasi ini menjadi semudah membuka foto!
> 1. Anda cukup melakukan **Klik Ganda (Double-click)** file **`index.html`** di komputer manapun (atau dari Flashdisk).
> 2. Aplikasi akan langsung memuat data langsung dari Google Sheets menggunakan internet.
> 3. Semua perubahan (Tambah Mutasi, Hapus Log, dsb) akan dikirim dan tersimpan secara ajaib ke Spreadsheet Anda dalam hitungan detik.
> 
> *Keuntungan Ekstra:* Anda bahkan bisa mengirim file `index.html`, `index.css`, `app.js` dan folder `lucide` ini ke rekan kerja Anda (atau Anda upload ke layanan gratis seperti GitHub Pages), dan Anda semua bisa mengakses *database* AC yang sama tanpa harus membawa-bawa flashdisk lagi!

## 4. Cara Verifikasi
Anda bisa memverifikasinya sekarang dengan cara:
1. Klik ganda file `index.html` dari flashdisk Anda.
2. Anda akan melihat animasi "Mengunduh data dari Google Sheets...". Setelah selesai, tabel akan terisi.
3. Cobalah tambahkan satu data *Log Mutasi* secara sembarang, lalu klik Simpan.
4. Buka Google Sheets Anda yang asli di browser. Ajaib! Baris mutasi tersebut pasti langsung muncul di Spreadsheet Anda!
