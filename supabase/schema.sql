-- ============================================================
-- SKEMA DATABASE SUPABASE — SKRINING KESEHATAN MENTAL (DASS-21)
-- ------------------------------------------------------------
-- Cara pakai: buka Supabase Dashboard → SQL Editor → paste
-- seluruh isi file ini → Run. Berlaku untuk satu proyek acara.
--
-- KEAMANAN (Row Level Security):
--  - Peserta (anon) HANYA boleh MENYISIPKAN baris baru.
--  - Admin (authenticated via Supabase Auth) boleh membaca
--    dan menghapus data peserta.
--  - Pengaturan acara boleh dibaca semua orang, ditulis admin.
--  - Validasi jawaban (21 butir, nilai 0-3) dijalankan DATABASE,
--    bukan kepercayaan pada browser.
-- ============================================================

-- ---------- fungsi validasi jawaban ----------
create or replace function public.jawaban_valid(j jsonb)
returns boolean
language sql
stable
as $$
  select jsonb_typeof(j) = 'array'
     and jsonb_array_length(j) = 21
     and not exists (
       select 1 from jsonb_array_elements(j) el
       where el::text not in ('0', '1', '2', '3')
     )
$$;

-- ---------- tabel peserta ----------
create table if not exists public.peserta (
  id               uuid primary key default gen_random_uuid(),
  nomor_registrasi text  not null unique,
  nama             text  not null check (char_length(nama) between 1 and 120),
  alamat           text  check (alamat is null or char_length(alamat) <= 255),
  no_hp            text  check (no_hp is null or char_length(no_hp) <= 32),
  kategori         text  not null check (kategori in ('Mahasiswa', 'Dosen', 'Umum')),
  nim              text  check (nim is null or char_length(nim) <= 32),
  nip              text  check (nip is null or char_length(nip) <= 32),
  keluhan          text  check (keluhan is null or char_length(keluhan) <= 2000),
  jawaban          jsonb not null check (public.jawaban_valid(jawaban)),
  durasi_detik     integer check (durasi_detik is null or durasi_detik between 1 and 7200),
  perangkat        text  check (perangkat is null or char_length(perangkat) <= 400),
  dibuat_pada      timestamptz not null default now(),
  selesai_pada     timestamptz not null default now()
);

create index if not exists idx_peserta_waktu on public.peserta (dibuat_pada desc);
create index if not exists idx_peserta_kategori on public.peserta (kategori);

-- ---------- tabel pengaturan acara ----------
create table if not exists public.pengaturan (
  kunci       text primary key,
  nilai       text not null,
  diubah_pada timestamptz not null default now()
);

-- ---------- aktifkan Row Level Security ----------
alter table public.peserta enable row level security;
alter table public.pengaturan enable row level security;

-- peserta: anon boleh mendaftar (insert saja, tidak bisa lihat data orang lain)
drop policy if exists "anon_dapat_mendaftar" on public.peserta;
create policy "anon_dapat_mendaftar" on public.peserta
  for insert to anon with check (true);

-- peserta: admin (login Supabase) boleh melihat semua
drop policy if exists "admin_melihat_semua" on public.peserta;
create policy "admin_melihat_semua" on public.peserta
  for select to authenticated using (true);

-- peserta: admin boleh menghapus (koreksi data ganda)
drop policy if exists "admin_menghapus" on public.peserta;
create policy "admin_menghapus" on public.peserta
  for delete to authenticated using (true);

-- pengaturan: semua orang boleh MEMBACA (dipakai halaman peserta)
drop policy if exists "pengaturan_bisa_dibaca" on public.pengaturan;
create policy "pengaturan_bisa_dibaca" on public.pengaturan
  for select using (true);

-- pengaturan: hanya admin yang boleh menulis
drop policy if exists "admin_menyimpan_pengaturan" on public.pengaturan;
create policy "admin_menyimpan_pengaturan" on public.pengaturan
  for insert to authenticated with check (true);

drop policy if exists "admin_mengubah_pengaturan" on public.pengaturan;
create policy "admin_mengubah_pengaturan" on public.pengaturan
  for update to authenticated using (true) with check (true);

-- ============================================================
-- SELESAI. Langkah berikutnya:
-- 1. Authentication → Users → Add user (email + sandi admin)
-- 2. Settings → API → salin Project URL + anon public key
-- 3. Isi keduanya ke js/config.js (baris supabaseUrl/supabaseAnonKey)
-- Detail lengkap: supabase/SETUP.md
-- ============================================================
