-- ============================================================
-- PERBAIKAN SEKALI PAKAI — SKRINING KESEHATAN MENTAL (DASS-21)
-- ------------------------------------------------------------
-- Kapan dipakai: tabel peserta/pengaturan SUDAH pernah dibuat
-- tetapi belum berjalan benar (mis. dibuat manual lewat Table
-- Editor, atau dibuat sebelum pembaruan izin/GRANT).
--
-- Yang dilakukan: MENGHAPUS tabel lama beserta isinya, lalu
-- membuat ulang struktur + keamanan + izin yang benar.
--
-- PENTING: hanya aman SEBELUM ada data peserta nyata.
-- Setelah acara berjalan, JANGAN jalankan file ini.
-- ============================================================

drop table if exists public.peserta cascade;
drop table if exists public.pengaturan cascade;

-- ============ STRUKTUR LENGKAP (sama dengan schema.sql) ============
-- ============================================================
-- SKEMA DATABASE SUPABASE — SKRINING KESEHATAN MENTAL (DASS-21)
-- ------------------------------------------------------------
-- Cara pakai: Supabase Dashboard → SQL Editor → New query →
-- paste seluruh isi file ini → Run. Aman dijalankan ulang
-- (tidak menghapus data yang sudah ada).
--
-- CARA KERJA KEAMANAN (Row Level Security):
--  - Peserta (anon) TIDAK diberi akses langsung ke tabel.
--    Penyimpanan hanya lewat fungsi daftar_peserta() yang
--    memvalidasi ulang semua data di database dan menentukan
--    nomor registrasi (anti bentrok antar HP).
--  - Admin (authenticated via Supabase Auth) boleh membaca
--    dan menghapus data peserta.
--  - Pengaturan acara boleh dibaca semua orang, ditulis admin.
-- ============================================================

-- ---------- 1) Validasi jawaban (21 butir, nilai 0-3) ----------
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

-- ---------- 2) Tabel peserta ----------
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

-- ---------- 3) Tabel pengaturan acara ----------
create table if not exists public.pengaturan (
  kunci       text primary key,
  nilai       text not null,
  diubah_pada timestamptz not null default now()
);

-- ---------- 4) Fungsi pendaftaran (dipakai halaman peserta) ----------
-- Semua data divalidasi ulang DI DATABASE; browser tidak dipercaya.
-- Nomor registrasi ditentukan server sehingga tidak mungkin bentrok.
create or replace function public.daftar_peserta(
  p_nama         text,
  p_alamat       text    default null,
  p_no_hp        text    default null,
  p_kategori     text    default null,
  p_nim          text    default null,
  p_nip          text    default null,
  p_keluhan      text    default null,
  p_jawaban      jsonb   default null,
  p_durasi_detik integer default null,
  p_perangkat    text    default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_nomor  text;
  v_loop   int;
begin
  -- validasi field wajib dengan pesan berbahasa Indonesia
  if p_nama is null or btrim(p_nama) = '' or char_length(btrim(p_nama)) > 120 then
    raise exception 'Nama wajib diisi (maksimal 120 huruf).';
  end if;
  if p_kategori not in ('Mahasiswa', 'Dosen', 'Umum') then
    raise exception 'Kategori harus salah satu dari: Mahasiswa, Dosen, Umum.';
  end if;
  if p_jawaban is null or public.jawaban_valid(p_jawaban) = false then
    raise exception 'Jawaban harus tepat 21 butir dengan nilai 0-3.';
  end if;

  -- prefix nomor dari pengaturan acara (default SKR)
  select coalesce(nullif(btrim(nilai), ''), 'SKR') into v_prefix
    from public.pengaturan where kunci = 'prefixNomor' limit 1;
  v_prefix := coalesce(v_prefix, 'SKR');

  -- nomor registrasi: PREFIX-TANGGAL-ANGKA; diulang bila bentrok
  for v_loop in 1..6 loop
    v_nomor := v_prefix
      || '-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD')
      || '-' || lpad((floor(random() * 899) + 101)::text, 3, '0');
    begin
      insert into public.peserta (
        nomor_registrasi, nama, alamat, no_hp, kategori, nim, nip,
        keluhan, jawaban, durasi_detik, perangkat
      ) values (
        v_nomor,
        btrim(p_nama),
        left(coalesce(p_alamat, ''), 255),
        left(coalesce(p_no_hp, ''), 32),
        p_kategori,
        left(coalesce(p_nim, ''), 32),
        left(coalesce(p_nip, ''), 32),
        left(coalesce(p_keluhan, ''), 2000),
        p_jawaban,
        case when p_durasi_detik is null then null
             else greatest(1, least(7200, p_durasi_detik)) end,
        left(coalesce(p_perangkat, ''), 400)
      );
      return v_nomor;
    exception
      when unique_violation then
        -- nomor bentrok (sangat jarang) → buat nomor baru, coba lagi
        null;
    end;
  end loop;

  raise exception 'Gagal membuat nomor registrasi. Coba lagi.';
end;
$$;

-- ---------- 5) Row Level Security ----------
alter table public.peserta enable row level security;
alter table public.pengaturan enable row level security;

-- peserta: TIDAK ada akses langsung untuk publik — penyimpanan hanya
-- lewat fungsi daftar_peserta(). Admin boleh melihat dan menghapus:
drop policy if exists "anon_dapat_mendaftar" on public.peserta;
drop policy if exists "admin_melihat_semua" on public.peserta;
create policy "admin_melihat_semua" on public.peserta
  for select to authenticated using (true);

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

-- ---------- 6) Izin akses (GRANT) ----------
-- Tanpa GRANT ini, kunci publishable mendapat "permission denied".
grant usage on schema public to anon, authenticated;

-- pengaturan: publik boleh baca; admin boleh baca + tulis
grant select on public.pengaturan to anon, authenticated;
grant insert, update on public.pengaturan to authenticated;

-- peserta: hanya admin yang menyentuh tabel langsung
grant select, delete on public.peserta to authenticated;

-- halaman peserta menyimpan data lewat fungsi ini saja
grant execute on function public.daftar_peserta(
  text, text, text, text, text, text, text, jsonb, integer, text
) to anon, authenticated;

-- ============================================================
-- SELESAI. Langkah berikutnya:
-- 1. Authentication → Users → Add user (email + sandi admin)
-- 2. Uji end-to-end (lihat supabase/SETUP.md Langkah 6)
-- ============================================================
