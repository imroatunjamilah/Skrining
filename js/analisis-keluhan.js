/* ============================================================
   MODUL ANALISIS KELUHAN — SKRINING KESEHATAN MENTAL (DASS-21)
   ------------------------------------------------------------
   Mengubah cerita bebas peserta menjadi: tema utama, nuansa
   emosi, ringkasan, saran tindak lanjut, dan tingkat perhatian.

   PRIVASI: analisis dihitung 100% DI PERANGKAT (browser petugas).
   Cerita peserta TIDAK dikirim ke layanan AI/LLM mana pun.
   Untuk acara sehari ini pendekatan kata kunci sudah memadai,
   transparan, dan bebas biaya; versi LLM bisa menyusul via
   Supabase Edge Functions bila penyelenggara menginginkannya.

   CATATAN: bukan diagnosis — hanya alat bantu petugas membaca
   cerita secara terstruktur. Keputusan akhir tetap di petugas.
   ============================================================ */

window.AnalisisKeluhan = (function () {
  "use strict";

  /* ---------- kamus tema (kata kunci huruf kecil, dicari substring) ---------- */

  const TEMA = [
    {
      nama: "Tidur terganggu",
      kata: ["tidur", "insomnia", "begadang", "bangun malam", "susah tidur", "sulit tidur", "mimpi buruk", "kurang tidur"],
      saran: "bantu peserta menyusun jadwal tidur yang konsisten dan mengurangi layar/kafein sebelum tidur; bila berlanjut, sarankan diskusi dengan konselor.",
    },
    {
      nama: "Kecemasan berlebih",
      kata: ["cemas", "khawatir", "panik", "takut", "deg-degan", "gelisah", "overthinking", "rasa takut", "worry"],
      saran: "ajarkan teknik napas tenang dan cara memecah kekhawatiran menjadi langkah kecil; tawarkan konseling bila sudah mengganggu aktivitas harian.",
    },
    {
      nama: "Suasana hati murung",
      kata: ["sedih", "murung", "nangis", "menangis", "galau", "hampa", "kosong", "putus asa", "menyesal", "sepi"],
      saran: "dorong aktivitas kecil yang dulu menyenangkan dan jaga koneksi dengan orang terdekat; pantau suasana hati dalam beberapa hari ke depan.",
    },
    {
      nama: "Kelelahan & energi rendah",
      kata: ["lelah", "capek", "letih", "kelelahan", "lemas", "malas", "tidak ada tenaga", "habis energi", "burnout"],
      saran: "periksa pola istirahat, makan, dan beban aktivitas; anjurkan jeda terjadwal serta aktivitas fisik ringan.",
    },
    {
      nama: "Beban tugas & pekerjaan",
      kata: ["tugas", "kuliah", "ujian", "deadline", "skripsi", "belajar", "pekerjaan", "kerja", "presentasi", "nilai", "bimbingan", "responsi", "praktikum", "makalah"],
      saran: "bantu memecah beban menjadi prioritas harian yang kecil; bicarakan opsi penyesuaian waktu atau bantuan akademik bila menumpuk.",
    },
    {
      nama: "Sulit berkonsentrasi",
      kata: ["fokus", "konsentrasi", "sering lupa", "melamun", "sulit memusatkan", "bingung"],
      saran: "sarankan cara kerja pendek dengan jeda (misal 25 menit fokus), kurangi multitasking, dan pastikan tidur cukup.",
    },
    {
      nama: "Mudah tersinggung & emosi",
      kata: ["marah", "emosi", "tersinggung", "kesal", "baper", "iritasi", "pemarah", "gampang kesal"],
      saran: "ajak mengenali pemicu emosinya dan beri jeda sebelum merespons; jurnal emosi sederhana bisa membantu.",
    },
    {
      nama: "Menarik diri & kesepian",
      kata: ["menyendiri", "sendiri", "bergaul", "malu", "asing", "kesepian", "tidak mau ketemu", "tak mau bertemu", "diam saja"],
      saran: "mulai dari interaksi kecil yang aman; hubungkan dengan komunitas atau kegiatan kampus yang sesuai minatnya.",
    },
    {
      nama: "Keluhan fisik",
      kata: ["pusing", "sakit kepala", "mual", "debar", "berdebar", "sesak", "napas pendek", "sakit perut", "pegal", "leher kaku", "keringat dingin"],
      saran: "periksa faktor fisik dasar (tidur, makan, aktivitas); bila keluhan fisik berlanjut, anjurkan pemeriksaan kesehatan umum.",
    },
    {
      nama: "Kehilangan minat & semangat",
      kata: ["tidak semangat", "nggak semangat", "gak semangat", "ga semangat", "tidak menikmati", "tidak nyenengin", "hambar", "biasa saja", "tidak berminat", "bosan", "tidak ada yang menyenangkan"],
      saran: "jadwalkan aktivitas kecil yang memberi rasa berhasil; hindari menuntut perubahan besar sekaligus.",
    },
    {
      nama: "Pandangan buruk pada diri",
      kata: ["gagal", "tidak berguna", "tidak berharga", "mengecewakan", "bodoh", "beban", "hanya menyusahkan", "menyalahkan diri", "kecewa pada diri", "banyak salah"],
      saran: "bantu peserta mencatat bukti pencapaian kecil dan menantang pikiran kritisnya; ini topik yang baik untuk sesi konseling.",
    },
    {
      nama: "Rindu rumah & keluarga",
      kata: ["kangen", "rindu", "keluarga", "rumah", "orang tua", "ibu", "ayah"],
      saran: "fasilitasi jadwal komunikasi rutin dengan keluarga dan koneksi sosial baru di sekitarnya.",
    },
  ];

  /* peta tema -> nuansa emosi (untuk kalimat emosi dominan) */
  const EMOSI_DARI_TEMA = {
    "Kecemasan berlebih": "cemas dan khawatir",
    "Suasana hati murung": "murung dan sedih",
    "Mudah tersinggung & emosi": "mudah tersinggung",
    "Kelelahan & energi rendah": "lelah dan lesu",
    "Kehilangan minat & semangat": "apatis atau kehilangan minat",
  };

  /* kata pemberat (menaikkan tingkat perhatian) */
  const INTENSIFIKASI = ["sangat", "selalu", "setiap hari", "terus-menerus", "terus menerus", "berminggu", "dua minggu", "parah", "sejak lama"];

  /* kata bahaya (langsung prioritas) */
  const REDFLAG = [
    "putus asa", "tidak berharga", "tidak berguna", "hanya beban", "tidak ada gunanya",
    "tidak makan", "tidur semalaman", "berminggu-minggu", "tidak bisa apa-apa",
    "lebih baik tidak ada", "hilang saja", "menyalahkan diri",
  ];

  const TINGKAT_LABEL = [
    "Pantau ringan — masih dalam batas wajar",
    "Perlu perhatian — buka percakapan lanjutan",
    "Prioritas — tawarkan konseling segera",
  ];

  /* ---------- util ---------- */

  function cariKata(teks, daftar) {
    const ketemu = [];
    daftar.forEach(function (k) {
      if (teks.indexOf(k) !== -1) ketemu.push(k);
    });
    return ketemu;
  }

  function jumlahKata(teks) {
    const t = teks.replace(/\s+/g, " ").trim();
    return t ? t.split(" ").length : 0;
  }

  /* kategori terberat dari hasil skoring (bila ada) */
  function kategoriTerberat(hasil) {
    const urutan = ["Normal", "Ringan", "Sedang", "Berat", "Sangat Berat"];
    let idx = -1;
    if (hasil && hasil.perSubskala) {
      Object.keys(hasil.perSubskala).forEach(function (sub) {
        const kat = hasil.perSubskala[sub].kategori;
        const i = urutan.indexOf(kat);
        if (i > idx) idx = i;
      });
    }
    return idx >= 0 ? urutan[idx] : null;
  }

  /* ---------- analisis satu peserta ---------- */

  function analisis(teks, hasil) {
    const t = String(teks || "").replace(/\s+/g, " ").trim();
    if (!t) {
      return { ada: false, tema: [], emosi: "", ringkasan: "", saran: "", tingkat: { level: 0, label: TINGKAT_LABEL[0] } };
    }
    const lower = t.toLowerCase();

    /* tema terdeteksi: jumlah kata kunci unik per tema */
    const temaDetail = [];
    TEMA.forEach(function (th) {
      const kataKetemu = cariKata(lower, th.kata);
      if (kataKetemu.length > 0) {
        temaDetail.push({ nama: th.nama, kata: kataKetemu, saran: th.saran, jml: kataKetemu.length });
      }
    });
    temaDetail.sort(function (a, b) { return b.jml - a.jml; });
    const namaTema = temaDetail.map(function (d) { return d.nama; });

    /* nuansa emosi */
    const nuansa = [];
    namaTema.forEach(function (n) {
      const e = EMOSI_DARI_TEMA[n];
      if (e && nuansa.indexOf(e) === -1) nuansa.push(e);
    });
    let emosi;
    if (nuansa.length >= 2) emosi = "Campur — lebih dari satu nuansa (" + nuansa.join(", ") + ")";
    else if (nuansa.length === 1) emosi = nuansa[0].charAt(0).toUpperCase() + nuansa[0].slice(1);
    else emosi = "Netral — tidak ada nuansa khas yang terdeteksi dari cerita";

    /* pemberat & bahaya */
    const intens = cariKata(lower, INTENSIFIKASI);
    const redflag = cariKata(lower, REDFLAG);

    /* tingkat perhatian (gabung dengan hasil skoring bila ada) */
    const katMax = kategoriTerberat(hasil);
    let level = 0;
    if (redflag.length > 0 || katMax === "Berat" || katMax === "Sangat Berat") level = 2;
    else if (intens.length > 0 || namaTema.length >= 3 || katMax === "Sedang") level = 1;

    /* ringkasan */
    let ringkasan;
    if (namaTema.length === 0) {
      ringkasan = "Cerita " + jumlahKata(t) + " kata belum memuat tema kesehatan mental yang khas. " +
        "Baca langsung ceritanya untuk memastikan tidak ada hal yang terlewat oleh pencarian kata kunci.";
    } else {
      ringkasan = "Dari cerita " + jumlahKata(t) + " kata terdeteksi " + namaTema.length +
        " tema utama: " + namaTema.slice(0, 3).join(", ") +
        (namaTema.length > 3 ? " (dan " + (namaTema.length - 3) + " lainnya)." : ".") +
        (intens.length > 0 ? " Terdapat kata yang menunjukkan intensitas tinggi (" + intens.slice(0, 3).join(", ") + ")." : "") +
        (redflag.length > 0 ? " Terdapat pernyataan berisiko yang wajib dibaca teliti oleh petugas." : "");
    }

    /* saran: gabungkan saran dari 2 tema teratas */
    let saran;
    if (temaDetail.length === 0) {
      saran = "Dengarkan cerita peserta tanpa menghakimi; tawarkan sesi konseling bila ada keluhan lanjutan.";
    } else {
      saran = temaDetail.slice(0, 2).map(function (d) { return d.saran; }).join(" Selain itu, ");
    }

    return {
      ada: true,
      tema: namaTema,
      temaDetail: temaDetail,
      emosi: emosi,
      ringkasan: ringkasan,
      saran: saran,
      tingkat: { level: level, label: TINGKAT_LABEL[level] },
      katMax: katMax,
    };
  }

  /* ---------- agregat untuk dashboard ---------- */

  function agregat(records) {
    const hitung = {};
    let jumlah = 0;
    let prioritas = 0;
    (records || []).forEach(function (r) {
      if (!r.keluhan || !String(r.keluhan).trim()) return;
      jumlah += 1;
      const A = analisis(r.keluhan, r.hasil);
      if (A.tingkat.level === 2) prioritas += 1;
      A.tema.forEach(function (n) {
        hitung[n] = (hitung[n] || 0) + 1;
      });
    });
    const tema = Object.keys(hitung).map(function (n) {
      return { nama: n, jumlah: hitung[n] };
    }).sort(function (a, b) { return b.jumlah - a.jumlah; });
    return { jumlah: jumlah, tema: tema, prioritas: prioritas };
  }

  return { analisis: analisis, agregat: agregat, TINGKAT_LABEL: TINGKAT_LABEL };
})();
