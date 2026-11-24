/* ============================================================
   KONFIGURASI SITUS — SKRINING KESEHATAN MENTAL (DASS-21)
   ------------------------------------------------------------
   Nilai di bawah ini adalah DEFAULT. Petugas dapat mengubahnya
   langsung dari dashboard admin (tab "Pengaturan Acara");
   perubahan tersimpan di perangkat tersebut dan otomatis
   dipakai oleh halaman peserta di perangkat yang sama
   (lihat blok override di bagian bawah file ini).
   ============================================================ */

window.SITE_CONFIG = {
  // Identitas acara (tampil di landing page, laporan, dan ekspor)
  namaAcara: "Skrining Kesehatan Mental",
  penyelenggara: "Tim Skrining Kesehatan Mental",
  tanggalAcara: "Acara hari ini",
  lokasi: "",
  kontak: "Bingung? Panggil petugas di lokasi, ya.",

  // Awalan nomor registrasi, contoh hasil: SKR-20261124-001
  prefixNomor: "SKR",

  // Nama maskot pendamping (tampil di ucapan dan bubble dialog)
  namaMaskot: "Lumi",

  // Estimasi durasi skrining (tampil di landing page)
  durasiLabel: "± 7 menit",
};

/* ------------------------------------------------------------
   OVERRIDE dari Pengaturan Acara admin (localStorage).
   Kunci: skrining_event_settings_v1 — diisi oleh admin/admin.js.
   Di versi produksi (backend aktif), pengaturan datang dari
   tabel pengaturan di database, bukan localStorage.
   ------------------------------------------------------------ */
window.SITE_CONFIG_DEFAULT = Object.assign({}, window.SITE_CONFIG);

(function () {
  try {
    const s = JSON.parse(localStorage.getItem("skrining_event_settings_v1") || "null");
    if (s && typeof s === "object") {
      ["namaAcara", "tanggalAcara", "lokasi", "penyelenggara", "kontak",
       "durasiLabel", "namaMaskot", "prefixNomor"].forEach(function (k) {
        if (typeof s[k] === "string" && s[k].trim() !== "") {
          window.SITE_CONFIG[k] = s[k];
        }
      });
    }
  } catch (e) { /* abaikan — pakai default */ }
})();
