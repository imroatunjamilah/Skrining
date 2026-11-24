/* ============================================================
   ADMIN — dashboard skrining (MODE DEMO, localStorage)
   ------------------------------------------------------------
   PENTING:
   - Login di bawah hanya untuk DEMO. Versi produksi wajib
     melakukan autentikasi di server (hash password bcrypt,
     sesi JWT) dan seluruh perhitungan skor dijalankan ulang
     di backend. Lihat /server/README.md.
   - Skor ditampilkan memakai konstanta resmi dari dokumen referensi
     penyelenggara ("DASS 21 Versi Indonesia UPA BK", hlm. 3) yang
     sudah diterapkan di js/scoring.js — file ini otomatis mengikuti.
   ============================================================ */

(function () {
  "use strict";

  const CFG = window.SITE_CONFIG;
  const Q = window.DASS21;
  const Scoring = window.DASS21Scoring;

  const STORE_KEY = "skrining_records_v1";
  const AUTH_KEY = "skrining_admin_session";
  const SETTINGS_KEY = "skrining_event_settings_v1";
  const LOGIN_DEMO = { username: "admin", password: "skrining2026" };

  const SET_FIELDS = ["namaAcara", "tanggalAcara", "lokasi", "penyelenggara",
    "kontak", "durasiLabel", "namaMaskot", "prefixNomor"];

  const PAGE_SIZE = 8;

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  let records = [];
  let page = 1;
  let sortKey = "waktu"; // "nama" | "waktu"
  let sortDir = "desc";

  /* ---------- util ---------- */

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function waktuTeks(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" +
      String(d.getFullYear()).slice(2) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function getRecords() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
    catch (e) { return []; }
  }

  function setRecords(recs) {
    records = recs;
    localStorage.setItem(STORE_KEY, JSON.stringify(recs));
    renderAll();
  }

  /* ---------- login (demo) ---------- */

  function showToast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    window.clearTimeout(t._timer);
    t._timer = window.setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function showView(name) {
    $("#view-login").classList.toggle("hidden", name !== "login");
    $("#view-dash").classList.toggle("hidden", name !== "dash");
  }

  function setupLogin() {
    const sudahLogin = sessionStorage.getItem(AUTH_KEY) === "1";
    if (sudahLogin) { showView("dash"); renderAll(); }

    $("#form-login").addEventListener("submit", function (e) {
      e.preventDefault();
      const u = $("#inp-user").value.trim();
      const p = $("#inp-pass").value;
      if (u === LOGIN_DEMO.username && p === LOGIN_DEMO.password) {
        sessionStorage.setItem(AUTH_KEY, "1");
        $("#login-err").classList.add("hidden");
        showView("dash");
        renderAll();
      } else {
        $("#login-err").classList.remove("hidden");
        $("#field-pass").classList.add("is-error");
        window.setTimeout(function () { $("#field-pass").classList.remove("is-error"); }, 500);
      }
    });

    $("#btn-logout").addEventListener("click", function () {
      sessionStorage.removeItem(AUTH_KEY);
      showView("login");
    });
  }

  /* ---------- pengaturan acara ---------- */

  function bacaPengaturan() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {}; }
    catch (e) { return {}; }
  }

  function isiFormPengaturan() {
    const saved = bacaPengaturan();
    SET_FIELDS.forEach(function (k) {
      const inp = document.getElementById("set-" + k);
      if (!inp) return;
      inp.value = (typeof saved[k] === "string") ? saved[k] : (CFG[k] || "");
    });
    updatePreview();
  }

  function updatePreview() {
    const nama = (document.getElementById("set-namaAcara") || {}).value || CFG.namaAcara;
    const tgl = (document.getElementById("set-tanggalAcara") || {}).value || CFG.tanggalAcara;
    const lok = (document.getElementById("set-lokasi") || {}).value || CFG.lokasi || "";
    const org = (document.getElementById("set-penyelenggara") || {}).value || CFG.penyelenggara;
    $("#pv-nama").textContent = nama;
    $("#pv-chip").textContent = tgl + (lok ? " · " + lok : "");
    $("#pv-foot").textContent = org + (lok ? " — " + lok : "");
  }

  function simpanPengaturan() {
    const data = {};
    SET_FIELDS.forEach(function (k) {
      const inp = document.getElementById("set-" + k);
      data[k] = inp ? inp.value.trim() : "";
    });

    if (!data.namaAcara) {
      showToast("Nama acara tidak boleh kosong.");
      document.getElementById("set-namaAcara").focus();
      return;
    }
    if (!data.prefixNomor) data.prefixNomor = "SKR";
    data.prefixNomor = data.prefixNomor.toUpperCase().replace(/[^A-Z0-9]/g, "");
    document.getElementById("set-prefixNomor").value = data.prefixNomor;

    const def = window.SITE_CONFIG_DEFAULT || {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    SET_FIELDS.forEach(function (k) {
      CFG[k] = data[k] !== "" ? data[k] : (def[k] || "");
    });
    $("#dash-sub").textContent = "Panel petugas — " + CFG.namaAcara;
    showToast("Pengaturan tersimpan. Halaman peserta di perangkat ini sudah memakainya.");
  }

  function resetPengaturan() {
    if (!window.confirm("Kembalikan semua pengaturan ke bawaan situs?")) return;
    localStorage.removeItem(SETTINGS_KEY);
    const def = window.SITE_CONFIG_DEFAULT || {};
    SET_FIELDS.forEach(function (k) {
      CFG[k] = (typeof def[k] === "string") ? def[k] : "";
    });
    isiFormPengaturan();
    $("#dash-sub").textContent = "Panel petugas — " + CFG.namaAcara;
    showToast("Pengaturan dikembalikan ke bawaan.");
  }

  function setupTabs() {
    $$("#dash-tabs .tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#dash-tabs .tab-btn").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        const tab = btn.getAttribute("data-tab");
        $("#tab-data").classList.toggle("hidden", tab !== "data");
        $("#tab-pengaturan").classList.toggle("hidden", tab !== "pengaturan");
        if (tab === "pengaturan") isiFormPengaturan();
      });
    });

    SET_FIELDS.forEach(function (k) {
      const inp = document.getElementById("set-" + k);
      if (inp) inp.addEventListener("input", updatePreview);
    });
    $("#btn-save-settings").addEventListener("click", simpanPengaturan);
    $("#btn-reset-settings").addEventListener("click", resetPengaturan);
  }

  /* ---------- statistik ---------- */

  function renderStats() {
    const total = records.length;
    const done = records.filter(function (r) { return r.status === "selesai"; }).length;
    const wip = total - done;

    $("#stat-total").textContent = String(total);
    $("#stat-done").textContent = String(done);
    $("#stat-wip").textContent = String(wip);
    $("#stat-done-foot").textContent = total ? Math.round(done / total * 100) + "% dari total" : "0% dari total";
    $("#stat-wip-foot").textContent = wip > 0 ? "sedang mengisi kuis" : "tidak ada yang tertahan";

    // distribusi kategori
    const kategori = { Mahasiswa: 0, Dosen: 0, Umum: 0 };
    records.forEach(function (r) {
      if (kategori[r.kategori] !== undefined) kategori[r.kategori] += 1;
    });
    const max = Math.max(1, kategori.Mahasiswa, kategori.Dosen, kategori.Umum);
    const warna = { Mahasiswa: "var(--purple-500)", Dosen: "var(--pink-400)", Umum: "var(--mint-300)" };
    const bars = $("#bars-kategori");
    bars.innerHTML = "";
    Object.keys(kategori).forEach(function (k) {
      const pct = Math.round(kategori[k] / max * 100);
      bars.insertAdjacentHTML("beforeend",
        '<div class="bar-row">' +
        '  <span class="bar-name">' + k + '</span>' +
        '  <div class="bar-track"><div class="bar-fill" style="width:0;background:' + warna[k] + '" data-w="' + pct + '"></div></div>' +
        '  <span class="bar-val">' + kategori[k] + '</span>' +
        '</div>');
    });
    window.requestAnimationFrame(function () {
      bars.querySelectorAll(".bar-fill").forEach(function (el) {
        el.style.width = el.getAttribute("data-w") + "%";
      });
    });
  }

  /* ---------- tabel ---------- */

  function terfilter() {
    const q = $("#flt-search").value.trim().toLowerCase();
    const fStatus = $("#flt-status").value;
    const fKat = $("#flt-kategori").value;

    let arr = records.filter(function (r) {
      if (fStatus && r.status !== fStatus) return false;
      if (fKat && r.kategori !== fKat) return false;
      if (!q) return true;
      const gabung = [r.nama, r.nim, r.nip, r.noHp, r.regNumber].join(" ").toLowerCase();
      return gabung.indexOf(q) !== -1;
    });

    arr.sort(function (a, b) {
      if (sortKey === "nama") {
        const x = (a.nama || "").toLowerCase();
        const y = (b.nama || "").toLowerCase();
        return sortDir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
      }
      const x = new Date(a.startedAt || 0).getTime();
      const y = new Date(b.startedAt || 0).getTime();
      return sortDir === "asc" ? x - y : y - x;
    });

    return arr;
  }

  function nimNipTeks(r) {
    if (r.kategori === "Mahasiswa" && r.nim) return r.nim;
    if (r.kategori === "Dosen" && r.nip) return r.nip;
    return "-";
  }

  function renderTable() {
    const arr = terfilter();
    const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const mulai = (page - 1) * PAGE_SIZE;
    const potongan = arr.slice(mulai, mulai + PAGE_SIZE);
    const body = $("#tbl-body");
    body.innerHTML = "";

    potongan.forEach(function (r, i) {
      const no = mulai + i + 1;
      const idItem = nimNipTeks(r);
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="td-no">' + no + '</td>' +
        '<td class="td-nama"><b>' + escapeHtml(r.nama || "-") + '</b><span>' + escapeHtml(r.regNumber || "-") + '</span></td>' +
        '<td>' + escapeHtml(idItem) + '</td>' +
        '<td><span class="badge badge-kat">' + escapeHtml(r.kategori || "-") + '</span></td>' +
        '<td>' + escapeHtml(r.noHp || "-") + '</td>' +
        '<td>' + waktuTeks(r.completedAt || r.startedAt) + '</td>' +
        '<td>' + (r.status === "selesai"
          ? '<span class="badge badge-done">Selesai</span>'
          : '<span class="badge badge-wip">Belum selesai</span>') + '</td>' +
        '<td class="td-aksi"><div class="aksi-row">' +
        '  <button class="mini-btn" data-act="detail" data-id="' + r.id + '">Detail</button>' +
        '  <button class="mini-btn" disabled title="Butuh backend — tersedia pada versi produksi">PDF</button>' +
        '  <button class="mini-btn danger" data-act="hapus" data-id="' + r.id + '">Hapus</button>' +
        '</div></td>';
      body.appendChild(tr);
    });

    $("#tbl-empty").classList.toggle("hidden", arr.length > 0);
    $("#pg-info").textContent = "Halaman " + page + " dari " + totalPages +
      " (" + arr.length + " peserta)";
    $("#pg-prev").disabled = page <= 1;
    $("#pg-next").disabled = page >= totalPages;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------- modal detail ---------- */

  function labelJawaban(nilai) {
    const opsi = Q.opsi.filter(function (o) { return o.nilai === nilai; })[0];
    return opsi ? opsi.label : "-";
  }

  function bukaDetail(id) {
    const r = records.filter(function (x) { return x.id === id; })[0];
    if (!r) return;

    $("#modal-reg").textContent = (r.regNumber || "-") + " · " + (r.kategori || "-");
    $("#modal-title").textContent = r.nama || "Detail Peserta";

    let html = "";

    html += '<p class="sec-label">Identitas</p><div class="id-grid">';
    html += idItem("Nama", r.nama) + idItem("Alamat", r.alamat) +
            idItem("No. HP / WA", r.noHp) + idItem("Kategori", r.kategori);
    if (r.kategori === "Mahasiswa") html += idItem("NIM", r.nim);
    if (r.kategori === "Dosen") html += idItem("NIP", r.nip);
    html += idItem("Mulai", waktuTeks(r.startedAt)) +
            idItem("Selesai", r.status === "selesai" ? waktuTeks(r.completedAt) : "belum selesai");
    html += "</div>";

    html += '<p class="sec-label">Keluhan / Cerita Peserta</p>';
    html += r.keluhan
      ? '<div class="keluhan-quote">' + escapeHtml(r.keluhan) + "</div>"
      : '<div class="keluhan-quote" style="opacity:.6">Tidak menulis cerita.</div>';

    html += '<p class="sec-label">Jawaban DASS-21 (0=Tidak Terjadi &middot; 1=Jarang Terjadi &middot; 2=Sering Terjadi &middot; 3=Selalu Terjadi)</p>';
    html += '<div class="jawaban-list">';
    const jaw = r.jawaban || new Array(21).fill(null);
    Q.butir.forEach(function (b) {
      const v = jaw[b.no - 1];
      html += '<div class="jawaban-item">' +
        '<span class="j-no">' + b.no + '</span>' +
        '<span class="j-text">' + escapeHtml(b.text) + '</span>' +
        '<span class="j-val">' + (v === null || v === undefined ? "belum" : v + " · " + labelJawaban(v)) + '</span>' +
        '</div>';
    });
    html += "</div>";

    html += '<p class="sec-label">Hasil Perhitungan</p>';
    if (r.hasil && r.hasil.perSubskala) {
      html += '<div class="hasil-grid">';
      ["depresi", "ansietas", "stres"].forEach(function (sub) {
        const h = r.hasil.perSubskala[sub];
        if (!h) return;
        const sevClass = "sev-" + h.kategori.toLowerCase().replace(/\s+/g, "-");
        html += '<div class="hasil-card">' +
          '<h4>' + h.label + '</h4>' +
          '<p class="h-raw">Skor mentah: ' + h.mentah + '</p>' +
          '<p class="h-final">' + h.final + '<small> (x2)</small></p>' +
          '<span class="badge badge-sev ' + sevClass + '">' + h.kategori + '</span>' +
          '</div>';
      });
      html += "</div>";
    } else {
      html += '<div class="keluhan-quote" style="opacity:.6">Peserta belum menyelesaikan seluruh butir, sehingga skor belum dihitung.</div>';
    }

    html += '<p class="modal-note">Skor dihitung persis dokumen referensi resmi penyelenggara ' +
      '(<i>DASS 21 Versi Indonesia UPA BK</i>, hlm. 3): jumlah jawaban 7 butir per subskala &times;2, ' +
      'lalu dicocokkan ke tabel ambang Normal/Ringan/Sedang/Berat/Sangat Berat. Konstanta terpusat di ' +
      '<code>js/scoring.js</code>. Hasil skrining adalah alat deteksi dini &mdash; <b>bukan diagnosis</b>. ' +
      'Pada versi produksi, perhitungan dijalankan ulang di server dan analisis keluhan oleh LLM tersedia pada kolom khusus.</p>';

    $("#modal-body").innerHTML = html;
    $("#modal").classList.add("is-open");
  }

  function idItem(label, val) {
    return '<div class="id-item"><b>' + label + '</b>' + escapeHtml(val || "-") + '</div>';
  }

  function tutupModal() {
    $("#modal").classList.remove("is-open");
  }

  /* ---------- ekspor CSV (UTF-8 BOM, satu baris per peserta) ---------- */

  function csvEscape(v) {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",;\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function eksporCSV() {
    const head = [
      "No", "Nomor Registrasi", "Status", "Mulai", "Selesai", "Durasi Menit",
      "Nama", "Alamat", "No HP", "Kategori", "NIM", "NIP",
      "Keluhan",
    ];
    for (let i = 1; i <= 21; i++) head.push("Jawaban " + i);
    ["Depresi", "Kecemasan", "Stress"].forEach(function (s) {
      head.push(s + " Mentah", s + " Final", s + " Kategori");
    });
    // Ruang analisis keluhan (LLM) — terisi otomatis saat backend aktif
    ["Analisis Tema", "Analisis Emosi", "Analisis Ringkasan", "Analisis Saran Tindak Lanjut"].forEach(function (s) {
      head.push(s);
    });

    const rows = [head];
    const arr = terfilter();

    arr.forEach(function (r, i) {
      const durasiMenit = r.durasiDetik ? (r.durasiDetik / 60).toFixed(1) : "";
      const jaw = r.jawaban || new Array(21).fill(null);
      const row = [
        i + 1, r.regNumber || "", r.status === "selesai" ? "Selesai" : "Belum selesai",
        waktuTeks(r.startedAt), r.status === "selesai" ? waktuTeks(r.completedAt) : "", durasiMenit,
        r.nama || "", r.alamat || "", r.noHp || "", r.kategori || "",
        r.kategori === "Mahasiswa" ? (r.nim || "") : "", r.kategori === "Dosen" ? (r.nip || "") : "",
        r.keluhan || "",
      ];
      for (let n = 1; n <= 21; n++) {
        const v = jaw[n - 1];
        const opsi = (v === null || v === undefined) ? "" : (Q.opsi.filter(function (o) { return o.nilai === v; })[0] || {}).label || v;
        row.push(v === null || v === undefined ? "" : v + " - " + opsi);
      }
      ["depresi", "ansietas", "stres"].forEach(function (sub) {
        const h = r.hasil && r.hasil.perSubskala && r.hasil.perSubskala[sub];
        row.push(h ? h.mentah : "", h ? h.final : "", h ? h.kategori : "");
      });
      // Kolom LLM: placeholder sampai backend analisis aktif
      row.push("", "", "", "");
      rows.push(row);
    });

    const isi = rows.map(function (row) {
      return row.map(csvEscape).join(";");
    }).join("\r\n");

    const blob = new Blob(["\uFEFF" + isi], { type: "text/csv;charset=utf-8" });
    const d = new Date();
    const namaFile = "skrining-export-" + d.getFullYear() + pad2(d.getMonth() + 1) +
      pad2(d.getDate()) + "-" + pad2(d.getHours()) + pad2(d.getMinutes()) + ".csv";

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 400);
  }

  /* ---------- data demo ---------- */

  function seedDemo() {
    const pola = [
      { nama: "Rani Puspitasari", kategori: "Mahasiswa", nim: "2210510043", nip: "", alamat: "Jl. Kaliurang KM 5, Sleman", noHp: "081234567890", ans: [0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0], keluhan: "Akhir-akhir ini aku gampang lelah karena tugas menumpuk, tapi masih bisa tidur nyenyak." },
      { nama: "Bagas Aditya", kategori: "Mahasiswa", nim: "2310410022", nip: "", alamat: "Jl. Colombo No. 1, Yogyakarta", noHp: "082198765432", ans: [2,1,2,1,2,1,1,2,1,2,1,2,2,1,1,2,1,2,1,1,1], keluhan: "Sering cemas menghadapi ujian, susah fokus, dan gampang tersinggung sama teman." },
      { nama: "Dr. Sari Wulandari", kategori: "Dosen", nim: "", nip: "198503122010012001", alamat: "Jl. Gejayan No. 22, Yogyakarta", noHp: "081322114455", ans: [1,0,0,0,1,1,0,1,0,0,1,1,0,1,0,0,0,1,0,0,0], keluhan: "Beban administrasi cukup menumpuk minggu ini, tapi secara umum masih sehat." },
      { nama: "Ahmad Fauzi", kategori: "Umum", nim: "", nip: "", alamat: "Jl. Malioboro No. 88, Yogyakarta", noHp: "085700112233", ans: [1,1,1,2,1,1,2,1,2,1,1,1,1,2,2,1,1,1,2,2,1], keluhan: "Sering jantung berdebar dan khawatir berlebihan soal pekerjaan." },
      { nama: "Dewi Lestari", kategori: "Umum", nim: "", nip: "", alamat: "Jl. Prawirotaman No. 7, Yogyakarta", noHp: "089955678899", ans: [3,2,3,2,3,2,2,3,2,3,3,3,3,2,2,3,3,3,2,2,3], keluhan: "Sudah dua minggu merasa sangat sedih, tidak semangat, dan mudah menangis." },
      { nama: "Rizky Pratama", kategori: "Mahasiswa", nim: "2210510117", nip: "", alamat: "Jl. Tamansiswa No. 15, Yogyakarta", noHp: "081245677788", ans: [1,0,1,0,1,2,0,1,0,1,2,1,0,2,0,1,0,2,0,0,0], keluhan: "" },
    ];

    const recs = [];
    const sekarang = Date.now();
    pola.forEach(function (p, i) {
      const mulai = sekarang - (pola.length - i) * 37 * 60 * 1000;
      const selesai = mulai + (5 + i) * 60 * 1000;
      const jaw = p.ans.slice();
      const hasil = Scoring.hitung(jaw) || {};
      recs.push({
        id: "demo_" + (i + 1),
        regNumber: CFG.prefixNomor + "-" + tanggalKode() + "-" + pad2(i + 1).padStart(3, "0"),
        nama: p.nama, alamat: p.alamat, noHp: p.noHp,
        kategori: p.kategori, nim: p.nim, nip: p.nip,
        keluhan: p.keluhan,
        status: i === pola.length - 1 ? "belum" : "selesai",
        startedAt: new Date(mulai).toISOString(),
        completedAt: i === pola.length - 1 ? null : new Date(selesai).toISOString(),
        durasiDetik: i === pola.length - 1 ? null : Math.round((selesai - mulai) / 1000),
        jawaban: jaw,
        hasil: i === pola.length - 1 ? null : hasil,
      });
    });

    setRecords(recs);
  }

  function tanggalKode() {
    const d = new Date();
    return "" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  /* ---------- wiring ---------- */

  function setupDash() {
    $("#flt-search").addEventListener("input", function () { page = 1; renderTable(); });
    $("#flt-status").addEventListener("change", function () { page = 1; renderTable(); });
    $("#flt-kategori").addEventListener("change", function () { page = 1; renderTable(); });

    $$(".th-sort").forEach(function (th) {
      th.addEventListener("click", function () {
        const key = th.getAttribute("data-sort");
        if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else { sortKey = key; sortDir = key === "nama" ? "asc" : "desc"; }
        renderTable();
      });
    });

    $("#pg-prev").addEventListener("click", function () { page -= 1; renderTable(); });
    $("#pg-next").addEventListener("click", function () { page += 1; renderTable(); });

    $("#tbl-body").addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-act]");
      if (!btn || btn.disabled) return;
      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      if (act === "detail") bukaDetail(id);
      if (act === "hapus") {
        const r = records.filter(function (x) { return x.id === id; })[0];
        if (r && window.confirm("Hapus data peserta \"" + (r.nama || id) + "\"?")) {
          setRecords(records.filter(function (x) { return x.id !== id; }));
        }
      }
    });

    $("#modal-close").addEventListener("click", tutupModal);
    $("#modal-close-bg").addEventListener("click", tutupModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") tutupModal();
    });

    $("#btn-export-csv").addEventListener("click", eksporCSV);
    $("#btn-seed").addEventListener("click", function () {
      seedDemo();
    });
    $("#btn-clear").addEventListener("click", function () {
      if (window.confirm("Hapus SEMUA data peserta di perangkat ini?")) setRecords([]);
    });

    $("#dash-sub").textContent = "Panel petugas — " + CFG.namaAcara;
  }

  function renderAll() {
    records = getRecords();
    renderStats();
    renderTable();
  }

  function init() {
    setupLogin();
    setupDash();
    setupTabs();
    isiFormPengaturan();
    showView(sessionStorage.getItem(AUTH_KEY) === "1" ? "dash" : "login");
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
