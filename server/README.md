# Blueprint Backend — Skrining Kesehatan Mental

> **Status: BLUEPRINT (belum diimplementasikan).** Folder ini berisi desain lengkap
> untuk mengangkat situs statis (GitHub Pages) menjadi sistem produksi penuh sesuai
> spesifikasi penyelenggara. Halaman peserta dan admin saat ini berjalan dalam
> **mode demo** (localStorage) dan sengaja dibuat dengan **titik integrasi yang jelas**
> agar backend bisa dipasang tanpa menulis ulang antarmuka.

## Mengapa backend diperlukan?

GitHub Pages hanya melayani berkas statis — tanpa server, tanpa database. Sementara itu
spesifikasi menuntut hal-hal yang **wajib** berjalan di server:

1. **Skoring DASS-21 sisi server** (anti-manipulasi; klien tidak boleh menjadi sumber kebenaran).
2. **Penyimpanan database** (6 tabel, lihat `schema.sql`).
3. **Analisis keluhan oleh LLM** dengan anonimisasi PII dan guardrail "bukan diagnosis".
4. **PDF individual** per peserta dan **ekspor CSV** server-side.
5. **Autentikasi admin** (bcrypt + sesi/JWT) dan **Event Page Builder** per acara.

## Rekomendasi stack

| Komponen | Pilihan ringan | Alternatif |
| --- | --- | --- |
| API | Node.js (Express/Hono) | Python (FastAPI) |
| Database | PostgreSQL | MySQL/MariaDB, SQLite (satuan acara kecil) |
| LLM | API pilihan penyelenggara | lokal via Ollama |
| PDF | pdfkit / Puppeteer | ReportLab (Python) |
| Hosting | Vercel / Railway / Fly.io | VPS + Nginx + systemd |

## Skema API

Semua respons JSON. Autentikasi admin memakai header `Authorization: Bearer <token>`.

### Peserta (publik)
| Metode | Jalur | Fungsi |
| --- | --- | --- |
| POST | `/api/peserta` | Registrasi identitas → kembalikan `nomor_reg` + `peserta_id`. Validasi server-side (nama, alamat, HP, kategori, NIM/NIP). Cegah duplikasi HP per hari. |
| POST | `/api/peserta/:id/keluhan` | Simpan cerita keluhan. |
| POST | `/api/peserta/:id/jawaban` | Simpan satu jawaban `{nomor_butir, nilai}` (1–21, 0–3). Server validasi & log. |
| POST | `/api/peserta/:id/selesai` | Kunci kuis: server menarik 21 jawaban, **menghitung skor** (`versi_penilaian` dicatat), menyimpan ke `hasil_dass21`, memicu analisis LLM asinkron. Kembalikan `nomor_reg` saja — **tanpa skor**. |

### Admin (terproteksi)
| Metode | Jalur | Fungsi |
| --- | --- | --- |
| POST | `/api/admin/login` | Login → JWT. |
| GET | `/api/admin/statistik` | Total/selesai/belum + distribusi kategori. |
| GET | `/api/admin/peserta?q=&status=&kategori=&page=` | Daftar peserta (paginasi, cari, filter, urut). |
| GET | `/api/admin/peserta/:id` | Detail: identitas, keluhan, 21 jawaban, hasil skor, analisis LLM. |
| GET | `/api/admin/peserta/:id/pdf` | PDF individual (identitas, nomor reg, skor D/A/S + kategori, analisis keluhan, disclaimer). |
| GET | `/api/admin/ekspor/csv` | CSV satu baris per peserta (UTF-8 BOM): identitas, 21 jawaban, skor, kategori, kolom analisis LLM. |
| PATCH | `/api/admin/analisis/:pesertaId/review` | Tandai `risiko_flag` sudah direview manusia. |
| CRUD | `/api/admin/acara` | Event Page Builder: konfigurasi tampilan acara (nama, tema warna, media, jadwal buka/tutup), draft → publish, riwayat revisi, reset. **Tidak boleh menyentuh** modul skoring/keamanan. |

## Aturan LLM (wajib dipatuhi implementasi)

1. Kirim hanya: ID anonim + teks keluhan (bersih dari nama/NIM/HP/alamat — jalankan PII-scrubber sebelum kirim).
2. Prompt membatasi output: tema, emosi dominan, tanda perhatian, rangkuman, saran umum — **dilarang mendiagnosis, memberi label klinis, atau menyarankan obat**.
3. Deteksi frasa risiko diri → `risiko_flag = true`, hasil **tidak** otomatis dikirim ke peserta, wajib review manual admin.
4. Analisis LLM disimpan terpisah (`analisis_keluhan`) dan **tidak pernah** mengubah skor DASS-21.
5. Seluruh hasil tetap berupa "bukan diagnosis".

## Langkah pemasangan (saat siap dibangun)

1. Implementasi API sesuai `schema.sql` + tabel di atas; jalankan migrasi.
2. Pindahkan fungsi penyimpanan di `js/app.js` (bagian "TITIK INTEGRASI BACKEND") ke `fetch()` sesuai skema API.
3. Salin konstanta skoring dari `js/scoring.js` ke modul skoring server (satu sumber kebenaran: dokumen referensi resmi penyelenggara).
4. Aktifkan analisis LLM + generator PDF + ekspor CSV server-side.
5. Ganti tag "MODE DEMO" di halaman peserta/admin.
