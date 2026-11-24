# Skrining Kesehatan Mental — DASS-21 Interaktif

Situs skrining kesehatan mental berbasis **DASS-21** (Depression Anxiety Stress Scales – 21)
untuk kegiatan skrining selama satu hari. Peserta diajak menempuh **perjalanan interaktif
seperti bermain game**, didampingi maskot **Lumi** yang aktif mengajak main: melambai,
melompat, berbicara lewat bubble dialog, memberi semangat, dan berpesta confetti di akhir.

> **Disclaimer:** Skrining ini adalah alat deteksi dini edukatif — **bukan alat diagnosis**.
> Hasil hanya dibaca oleh petugas berwenang dan peserta tidak pernah melihat skor/labelnya.

## Fitur utama

### Perjalanan peserta (5 tahap)
1. **Landing** — ajakan maskot, penjelasan, kebijakan privasi, dan informed consent
   (tombol mulai aktif setelah setuju).
2. **Identitas** — nama, alamat, no. HP, kategori (Mahasiswa/Dosen/Umum) dengan kolom
   dinamis NIM/NIP + validasi lengkap di sisi klien.
3. **Cerita** — keluhan bebas ("Apa yang sedang kamu rasakan akhir-akhir ini?") dengan
   6 chip ide awal; boleh dilewati.
4. **Kuis DASS-21** — 21 butir resmi satu-per-layar, skala 0–3 (Tidak pernah → Hampir
   selalu, kerangka waktu "minggu lalu"), wajib dijawab semua, tombol Kembali/Lanjut,
   progres `n/21`, transisi antar-bab dengan splash + confetti, dan reaksi maskot.
5. **Selesai** — perayaan, **nomor registrasi unik** (contoh `SKR-20261124-001`),
   ringkasan durasi, dan penjelasan langkah berikutnya — **tanpa skor**.

### Admin (dashboard demo)
- Login demo: **`admin` / `skrining2026`** (produksi: autentikasi server, lihat `server/`).
- Statistik: total / selesai / belum selesai + grafik distribusi kategori.
- Tabel peserta: pencarian, filter status & kategori, urutkan, paginasi.
- Detail peserta: identitas, keluhan, 21 jawaban, hasil D/A/S (mentah, final ×2, kategori).
- **Ekspor CSV** (UTF-8 BOM, satu baris per peserta: identitas + 21 jawaban + skor +
  kategori + kolom analisis LLM siap pakai).
- Data demo sekali klik; tombol PDF tampil nonaktif (butuh backend) supaya jujur terhadap
  kemampuan versi statis.

### Maskot Lumi (mesin animasi)
- Idle: bernapas, berkedip, mengapung, daun bergoyang, **mata mengikuti kursor**.
- **Wave**: melambai mengajak main di landing, lewat rotasi lengan SVG.
- Bounce/cheer: lompat gembira saat jawaban terpilih dan saat bab selesai.
- Talk: mulut bergerak mengikuti mesin ketik di bubble dialog.
- Worried/think: ekspresi khawatir saat validasi gagal, merenung di halaman cerita.
- Confetti: kembang api halaman penuh saat menyelesaikan skrining.
- Hormat pada `prefers-reduced-motion` (animasi dimatikan bila pengguna memintanya).

### Skoring DASS-21
- 21 butir resmi (teks Inggris terverifikasi dari formulir resmi UNSW + terjemahan
  Indonesia setia) dengan pemetaan subskala resmi:
  Depresi 3,5,10,13,16,17,21 · Ansietas 2,4,7,9,15,19,20 · Stres 1,6,8,11,12,14,18.
- Metode standar publikasi (Lovibond & Lovibond, 1995): skor mentah per subskala →
  **×2** → kategori severity tabel resmi.
- **Seluruh konstanta dipusatkan di `js/scoring.js`** dan di-comment jelas, sehingga
  mudah disesuaikan **dengan dokumen referensi resmi penyelenggara** begitu diterima
  (tanpa menyentuh logika lain). Pada versi produksi, perhitungan wajib dijalankan
  ulang di server — blueprint tersedia.

## Menjalankan lokal

Tidak perlu build. Pilih salah satu:

```bash
# opsi 1: langsung buka file
open index.html          # Mac
start index.html         # Windows

# opsi 2: server lokal
python3 -m http.server 8080
# buka http://localhost:8080
```

## Struktur proyek

```
skrining/
├── index.html              # halaman peserta (5 layar, SPA ringan)
├── admin/
│   ├── index.html          # login + dashboard petugas
│   └── admin.css
├── css/
│   ├── base.css            # token desain, tombol, form, latar
│   ├── screens.css         # gaya per layar
│   └── mascot.css          # maskot, bubble, confetti
├── js/
│   ├── config.js           # konfigurasi acara (nama, penyelenggara, prefix nomor, nama maskot)
│   ├── questions.js        # 21 butir resmi DASS-21 (EN + ID, pemetaan subskala)
│   ├── scoring.js          # modul skoring terpusat (menunggu dokumen referensi)
│   ├── mascot.js           # mesin animasi maskot + confetti
│   └── app.js              # controller alur peserta (titik integrasi backend)
├── assets/favicon.svg
├── server/                 # BLUEPRINT backend: schema.sql 6 tabel + spesifikasi API
├── docs/PANDUAN-GITHUB-PAGES.md
├── .nojekyll               # wajib agar GitHub Pages melayani semua aset
└── README.md
```

## Deploy ke GitHub Pages

Panduan lengkap (3 cara upload + aktivasi Pages + troubleshooting):
**[`docs/PANDUAN-GITHUB-PAGES.md`](docs/PANDUAN-GITHUB-PAGES.md)**

Ringkas: upload seluruh isi folder ini ke repo `imroatunjamilah/skrining`, lalu
Settings → Pages → Deploy from a branch → `main` / `(root)`. Situs live di
`https://imroatunjamilah.github.io/skrining/`.

## Mode demo vs produksi

| Kemampuan | Statis ini (GitHub Pages) | Dengan backend (blueprint `server/`) |
| --- | --- | --- |
| Perjalanan peserta + animasi | Ya | Ya |
| Penyimpanan data | localStorage per perangkat | Database 6 tabel, terpusat |
| Skoring DASS-21 | Ditampilkan di admin (metode standar) | Dihitung di server (anti-manipulasi) |
| Analisis keluhan LLM | Kolom CSV siap (kosong) | Otomatis + PII-safe + flag risiko |
| PDF per peserta | Belum (butuh server) | Ya |
| Ekspor CSV | Ya (per perangkat) | Ya (seluruh acara) |
| Event Page Builder | Konfigurasi via `js/config.js` | CRUD per acara, draft/publish, riwayat |

## Lisensi

MIT — lihat [LICENSE](LICENSE).
