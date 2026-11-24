-- ============================================================
-- SKEMA DATABASE — SKRINING KESEHATAN MENTAL (DASS-21)
-- ------------------------------------------------------------
-- 6 tabel inti sesuai spesifikasi penyelenggara:
--   1. admins            : akun petugas/admin
--   2. peserta           : identitas + status skrining
--   3. jawaban_dass21    : jawaban per butir (1-21)
--   4. hasil_dass21      : hasil perhitungan skor (backend)
--   5. analisis_keluhan  : hasil analisis LLM atas keluhan
--   6. log_aktivitas     : jejak audit seluruh aktivitas
--
-- Dialek: PostgreSQL. Untuk MySQL/MariaDB, ganti SERIAL/BIGSERIAL
-- dengan BIGINT AUTO_INCREMENT, UUID dengan CHAR(36), dan
-- JSONB dengan JSON. Indeks dan foreign key tetap sama.
--
-- PRINSIP KEAMANAN:
-- - Nama/alamat/HP TIDAK PERNAH dikirim ke LLM. Analisis keluhan
--   hanya menerima ID ANONIM (analisis_keluhan.peserta_ref).
-- - Skor DASS-21 dihitung dan disimpan OLEH SERVER, bukan klien.
-- - Tidak ada data psikologi yang tampil tanpa autentikasi admin.
-- ============================================================

CREATE TABLE admins (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt/argon2
  nama_lengkap  VARCHAR(150) NOT NULL,
  aktif         BOOLEAN      NOT NULL DEFAULT TRUE,
  dibuat_pada   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE peserta (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_reg      VARCHAR(32)  NOT NULL UNIQUE,   -- contoh: SKR-20261124-001
  nama           VARCHAR(150) NOT NULL,
  alamat         VARCHAR(300) NOT NULL,
  no_hp          VARCHAR(20)  NOT NULL,
  kategori       VARCHAR(16)  NOT NULL CHECK (kategori IN ('Mahasiswa','Dosen','Umum')),
  nim            VARCHAR(20)  NULL,              -- wajib jika Mahasiswa
  nip            VARCHAR(20)  NULL,              -- wajib jika Dosen
  keluhan        TEXT         NULL,              -- cerita bebas peserta
  status         VARCHAR(16)  NOT NULL DEFAULT 'belum'
                 CHECK (status IN ('belum','selesai')),
  setuju         BOOLEAN      NOT NULL DEFAULT TRUE, -- informed consent
  mulai_pada     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  selesai_pada   TIMESTAMPTZ  NULL,
  durasi_detik   INTEGER      NULL,
  ip_registrasi  VARCHAR(45)  NULL,
  dibuat_pada    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cek_nim CHECK (
    (kategori = 'Mahasiswa' AND nim IS NOT NULL) OR kategori <> 'Mahasiswa'
  ),
  CONSTRAINT cek_nip CHECK (
    (kategori = 'Dosen' AND nip IS NOT NULL) OR kategori <> 'Dosen'
  )
);

-- Cegah pendaftaran ganda dengan nomor HP yang sama pada satu hari
CREATE UNIQUE INDEX uq_peserta_hp_hari
  ON peserta (no_hp, DATE(mulai_pada));

CREATE TABLE jawaban_dass21 (
  id           BIGSERIAL PRIMARY KEY,
  peserta_id   UUID NOT NULL REFERENCES peserta(id) ON DELETE CASCADE,
  nomor_butir  SMALLINT NOT NULL CHECK (nomor_butir BETWEEN 1 AND 21),
  nilai        SMALLINT NOT NULL CHECK (nilai BETWEEN 0 AND 3),
  dijawab_pada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (peserta_id, nomor_butir)
);

CREATE INDEX idx_jawaban_peserta ON jawaban_dass21 (peserta_id);

CREATE TABLE hasil_dass21 (
  id                BIGSERIAL PRIMARY KEY,
  peserta_id        UUID NOT NULL UNIQUE REFERENCES peserta(id) ON DELETE CASCADE,
  depresi_mentah    SMALLINT NOT NULL CHECK (depresi_mentah BETWEEN 0 AND 21),
  depresi_final     SMALLINT NOT NULL CHECK (depresi_final BETWEEN 0 AND 42),
  depresi_kategori  VARCHAR(24) NOT NULL,
  ansietas_mentah   SMALLINT NOT NULL CHECK (ansietas_mentah BETWEEN 0 AND 21),
  ansietas_final    SMALLINT NOT NULL CHECK (ansietas_final BETWEEN 0 AND 42),
  ansietas_kategori VARCHAR(24) NOT NULL,
  stres_mentah      SMALLINT NOT NULL CHECK (stres_mentah BETWEEN 0 AND 21),
  stres_final       SMALLINT NOT NULL CHECK (stres_final BETWEEN 0 AND 42),
  stres_kategori    VARCHAR(24) NOT NULL,
  versi_penilaian   VARCHAR(32) NOT NULL,       -- identitas dokumen/konstanta skoring yang dipakai
  dihitung_pada     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analisis_keluhan (
  id                BIGSERIAL PRIMARY KEY,
  peserta_id        UUID NOT NULL UNIQUE REFERENCES peserta(id) ON DELETE CASCADE,
  peserta_ref       VARCHAR(32) NOT NULL,       -- ID ANONIM yang dikirim ke LLM (bukan nama/HP)
  tema              VARCHAR(200) NULL,          -- tema utama keluhan
  emosi_dominan     VARCHAR(120) NULL,
  tanda_perhatian   TEXT NULL,                  -- hal yang perlu diperhatikan (bukan diagnosis)
  rangkuman         TEXT NULL,
  saran_tindak      TEXT NULL,                  -- saran tindak lanjut umum
  risiko_flag       BOOLEAN NOT NULL DEFAULT FALSE, -- penanda risiko diri -> WAJIB review manual
  sudah_direview    BOOLEAN NOT NULL DEFAULT FALSE,
  direview_oleh     BIGINT NULL REFERENCES admins(id),
  model_llm         VARCHAR(64) NULL,
  dibuat_pada       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE log_aktivitas (
  id          BIGSERIAL PRIMARY KEY,
  peserta_id  UUID NULL REFERENCES peserta(id) ON DELETE SET NULL,
  aktor       VARCHAR(32) NOT NULL,             -- 'peserta' | 'admin:<username>' | 'sistem'
  aksi        VARCHAR(48) NOT NULL,             -- registrasi, mulai_kuis, jawab_butir, selesai, login_admin, ekspor_csv, dsb
  detail      JSONB NULL,
  ip          VARCHAR(45) NULL,
  pada        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_log_peserta ON log_aktivitas (peserta_id);
CREATE INDEX idx_log_waktu   ON log_aktivitas (pada);

-- ============================================================
-- CATATAN INTEGRITAS:
-- 1. Nomor registrasi unik per peserta (uq di peserta.nomor_reg).
-- 2. Satu peserta = satu baris hasil_dass21 dan analisis_keluhan
--    (UNIQUE peserta_id).
-- 3. Jawaban 21 butir unik per peserta (UNIQUE peserta_id+nomor).
-- 4. Penghapusan peserta merambat ke jawaban/hasil/analisis
--    (ON DELETE CASCADE) dan menetralkan log (SET NULL).
-- ============================================================
