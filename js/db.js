/* ============================================================
   LAPISAN DATA — demo (localStorage) / backend (Supabase)
   ------------------------------------------------------------
   Satu antarmuka dipakai halaman peserta (app.js) dan admin
   (admin.js). Mode ditentukan dari js/config.js:
   - supabaseUrl + supabaseAnonKey terisi → mode BACKEND
   - salah satu kosong → mode DEMO (localStorage)
   Di mode backend, data peserta disimpan lewat fungsi database
   daftar_peserta() yang memvalidasi ulang jawaban (21 butir,
   nilai 0-3) dan menentukan nomor registrasi di server.
   ============================================================ */

(function () {
  "use strict";

  const CFG = window.SITE_CONFIG;

  const SETTING_KEYS = ["namaAcara", "tanggalAcara", "lokasi", "penyelenggara",
    "kontak", "durasiLabel", "namaMaskot", "prefixNomor"];

  const EMAIL_KEY = "skrining_admin_email";

  const aktif = Boolean(
    CFG && CFG.supabaseUrl && CFG.supabaseAnonKey &&
    typeof window.supabase !== "undefined" && window.supabase.createClient
  );

  let client = null;
  if (aktif) {
    client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  }

  /* ---------- util ---------- */

  function keArrayJawaban(j) {
    if (Array.isArray(j)) return j;
    try { return JSON.parse(j); } catch (e) { return null; }
  }

  /* baris database → bentuk rekam yang sama dengan mode demo */
  function barisKeRekam(b) {
    const jaw = keArrayJawaban(b.jawaban);
    return {
      id: b.id,
      regNumber: b.nomor_registrasi,
      nama: b.nama,
      alamat: b.alamat || "",
      noHp: b.no_hp || "",
      kategori: b.kategori,
      nim: b.nim || "",
      nip: b.nip || "",
      keluhan: b.keluhan || "",
      jawaban: jaw,
      // skor selalu dihitung ulang dari jawaban mentah — bukan dipercaya dari klien
      hasil: window.DASS21Scoring ? window.DASS21Scoring.hitung(jaw) : null,
      status: "selesai",
      startedAt: b.dibuat_pada,
      completedAt: b.selesai_pada,
      durasiDetik: b.durasi_detik || null,
    };
  }

  function pesanError(e) {
    if (!e) return "Terjadi kesalahan tak terduga.";
    if (/Failed to fetch|NetworkError/i.test(e.message || "")) {
      return "Tidak bisa terhubung ke server. Periksa internet, lalu coba lagi.";
    }
    return e.message || "Terjadi kesalahan.";
  }

  /* ---------- API publik ---------- */

  const DB = {
    backend: aktif,

    /* --- pengaturan acara (mode backend: tabel pengaturan) --- */

    async muatPengaturan() {
      if (!aktif) return { ok: true };
      try {
        const { data, error } = await client
          .from("pengaturan")
          .select("kunci, nilai");
        if (error) throw error;
        (data || []).forEach(function (row) {
          if (typeof row.nilai === "string" && row.nilai !== "") {
            CFG[row.kunci] = row.nilai;
          }
        });
        window.dispatchEvent(new Event("pengaturan:berubah"));
        return { ok: true };
      } catch (e) {
        console.warn("muatPengaturan:", e);
        return { ok: false, error: pesanError(e) };
      }
    },

    async simpanPengaturan(obj) {
      if (!aktif) return { ok: true };
      try {
        const rows = SETTING_KEYS
          .filter(function (k) { return obj[k] !== undefined && obj[k] !== null; })
          .map(function (k) {
            return { kunci: k, nilai: String(obj[k]), diubah_pada: new Date().toISOString() };
          });
        if (!rows.length) return { ok: true };
        const { error } = await client
          .from("pengaturan")
          .upsert(rows, { onConflict: "kunci" });
        if (error) throw error;
        return { ok: true };
      } catch (e) {
        console.warn("simpanPengaturan:", e);
        return { ok: false, error: pesanError(e) };
      }
    },

    /* --- pengecekan kesiapan backend (tabel sudah dibuat?) --- */

    async cekSiap() {
      if (!aktif) return { ok: false, error: "Mode demo aktif." };
      try {
        const { error } = await client.from("pengaturan").select("kunci").limit(1);
        if (error) throw error;
        return { ok: true };
      } catch (e) {
        return { ok: false, error: pesanError(e) };
      }
    },

    /* --- peserta --- */

    async simpanPeserta(rec) {
      if (!aktif) return { ok: true };

      // Penyimpanan lewat fungsi daftar_peserta() di database:
      // validasi ulang di server + nomor registrasi ditentukan server
      // (anti bentrok antar HP, tidak bisa dimanipulasi dari browser).
      try {
        const { data, error } = await client.rpc("daftar_peserta", {
          p_nama: rec.nama,
          p_alamat: rec.alamat || null,
          p_no_hp: rec.noHp || null,
          p_kategori: rec.kategori,
          p_nim: rec.nim || null,
          p_nip: rec.nip || null,
          p_keluhan: rec.keluhan || null,
          p_jawaban: rec.jawaban,
          p_durasi_detik: rec.durasiDetik || null,
          p_perangkat: (navigator.userAgent || "").slice(0, 380),
        });
        if (error) throw error;
        return { ok: true, nomorRegistrasi: data };
      } catch (e) {
        return { ok: false, error: pesanError(e) };
      }
    },

    async muatSemuaPeserta() {
      if (!aktif) throw new Error("Mode demo: data dibaca dari localStorage.");
      const { data, error } = await client
        .from("peserta")
        .select("*")
        .order("dibuat_pada", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []).map(barisKeRekam);
    },

    async hapusPeserta(id) {
      if (!aktif) return { ok: true };
      try {
        const { error } = await client
          .from("peserta")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return { ok: true };
      } catch (e) {
        return { ok: false, error: pesanError(e) };
      }
    },

    /* --- autentikasi admin --- */

    async login(username, password) {
      if (!aktif) return { ok: false, error: "Mode demo aktif." };
      const email = String(username || "").trim();
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) {
        return { ok: false, error: "Email atau sandi salah." };
      }
      if (data && data.user) {
        try { localStorage.setItem(EMAIL_KEY, data.user.email || email); } catch (e) {}
      }
      return { ok: true };
    },

    async logout() {
      if (!aktif) return;
      try { await client.auth.signOut(); } catch (e) { /* abaikan */ }
    },

    async user() {
      if (!aktif) return null;
      try {
        const { data } = await client.auth.getUser();
        return (data && data.user) || null;
      } catch (e) { return null; }
    },

    async gantiSandi(sandiLama, sandiBaru) {
      if (!aktif) return { ok: false, error: "Mode demo aktif." };
      const email = (function () {
        try { return localStorage.getItem(EMAIL_KEY) || ""; } catch (e) { return ""; }
      })();
      if (!email) return { ok: false, error: "Sesi tidak ditemukan, silakan login ulang." };

      // verifikasi sandi lama dengan re-authentication sungguhan
      const re = await client.auth.signInWithPassword({ email: email, password: sandiLama });
      if (re.error) return { ok: false, error: "Kata sandi sekarang salah." };

      const up = await client.auth.updateUser({ password: sandiBaru });
      if (up.error) {
        if (/same|sama/i.test(up.error.message || "")) {
          return { ok: false, error: "Kata sandi baru sama dengan yang sekarang." };
        }
        return { ok: false, error: up.error.message || "Gagal mengganti sandi." };
      }
      return { ok: true };
    },
  };

  window.DB = DB;
})();
