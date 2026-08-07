# Rencana Integrasi IoT BARDI (Tuya) dengan Inventaris AC

Wah, selamat! BARDI Smart Breaker model 10A-NEM (Non-Energy Monitoring) adalah pilihan yang tepat untuk melacak status ON/OFF dan waktu pemakaian terakhir. Karena ini melibatkan perangkat keras fisik (IoT), kita akan mengerjakannya secara bertahap agar aman dan rapi.

## Fase 1: Pemasangan Fisik & Aplikasi HP (Langkah Anda Sekarang)

> [!IMPORTANT]
> Lakukan Fase 1 ini terlebih dahulu sebelum kita lanjut ke fase pemrograman. Pastikan keselamatan kerja saat berurusan dengan kabel listrik!

1. **Pasang Alat ke AC:** Minta bantuan teknisi listrik untuk memasang BARDI Smart Breaker di jalur listrik salah satu AC Anda (bisa di atas plafon atau di dekat stopkontak AC).
2. **Download Aplikasi:** Unduh aplikasi **BARDI Smart Home** atau **Smart Life** di HP Anda.
3. **Hubungkan (Pairing):** Hubungkan Smart Breaker tersebut ke Wi-Fi kantor dan pastikan Anda sudah bisa mematikan/menyalakan AC tersebut lewat HP Anda dari jarak jauh.

## Fase 2: Mendapatkan Kunci Akses (API Key) dari Tuya Cloud

Bardi beroperasi menggunakan ekosistem **Tuya**. Agar Google Sheets kita bisa "mengintip" status AC tersebut, kita butuh membuat jalur komunikasi.

1. Buka website **[Tuya IoT Platform](https://platform.tuya.com/)** di PC/Laptop dan daftar akun gratis.
2. Nanti saya akan pandu Anda langkah demi langkah untuk:
   - Membuat "Cloud Project".
   - Menghubungkan akun aplikasi HP Anda dengan Cloud Project tersebut.
   - Mendapatkan **Access ID (Client ID)** dan **Access Secret (Client Secret)**.

## Fase 3: Integrasi Backend (Google Apps Script)

Di fase ini saya akan mengambil alih pengerjaan kode.

1. **Buat Tab/Sheet Baru:** Saya akan minta Anda membuat 1 sheet baru bernama `logPemakaian` di Google Sheets.
2. **Update Script.txt:** Saya akan merombak `Script_Google.txt` dengan menambahkan fungsi untuk melakukan panggilan (HTTP Request) ke Tuya API menggunakan kunci akses yang didapat di Fase 2.
3. **Sistem Trigger/Cron Job:** Kita akan menyetel Google Apps Script agar berjalan secara otomatis setiap 15 atau 30 menit untuk mengecek status AC dan mencatat waktu nyala/mati terakhirnya ke `logPemakaian`.

## Fase 4: Integrasi Frontend (Website Inventaris AC)

### [MODIFY] index.html
- Menambahkan tab menu navigasi baru: **Log Pemakaian (IoT)**.
- Menambahkan tabel untuk menampilkan: Tgl Terakhir Nyala, No Seri, Lokasi, Status Saklar (ON/OFF).

### [MODIFY] app.js
- Membaca data `logPemakaian` dari *server* saat aplikasi pertama kali dimuat.
- Menambahkan fungsi *render* untuk tabel Log Pemakaian secara *real-time* di aplikasi Anda.

---

## Pertanyaan Terbuka

1. Untuk tahap awal ini, apakah alat BARDI sudah berhasil dipasang pada AC dan bisa dikendalikan lewat aplikasi HP Anda?
2. Jika belum, silakan kabari saya jika proses pemasangan fisiknya sudah selesai.

Jika Anda setuju dengan alur kerja di atas, silakan klik **Proceed** dan kita akan mulai langsung ke **Fase 1 & Fase 2**!
