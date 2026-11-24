/* ============================================================
   MODUL SKORING DASS-21
   ------------------------------------------------------------
   PENTING — BACA SEBELUM MENGUBAH:
   1. Seluruh konstanta skoring dipusatkan di file ini agar mudah
      diaudit dan diganti. Tidak ada angka skoring yang tersebar
      di file lain.
   2. Versi saat ini menggunakan metode standar publikasi resmi
      DASS (Lovibond & Lovibond, 1995):
        - Skor mentah  = jumlah jawaban 7 butir per subskala
        - Skor final   = skor mentah x 2 (setara DASS-42)
        - Kategori     = ambang severity tabel resmi DASS
   3. Sesuai kesepakatan dengan penyelenggara: selama dokumen
      referensi resmi belum diterima, modul ini memakai ambang
      standar di atas. JIKA dokumen referensi berbeda, cukup
      ganti konstanta SUBSKALA_ITEMS, MULTIPLIER, dan AMBANG
      di bawah — logika perhitungan tidak perlu disentuh.
   4. Catatan produksi: pada versi final dengan backend, fungsi
      hitung() HARUS dijalankan ulang di server (source of
      truth) — skor dari klien tidak boleh dipercaya mentah-
      mentah. Lihat /server/README.md.
   ============================================================ */

window.DASS21Scoring = (function () {
  "use strict";

  // Pemetaan butir per subskala (formulir resmi DASS-21)
  const SUBSKALA_ITEMS = {
    depresi: [3, 5, 10, 13, 16, 17, 21],
    ansietas: [2, 4, 7, 9, 15, 19, 20],
    stres: [1, 6, 8, 11, 12, 14, 18],
  };

  // Pengali skor mentah menjadi skor final (setara DASS-42)
  const MULTIPLIER = 2;

  // Ambang severity standar (skor FINAL, hasil x2)
  // Format: [batasAtas, label] — batasAtas termasuk (<=).
  const AMBANG = {
    depresi: [
      [9, "Normal"],
      [13, "Ringan"],
      [20, "Sedang"],
      [27, "Berat"],
      [42, "Sangat Berat"],
    ],
    ansietas: [
      [7, "Normal"],
      [9, "Ringan"],
      [14, "Sedang"],
      [19, "Berat"],
      [42, "Sangat Berat"],
    ],
    stres: [
      [14, "Normal"],
      [18, "Ringan"],
      [25, "Sedang"],
      [33, "Berat"],
      [42, "Sangat Berat"],
    ],
  };

  const SUBSKALA_LABEL = {
    depresi: "Depresi",
    ansietas: "Ansietas",
    stres: "Stres",
  };

  function kategoriDariSkor(subskala, skorFinal) {
    const tabel = AMBANG[subskala] || [];
    for (var i = 0; i < tabel.length; i++) {
      if (skorFinal <= tabel[i][0]) return tabel[i][1];
    }
    return "Di luar rentang";
  }

  /**
   * Menghitung hasil DASS-21 dari array jawaban.
   * @param {Array<number|null>} jawaban - array 21 elemen (indeks 0 = butir 1),
   *        berisi nilai 0..3. Butir yang belum dijawab dihitung 0
   *        HANYA bila opsi partial diizinkan; pada alur utama kuis,
   *        semua butir wajib terjawab sebelum fungsi ini dipanggil.
   * @param {Object} [opsi] - { partial: boolean }
   * @returns {Object|null} hasil per subskala, atau null bila tidak lengkap.
   */
  function hitung(jawaban, opsi) {
    opsi = opsi || {};
    if (!Array.isArray(jawaban) || jawaban.length !== 21) return null;

    const belumDijawab = jawaban.filter(function (v) {
      return v === null || v === undefined || v === "";
    }).length;

    if (belumDijawab > 0 && !opsi.partial) return null;

    const hasil = { lengkap: belumDijawab === 0, perSubskala: {}, timestamp: null };

    Object.keys(SUBSKALA_ITEMS).forEach(function (sub) {
      const nomorButir = SUBSKALA_ITEMS[sub];
      let mentah = 0;
      nomorButir.forEach(function (no) {
        const v = jawaban[no - 1];
        const nilai = (v === null || v === undefined || v === "") ? 0 : Number(v);
        if (nilai >= 0 && nilai <= 3) mentah += nilai;
      });
      const final = mentah * MULTIPLIER;
      hasil.perSubskala[sub] = {
        label: SUBSKALA_LABEL[sub],
        butir: nomorButir,
        mentah: mentah,
        final: final,
        kategori: kategoriDariSkor(sub, final),
      };
    });

    try { hasil.timestamp = new Date().toISOString(); } catch (e) { /* noop */ }
    return hasil;
  }

  /**
   * Validasi cepat: semua 21 jawaban bernilai 0..3.
   */
  function jawabanLengkap(jawaban) {
    if (!Array.isArray(jawaban) || jawaban.length !== 21) return false;
    return jawaban.every(function (v) {
      return v !== null && v !== undefined && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 3;
    });
  }

  // Ekspos konstanta untuk audit & penyesuaian dokumen referensi
  return {
    hitung: hitung,
    jawabanLengkap: jawabanLengkap,
    konstanta: { SUBSKALA_ITEMS: SUBSKALA_ITEMS, MULTIPLIER: MULTIPLIER, AMBANG: AMBANG },
  };
})();
