# Panduan Backend (Supabase) — Skrining Kesehatan Mental

Backend untuk acara sehari: data peserta dari **semua HP terkumpul di satu
database**, admin login dengan email sungguhan, dan pengaturan acara berlaku
untuk semua perangkat. Gratis (paket free Supabase jauh melebihi kebutuhan
acara sehari).

Yang diperlukan: ±15 menit, akun email, dan koneksi internet. Tidak perlu
install apa pun.

---

## Langkah 1 — Buat proyek Supabase

1. Buka <https://supabase.com> → klik **Start your project** → daftar
   (bisa pakai akun GitHub).
2. Setelah masuk, klik **New project**.
3. Isi form:
   - **Name**: `skrining` (bebas)
   - **Database Password**: buat sandi kuat, **catat di tempat aman**
     (dipakai kalau nanti perlu koneksi database langsung)
   - **Region**: pilih `Singapore` (paling dekat/debu terkecil dari Indonesia)
4. Klik **Create new project** → tunggu ±2 menit sampai proyek siap.

## Langkah 2 — Jalankan skema database

1. Di menu kiri, klik ikon **SQL Editor** (ikon terminal).
2. Klik **New query**.
3. Buka file `supabase/schema.sql` di repo ini, **salin seluruh isinya**,
   paste ke editor.
4. Klik **Run** (atau Ctrl+Enter).
5. Hasil yang benar: muncul pesan sukses, dan di menu **Table Editor**
   ada dua tabel: `peserta` dan `pengaturan`.

> **Sudah pernah membuat tabel sebelumnya** (mis. manual lewat Table
> Editor, atau dengan skema lama) dan belum yakin strukturnya benar?
> Jalankan `supabase/perbaikan-tabel.sql` **menggantikan** langkah ini —
> sekali saja, dan hanya saat belum ada data peserta nyata (file itu
> menghapus tabel lama lalu membuat ulang dengan izin yang benar).

## Langkah 3 — Buat akun admin

1. Menu kiri → **Authentication** → tab **Users**.
2. Klik **Add user** → **Create new user**.
3. Isi:
   - **Email**: email petugas, mis. `upa.bk@kampus.ac.id`
   - **Password**: sandi admin (minimal 8 karakter) — ini yang dipakai
     login dashboard
   - Centang **Auto Confirm User**.
4. Klik **Create user**.
5. (Opsional, disarankan) Tambahkan email recovery di profil pengguna
   tersebut agar bisa reset sandi sendiri lewat menu "Forgot password".

## Langkah 4 — Ambil dua kunci API — **SELESAI ✓ (dipasang lewat chat)**

Kredensial sudah dikirim oleh pemilik proyek lewat chat dan sudah
**terpasang di `js/config.js`** (2026-11-25):

- **Project URL**: `https://aeueglwozlyqcxofanls.supabase.co`
- **Publishable key (anon public)**: `sb_publishable_2Uk91ijm1QFsdj0Vo6Ehbw_N1Ha1QjP`
  (format kunci baru Supabase, pengganti kunci lama `eyJ...` — sama-sama
  aman untuk situs publik)

> **PENTING**: kunci yang dipakai HANYA publishable/anon public. Kunci
> `service_role` / `secret` TIDAK PERNAH dipakai di situs dan TIDAK BOLEH
> dibagikan ke siapa pun.

## Langkah 5 — Pasang kunci ke situs — **SELESAI ✓**

Sudah dilakukan oleh asisten dan di-push ke GitHub. Untuk pembaruan
mandiri di masa depan: edit `js/config.js` (baris `supabaseUrl` /
`supabaseAnonKey`) → Commit → GitHub Pages rebuild otomatis ±1 menit.

## Langkah 6 — Uji end-to-end

1. Buka situs dari **HP** → selesaikan satu skrining sampai layar
   "Yeay! Kamu Berhasil!".
2. Buka Supabase → **Table Editor** → tabel `peserta` → baris baru harus
   muncul (nama, 21 jawaban, nomor registrasi).
3. Buka `/admin/` dari **laptop** → login dengan email + sandi admin
   (Langkah 3) → data peserta tadi tampil di dashboard.
4. Klik **Unduh CSV** → berisi baris peserta tersebut.
5. Tab **Pengaturan Acara** → ubah nama acara → Simpan → buka halaman
   peserta di HP lain → info acara ikut berubah (berlaku global).

---

## Catatan penting paket gratis Supabase

- Proyek gratis yang **tidak aktif ±7 hari** akan dijeda (Paused) oleh
  Supabase. **Sehari sebelum acara**, buka dashboard dan pastikan
  proyek aktif; kalau ada tulisan "Paused", klik **Restore** (±2 menit).
- Setelah acara: unduh CSV, lalu (jika diinginkan) kosongkan tabel
  `peserta` dari Table Editor agar data tidak menumpuk.

## Perilaku sistem setelah backend aktif

| Aspek | Sebelum (demo) | Sesudah (backend) |
| --- | --- | --- |
| Simpan data | localStorage per perangkat | Database Supabase, terkumpul dari semua HP |
| Admin login | `admin`/`skrining2026` per perangkat | Email + sandi via Supabase Auth (satu akun resmi) |
| Ganti sandi | Per perangkat | Mengubah sandi akun admin sungguhan |
| Pengaturan acara | Per perangkat | Global — semua HP langsung ikut |
| Validasi jawaban | Browser | **Database** (21 butir, nilai 0-3, tipe data) |
| Mode offline | Tetap jalan lokal | Peserta tanpa internet tetap bisa mendaftar lokal; pengiriman diulang saat online |

## Catatan privasi & etika

- Data peserta bersifat rahasia: hanya admin yang login yang bisa membacanya.
- Hasil skrining bukan diagnosis — tetap butuh pembacaan profesional.
- Setelah acara: unduh CSV, lalu (jika diinginkan) hapus tabel `peserta`
  dari Table Editor agar data tidak menumpuk di free tier.

## Yang belum termasuk (fase berikutnya)

- PDF individual per peserta dan analisis keluhan LLM — butuh
  Supabase Edge Functions (dibangun setelah alur data ini stabil).
- Blueprint versi lengkap 6 tabel tetap tersedia di `server/` untuk
  kebutuhan jangka panjang.
