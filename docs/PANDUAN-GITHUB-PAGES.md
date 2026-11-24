# Panduan Deploy ke GitHub Pages

Repositori ini 100% statis (HTML/CSS/JS tanpa build), jadi langsung kompatibel dengan
**GitHub Pages**. Ikuti tiga langkah di bawah.

## Langkah 1 — Masukkan file ke repositori

Pilih **satu** cara:

### Cara A: Upload lewat browser (paling mudah, tanpa install apa pun)

1. Ekstrak file `skrining.zip` di komputermu sampai muncul folder `skrining`.
2. Buka <https://github.com/imroatunjamilah/skrining> di browser.
3. Klik **Add file → Upload files**.
4. **Seret (drag & drop) SELURUH ISI folder `skrining`** (folder `css`, `js`, `assets`,
   `admin`, `docs`, `server`, serta file `index.html`, `README.md`, `.nojekyll`,
   `.gitignore`, `LICENSE`) ke area upload. Peramban Chrome/Edge bisa menerima drag folder.
   - Jika repositorimu sudah punya `README.md` bawaan dan muncul konflik, centang
     pilihan **replace** / hapus dulu README lama lewat halaman file.
5. Isi pesan commit, misalnya `feat: situs skrining DASS-21 versi pertama`, lalu klik
   **Commit changes**.

> Catatan: file `.nojekyll` dan `.gitignore` terkadang tidak bisa dilihat di File Explorer
> karena diawali titik — aktifkan "tampilkan file tersembunyi" atau tetap drag-foldernya;
> keduanya penting (`.nojekyll` mencegah GitHub memblokir aset).

### Cara B: Lewat Git di komputer (lebih rapi untuk pengembangan berkelanjutan)

```bash
# di dalam folder hasil ekstraksi skrining/
git init
git add .
git commit -m "feat: situs skrining DASS-21 versi pertama"
git branch -M main
git remote add origin https://github.com/imroatunjamilah/skrining.git
git push -u origin main
```

Saat `git push`, GitHub akan meminta login:
- **Windows/Mac:** jendela login browser biasanya muncul otomatis (Git Credential Manager).
- **Linux:** gunakan **Personal Access Token** sebagai password. Buat di GitHub →
  Settings → Developer settings → Personal access tokens → Fine-grained tokens
  (beri akses **Contents: Read and write** untuk repo `skrining` saja).

### Cara C: Mintakan asisten/mesin mendorong untukmu

Buat **Fine-grained Personal Access Token** yang hanya berlaku untuk repo `skrining`
(durasi 7 hari, izin Contents: Read and write), kirimkan ke asisten di chat, dan
proses push akan dilakukan langsung. Setelah berhasil, **cabut token tersebut**
di halaman GitHub → Settings → Developer settings.

## Langkah 2 — Aktifkan GitHub Pages

1. Buka repositori → **Settings → Pages** (menu kiri).
2. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
3. **Branch:** pilih `main`, folder **`/ (root)`**, lalu **Save**.
4. Tunggu 1–2 menit. URL live akan tampil di halaman itu:

   **https://imroatunjamilah.github.io/skrining/**

## Langkah 3 — Verifikasi

- Buka URL di atas dari HP dan laptop.
- Jalankan satu skrining lengkap sampai layar "Yeay! Kamu Berhasil!".
- Buka `https://imroatunjamilah.github.io/skrining/admin/` → login
  `admin` / `skrining2026` → pastikan data peserta tampil → klik **Unduh CSV**.

## Masalah umum

| Gejala | Penyebab & solusi |
| --- | --- |
| Halaman 404 | Pages belum aktif atau belum selesai build. Cek Settings → Pages, tunggu 2 menit, hard refresh (Ctrl+Shift+R). |
| CSS/JS tidak termuat | Pastikan `.nojekyll` ikut ter-upload dan semua path memakai path relatif (`css/...`, `js/...`) — di repo ini sudah demikian. |
| URL salah huruf | URL GitHub Pages peka huruf besar-kecil dan mengikuti nama repo: `/skrining/`. |
| Login admin gagal | Gunakan `admin` / `skrining2026` (kredensial demo). |

## Peta jalan setelah ini

Mode demo menyimpan data di localStorage perangkat. Untuk acara nyata dengan database,
LLM, PDF, dan ekspor terpusat: pasang backend sesuai blueprint di [`server/README.md`](../server/README.md),
lalu hosting backend di Vercel/Railway/VPS — frontend tinggal diarahkan ke API.
