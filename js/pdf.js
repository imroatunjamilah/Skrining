/* ============================================================
   MODUL PDF — SKRINING KESEHATAN MENTAL (DASS-21)
   ------------------------------------------------------------
   Membuat dokumen PDF langsung di browser (jsPDF, tanpa server):
   1. lengkap(rec, cfg) — lembar hasil untuk PETUGAS: identitas,
      skor D/A/S + kategori + interpretasi, keluhan, dan analisis
      keluhan otomatis.
   2. bukti(rec, cfg) — bukti skrining untuk PESERTA: hanya nomor
      registrasi + info singkat, TANPA skor (sesuai kebijakan
      privasi: skor hanya dibaca petugas).

   Skor pada PDF selalu dihitung ulang dari jawaban mentah di
   sisi petugas (window.DASS21Scoring) — bukan dipercaya mentah.
   ============================================================ */

window.PdfHasil = (function () {
  "use strict";

  /* ---------- palet warna (RGB 0-255) ---------- */

  const W = {
    ungu: [91, 33, 182],
    ungu2: [124, 58, 237],
    teks: [51, 65, 85],
    abu: [100, 116, 139],
    garis: [224, 219, 245],
    latar: [248, 247, 255],
    putih: [255, 255, 255],
  };
  const W_KAT = {
    "Normal": [5, 150, 105],
    "Ringan": [217, 119, 6],
    "Sedang": [234, 88, 12],
    "Berat": [220, 38, 38],
    "Sangat Berat": [153, 27, 27],
    "Di luar rentang": [100, 116, 139],
  };

  /* interpretasi ringkas per subskala x kategori */
  const INTERPRETASI = {
    depresi: {
      Normal: "Tidak ada indikasi gejala depresi pada minggu terakhir.",
      Ringan: "Beberapa gejala ringan — pantau perkembangan dan dorong pola hidup sehat.",
      Sedang: "Gejala tingkat sedang — anjurkan sesi konseling dalam waktu dekat.",
      Berat: "Gejala tingkat berat — prioritaskan tindak lanjut konseling segera.",
      "Sangat Berat": "Gejala sangat berat — hubungi peserta hari ini juga dan tawarkan pendampingan intensif.",
    },
    ansietas: {
      Normal: "Tidak ada indikasi kecemasan berarti pada minggu terakhir.",
      Ringan: "Kecemasan ringan — cukup dipantau; berikan tips mengelola stres harian.",
      Sedang: "Kecemasan tingkat sedang — anjurkan konseling dan teknik relaksasi.",
      Berat: "Kecemasan tingkat berat — prioritaskan tindak lanjut konseling segera.",
      "Sangat Berat": "Kecemasan sangat berat — hubungi peserta hari ini juga untuk pendampingan intensif.",
    },
    stres: {
      Normal: "Tingkat tekanan (stress) dalam batas wajar pada minggu terakhir.",
      Ringan: "Tekanan ringan — dorong pengaturan beban dan istirahat yang baik.",
      Sedang: "Tekanan tingkat sedang — anjurkan konseling serta penataan beban aktivitas.",
      Berat: "Tekanan tingkat berat — prioritaskan tindak lanjut konseling segera.",
      "Sangat Berat": "Tekanan sangat berat — hubungi peserta hari ini juga untuk pendampingan intensif.",
    },
  };

  const SUB_URUT = ["depresi", "ansietas", "stres"];

  /* ---------- util dasar ---------- */

  function j() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("Modul PDF (jsPDF) belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
    }
    return new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  }

  function fmtTgl(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      const p = function (n) { return (n < 10 ? "0" : "") + n; };
      return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
        " " + p(d.getHours()) + ":" + p(d.getMinutes());
    } catch (e) { return "-"; }
  }

  function fmtDurasi(detik) {
    if (!detik || detik <= 0) return "-";
    const m = Math.floor(detik / 60);
    const s = detik % 60;
    const p = function (n) { return (n < 10 ? "0" : "") + n; };
    return m + " menit " + p(s) + " detik";
  }

  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 40) || "peserta";
  }

  function rentangTeks(sub, kat) {
    const K = window.DASS21Scoring && window.DASS21Scoring.konstanta;
    if (!K || !K.AMBANG[sub]) return "-";
    const bands = K.AMBANG[sub];
    for (let i = 0; i < bands.length; i++) {
      if (bands[i][1] === kat) {
        const bawah = i === 0 ? 0 : bands[i - 1][0] + 1;
        return kat === "Sangat Berat" ? bawah + "+" : bawah + "-" + bands[i][0];
      }
    }
    return "-";
  }

  /* ---------- blok layout ---------- */

  function bandHeader(doc, cfg, judul, sub) {
    doc.setFillColor(W.ungu[0], W.ungu[1], W.ungu[2]);
    doc.rect(0, 0, 210, 30, "F");
    doc.setFillColor(W.ungu2[0], W.ungu2[1], W.ungu2[2]);
    doc.rect(0, 30, 210, 1.4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14.5);
    doc.text(judul, 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text((cfg.namaAcara || "Skrining Kesehatan Mental") + "  |  " + (cfg.penyelenggara || "-"), 14, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(sub || "", 196, 13, { align: "right" });
    doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
    return 40;
  }

  function footer(doc, cfg, pageNo, dicetakInfo) {
    doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
    doc.setLineWidth(0.2);
    doc.line(14, 285, 196, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
    doc.text(
      "Skrining DASS-21 — hasil bukan diagnosis. Dokumen rahasia, hanya untuk petugas berwenang.",
      14, 290
    );
    if (dicetakInfo) doc.text(dicetakInfo, 14, 293.5);
    doc.text("Hal. " + pageNo, 196, 290, { align: "right" });
    void cfg;
  }

  function secLabel(doc, y, teks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(W.ungu[0], W.ungu[1], W.ungu[2]);
    doc.text(teks, 14, y);
    doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, 196, y + 2);
    doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
    return y + 8;
  }

  /* grid identitas 2 kolom; kembalikan y setelah blok */
  function infoGrid(doc, startY, pairs, cfg, state) {
    let y = startY;
    for (let i = 0; i < pairs.length; i += 2) {
      if (y > 252) { footer(doc, cfg, state.pageNo); doc.addPage(); state.pageNo += 1; y = 20; }
      y += 3;
      let rowLines = 1;
      for (let c = 0; c < 2; c++) {
        const idx = i + c;
        if (idx >= pairs.length) break;
        const x = 14 + c * 94;
        const p = pairs[idx];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
        doc.text(String(p[0]).toUpperCase(), x, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
        const lines = doc.splitTextToSize(String(p[1] === null || p[1] === undefined || p[1] === "" ? "-" : p[1]), 88);
        doc.text(lines.slice(0, 3), x, y + 4.8);
        rowLines = Math.max(rowLines, Math.min(3, lines.length));
      }
      y += 5 + rowLines * 4.6;
    }
    return y;
  }

  /* tiga kartu skor berjajar */
  function skorCards(doc, y, hasil, cfg, state) {
    const w = 58.6, gap = 2.6, h = 43, x0 = 14;
    SUB_URUT.forEach(function (sub, i) {
      const p = hasil && hasil.perSubskala && hasil.perSubskala[sub];
      if (!p) return;
      const x = x0 + i * (w + gap);
      if (y + h > 268) { footer(doc, cfg, state.pageNo); doc.addPage(); state.pageNo += 1; y = 20; }

      doc.setFillColor(W.latar[0], W.latar[1], W.latar[2]);
      doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
      doc.text(p.label, x + 5, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
      doc.text("Skor mentah " + p.mentah + " x 2", x + 5, y + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(W.ungu[0], W.ungu[1], W.ungu[2]);
      doc.text(String(p.final), x + 5, y + 24);

      const kat = p.kategori || "-";
      const kc = W_KAT[kat] || W.abu;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const tw = doc.getTextWidth(kat) + 7;
      doc.setFillColor(kc[0], kc[1], kc[2]);
      doc.roundedRect(x + 5, y + 27, tw, 6.2, 3.1, 3.1, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(kat, x + 8.5, y + 31.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
      doc.text("Rentang " + kat + ": " + rentangTeks(sub, kat), x + 5, y + 39);
    });
    return y + h + 8;
  }

  /* paragraf dalam kotak berlatar lembut */
  function kotakTeks(doc, y, teks, opsi, cfg, state) {
    const o = opsi || {};
    const lines = doc.splitTextToSize(String(teks), 178);
    const boxH = lines.length * 4.6 + (o.pad ? o.pad * 2 : 8);
    if (y + boxH > 268) { footer(doc, cfg, state.pageNo); doc.addPage(); state.pageNo += 1; y = 20; }
    doc.setFillColor(W.latar[0], W.latar[1], W.latar[2]);
    doc.roundedRect(14, y, 182, boxH, 2.5, 2.5, "F");
    doc.setFont("helvetica", o.italic ? "italic" : "normal");
    doc.setFontSize(o.size || 9.5);
    doc.setTextColor(o.warna ? o.warna[0] : W.teks[0], o.warna ? o.warna[1] : W.teks[1], o.warna ? o.warna[2] : W.teks[2]);
    doc.text(lines, 17, y + 6);
    return y + boxH + 6;
  }

  /* ---------- dokumen 1: lembar hasil petugas ---------- */

  function buatHasilDoc(rec, cfg) {
    const doc = j();
    const state = { pageNo: 1 };
    let y = bandHeader(doc, cfg, "HASIL SKRINING KESEHATAN MENTAL (DASS-21)", "Lembar Petugas");

    /* identitas */
    const kat = rec.kategori || "-";
    let idTambahan = null;
    if (kat === "Mahasiswa" && rec.nim) idTambahan = ["NIM", rec.nim];
    if (kat === "Dosen" && rec.nip) idTambahan = ["NIP", rec.nip];
    const pairs = [
      ["Nomor Registrasi", rec.regNumber || "-"],
      ["Nama", rec.nama],
      ["Kategori", kat],
      ["No. HP / WA", rec.noHp],
      ["Alamat", rec.alamat],
      ["Mulai", fmtTgl(rec.startedAt)],
      ["Selesai", fmtTgl(rec.completedAt)],
      ["Durasi", fmtDurasi(rec.durasiDetik)],
    ];
    if (idTambahan) pairs.push(idTambahan);
    y = secLabel(doc, y, "Identitas Peserta");
    y = infoGrid(doc, y, pairs, cfg, state);

    /* skor — hitung ulang dari jawaban mentah (tidak percaya skor lama) */
    let hasil = null;
    try {
      hasil = window.DASS21Scoring ? window.DASS21Scoring.hitung(rec.jawaban) : rec.hasil;
    } catch (e) { hasil = rec.hasil; }
    if (!hasil && rec.hasil) hasil = rec.hasil;

    y = secLabel(doc, y, "Hasil DASS-21 (jumlah 7 butir per subskala x 2)");
    if (hasil && hasil.perSubskala) {
      y = skorCards(doc, y, hasil, cfg, state);

      y = secLabel(doc, y, "Interpretasi & Rekomendasi");
      SUB_URUT.forEach(function (sub) {
        const p = hasil.perSubskala[sub];
        if (!p) return;
        if (y > 262) { footer(doc, cfg, state.pageNo); doc.addPage(); state.pageNo += 1; y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
        doc.text(p.label + " — " + p.kategori + ": ", 14, y);
        const xOff = doc.getTextWidth(p.label + " — " + p.kategori + ": ");
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(INTERPRETASI[sub] && INTERPRETASI[sub][p.kategori] ? INTERPRETASI[sub][p.kategori] : "-", 182 - xOff);
        doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
        doc.text(lines, 14 + xOff, y);
        y += Math.max(5.2, lines.length * 4.6) + 2.5;
      });
    } else {
      y = kotakTeks(doc, y, "Peserta belum menyelesaikan seluruh 21 butir, sehingga skor belum dapat dihitung.", {}, cfg, state);
    }

    /* keluhan + analisis */
    const keluhan = String(rec.keluhan || "").trim();
    if (keluhan) {
      y = secLabel(doc, y, "Keluhan / Cerita Peserta");
      const tampil = keluhan.length > 1400
        ? keluhan.slice(0, 1400) + " ... (dipotong — teks lengkap ada di dashboard)"
        : keluhan;
      y = kotakTeks(doc, y, '"' + tampil + '"', { italic: true }, cfg, state);

      if (window.AnalisisKeluhan) {
        const A = window.AnalisisKeluhan.analisis(keluhan, hasil);
        y = secLabel(doc, y, "Analisis Keluhan Otomatis (dihitung di perangkat petugas)");
        y = kotakTeks(doc, y,
          "Tema terdeteksi: " + (A.tema.length ? A.tema.join(", ") : "-") +
          "\nNuansa emosi: " + A.emosi +
          "\nRingkasan: " + A.ringkasan +
          "\nSaran tindak lanjut: " + A.saran +
          "\nTingkat perhatian: " + A.tingkat.label,
          { size: 9 },
          cfg, state
        );
      }
    } else {
      y = secLabel(doc, y, "Keluhan / Cerita Peserta");
      y = kotakTeks(doc, y, "Peserta tidak menulis cerita.", {}, cfg, state);
    }

    /* catatan penutup */
    y = kotakTeks(doc, y,
      "Catatan: skor dihitung ulang dari jawaban mentah sesuai dokumen resmi penyelenggara " +
      "(DASS 21 Versi Indonesia UPA BK, hlm. 3). Hasil skrining adalah alat deteksi dini — BUKAN diagnosis. " +
      "Tindak lanjut keputusan petugas profesional.",
      { size: 8.5, warna: W.abu },
      cfg, state
    );

    footer(doc, cfg, state.pageNo, "Dicetak: " + fmtTgl(new Date().toISOString()) + " dari dashboard petugas");
    return doc;
  }

  /* ---------- dokumen 2: bukti peserta (tanpa skor) ---------- */

  function buatBuktiDoc(rec, cfg) {
    const doc = j();
    const state = { pageNo: 1 };
    let y = bandHeader(doc, cfg, "BUKTI PESERTA SKRINING", "Untuk Peserta");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
    doc.text("Nomor Registrasimu", 105, y, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(W.ungu[0], W.ungu[1], W.ungu[2]);
    doc.text(String(rec.regNumber || "-"), 105, y + 12, { align: "center" });

    y += 22;

    /* kartu identitas singkat */
    doc.setFillColor(W.latar[0], W.latar[1], W.latar[2]);
    doc.setDrawColor(W.garis[0], W.garis[1], W.garis[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, 182, 46, 3, 3, "FD");

    const rows = [
      ["Nama", rec.nama || "-"],
      ["Kategori", rec.kategori || "-"],
      ["Selesai pada", fmtTgl(rec.completedAt)],
      ["Durasi", fmtDurasi(rec.durasiDetik)],
    ];
    let ry = y + 9;
    rows.forEach(function (p) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
      doc.text(String(p[0]).toUpperCase(), 22, ry);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(W.teks[0], W.teks[1], W.teks[2]);
      doc.text(String(p[1]).slice(0, 60), 70, ry);
      ry += 9;
    });

    y += 56;

    y = kotakTeks(doc, y,
      "Simpan atau tunjukkan nomor ini kepada petugas bila diminta. Seluruh jawabanmu tersimpan rahasia: " +
      "hasil skrining diolah oleh petugas profesional dan TIDAK ditampilkan pada layar ini. " +
      "Skrining ini bukan diagnosis — jika kamu ingin berbicara lebih lanjut, petugas di lokasi siap membantu.",
      { size: 9.5 }, cfg, state
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(W.abu[0], W.abu[1], W.abu[2]);
    const infoAcara = (cfg.namaAcara || "-") +
      ((cfg.tanggalAcara || "") ? "  |  " + cfg.tanggalAcara : "") +
      ((cfg.lokasi || "") ? "  |  " + cfg.lokasi : "");
    const lines = doc.splitTextToSize(infoAcara, 182);
    doc.text(lines, 105, y + 2, { align: "center" });
    if (cfg.kontak) {
      doc.text(doc.splitTextToSize("Kontak: " + cfg.kontak, 182), 105, y + 2 + lines.length * 4.6 + 4, { align: "center" });
    }

    footer(doc, cfg, state.pageNo, "Dicetak: " + fmtTgl(new Date().toISOString()) + " oleh peserta (tanpa data skor)");
    return doc;
  }

  /* ---------- unduh ---------- */

  function unduh(doc, namaFile) {
    doc.save(namaFile);
  }

  function lengkap(rec, cfg) {
    const doc = buatHasilDoc(rec, cfg || window.SITE_CONFIG);
    unduh(doc, "hasil-" + slug(rec.regNumber) + "-" + slug(rec.nama) + ".pdf");
    return true;
  }

  function bukti(rec, cfg) {
    const doc = buatBuktiDoc(rec, cfg || window.SITE_CONFIG);
    unduh(doc, "bukti-" + slug(rec.regNumber) + ".pdf");
    return true;
  }

  return {
    buatHasilDoc: buatHasilDoc,
    buatBuktiDoc: buatBuktiDoc,
    lengkap: lengkap,
    bukti: bukti,
  };
})();
