/* ============================================================
   MODUL SKORING DASS-21
   ------------------------------------------------------------
   SUMBER RESMI (dokumen referensi penyelenggara, telah diterima
   dan diverifikasi kata-per-kata):
   • "DASS 21 Versi Indonesia UPA BK.pdf", halaman 3
     (SCORING DASS 21) — seluruh konstanta di bawah disalin
     PERSIS dari dokumen tersebut:
        1) Depresi   : total jawaban butir 3,5,10,13,16,17,21
                        dikali 2
        2) Kecemasan : total jawaban butir 2,4,7,9,15,19,20
                        dikali 2
        3) Stress    : total jawaban butir 1,6,8,11,12,14,18
                        dikali 2
     Tabel ambang (skor final, halaman 3 dokumen):
        Rating        Depresi   Kecemasan   Stress
        Normal        0-9       0-7         0-14
        Ringan        10-13     8-9         15-18
        Sedang        14-20     10-14       19-25
        Berat         21-27     15-19       26-33
        Sangat Berat  28+       20+         34+
   ------------------------------------------------------------
   PENTING — BACA SEBELUM MENGUBAH:
   1. Seluruh konstanta skoring dipusatkan di file ini agar mudah
      diaudit dan diganti. Tidak ada angka skoring yang tersebar
      di file lain.
   2. Konstanta di bawah TIDAK BOLEH diubah dari nilai dokumen
      referensi tanpa persetujuan penyelenggara — nomor butir,
      pengali x2, dan ambang di atas adalah kaidah resmi.
   3. Catatan produksi: pada versi final dengan backend, fungsi
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

  // Label persis dokumen referensi (tabel "SCORING DASS 21")
  const SUBSKALA_LABEL = {
    depresi: "Depresi",
    ansietas: "Kecemasan",
    stres: "Stress",
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
