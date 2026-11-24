/* ============================================================
   CONTROLLER ALUR PESERTA — SKRINING KESEHATAN MENTAL (DASS-21)
   ------------------------------------------------------------
   TITIK INTEGRASI BACKEND (untuk versi produksi):
   Semua penyimpanan data melewati 3 fungsi di bawah —
   saveRecords(), saveDraft(), muatDraft(). Saat backend aktif,
   cukup ganti isi fungsi-fungsi tersebut dengan fetch() ke API
   (lihat /server/README.md). Tidak ada logika alur yang perlu
   diubah.

   MODE DEMO SAAT INI:
   Data tersimpan di localStorage perangkat ini saja. Layar
   selesai TIDAK PERNAH menampilkan skor atau label psikologi —
   sesuai kebijakan skrining (hasil hanya untuk petugas).
   ============================================================ */

(function () {
  "use strict";

  const CFG = window.SITE_CONFIG;
  const Q = window.DASS21;
  const Scoring = window.DASS21Scoring;
  const FX = window.MascotFX;

  const STORE_KEY = "skrining_records_v1";
  const DRAFT_KEY = "skrining_draft_v1";

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ---------- util ---------- */

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function tanggalLokal(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() +
        " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    } catch (e) { return "-"; }
  }

  function tanggalKode(iso) {
    const d = iso ? new Date(iso) : new Date();
    return "" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  function uangTeks(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  /* ---------- penyimpanan (demo: localStorage) ---------- */

  function getRecords() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
    catch (e) { return []; }
  }

  function saveRecords(recs) {
    localStorage.setItem(STORE_KEY, JSON.stringify(recs));
  }

  function saveDraft(draft) {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  }

  function muatDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }
    catch (e) { return null; }
  }

  function genRegNumber() {
    const hariIni = tanggalKode();
    const recs = getRecords().filter(function (r) {
      return r.regNumber && r.regNumber.indexOf(CFG.prefixNomor + "-" + hariIni) === 0;
    });
    const seq = recs.length + 1;
    return CFG.prefixNomor + "-" + hariIni + "-" + (seq < 100 ? pad2(seq).padStart(3, "0") : seq);
  }

  /* ---------- state aplikasi ---------- */

  const state = {
    screen: "landing",
    identity: { nama: "", alamat: "", noHp: "", kategori: "", nim: "", nip: "" },
    story: "",
    answers: new Array(21).fill(null),
    idx: 0,
    startedAt: null,
    recordId: null,
  };

  /* ---------- maskot ---------- */

  let hero, companion, splashMascot, doneMascot;

  const FRASE_LANDING = [
    "Hai! Aku " + CFG.namaMaskot + ", teman barumu!",
    "Ayo main bareng aku — cuma butuh " + CFG.durasiLabel + " kok!",
    "Nggak perlu takut, semua jawabanmu aman dan rahasia!",
    "Klik tombol ungu di bawah itu, yuk!",
    "Nggak ada jawaban benar atau salah, kok — santai aja!",
  ];

  const FRASE_SEMANGAT = [
    "Semangat! Kamu udah jauh, lho!",
    "Wih, lancar banget! Lanjut terus!",
    "Nggak ada jawaban salah — ikuti aja perasaanmu.",
    "Tarik napas dalam... kamu pasti bisa!",
    "Sedikit lagi, pertahankan ya!",
    "Jawabmu konsisten banget, keren!",
    "Aku bangga sama kamu!",
  ];

  function fraseAcak(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  let landingBubbleTimer = null;
  let heroWaveTimer = null;

  function mulaiLandingAnimasi() {
    if (!hero) return;
    hero.say(fraseAcak(FRASE_LANDING), { hold: 3600 });
    landingBubbleTimer = window.setInterval(function () {
      hero.say(fraseAcak(FRASE_LANDING), { hold: 3600 });
    }, 7000);
    heroWaveTimer = window.setInterval(function () {
      hero.wave(1500);
    }, 4600);
    hero.setState("wave", 1600);
  }

  function stopLandingAnimasi() {
    if (landingBubbleTimer) { window.clearInterval(landingBubbleTimer); landingBubbleTimer = null; }
    if (heroWaveTimer) { window.clearInterval(heroWaveTimer); heroWaveTimer = null; }
    if (hero) hero.clearBubble();
  }

  /* ---------- navigasi layar ---------- */

  const SCREENS = ["landing", "identitas", "cerita", "kuis", "selesai"];

  function showScreen(name) {
    state.screen = name;
    document.body.setAttribute("data-screen", name);
    SCREENS.forEach(function (s) {
      const el = $("#screen-" + s);
      if (el) el.classList.toggle("is-active", s === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });

    const hook = HOOKS[name];
    if (hook) hook();
  }

  const HOOKS = {
    landing: function () {
      stopLandingAnimasi();
      mulaiLandingAnimasi();
    },
    identitas: function () {
      if (companion) {
        companion.idle();
        companion.say("Boleh kenalan dulu? Siapa namamu?", { hold: 4200 });
      }
    },
    cerita: function () {
      if (companion) {
        companion.think(2600);
        companion.say("Ceritain apa aja boleh. Aku dengerin, kok!", { hold: 4200 });
      }
    },
    kuis: function () {
      if (companion) companion.idle();
      renderQuestion();
    },
    selesai: function () { /* diisi oleh finish() */ },
  };

  /* ================= LAYAR 1: LANDING ================= */

  function setupLanding() {
    const consent = $("#consent-check");
    const btnStart = $("#btn-start");

    consent.addEventListener("change", function () {
      btnStart.disabled = !consent.checked;
      if (consent.checked && companion === null) { /* noop */ }
      if (consent.checked && hero) {
        hero.bounce(900);
        hero.say("Asik! Klik tombolnya ya!", { hold: 2600 });
      }
    });

    btnStart.addEventListener("click", function () {
      if (consent.checked) {
        FX.confetti(window.innerWidth / 2, window.innerHeight * 0.35, 16);
        showScreen("identitas");
      }
    });

    $("#btn-steps").addEventListener("click", function () {
      const steps = $("#steps");
      steps.classList.toggle("hidden");
      this.textContent = steps.classList.contains("hidden")
        ? "Bagaimana cara kerjanya?"
        : "Sembunyikan";
    });

    // Tawaran lanjutkan draf sebelumnya
    const draft = muatDraft();
    if (draft && draft.identity && draft.identity.nama) {
      $("#resume-card").classList.remove("hidden");
      const terjawab = (draft.answers || []).filter(function (v) { return v !== null; }).length;
      $("#resume-text").textContent = "Hai, " + draft.identity.nama.split(" ")[0] +
        "! Kamu sempat berhenti di pertanyaan ke-" + Math.max(1, (draft.idx || 0) + 1) +
        " (" + terjawab + "/21 terjawab).";
    }

    $("#btn-resume").addEventListener("click", function () {
      const d = muatDraft();
      if (!d) return;
      state.identity = d.identity || state.identity;
      state.story = d.story || "";
      state.answers = (d.answers && d.answers.length === 21) ? d.answers : state.answers;
      state.idx = Math.min(20, Math.max(0, d.idx || 0));
      state.startedAt = d.startedAt || new Date().toISOString();
      state.recordId = d.recordId || null;
      showScreen("kuis");
    });

    $("#btn-discard").addEventListener("click", function () {
      saveDraft(null);
      $("#resume-card").classList.add("hidden");
      if (companion) companion.say("Nggak apa-apa! Kita mulai yang baru ya!", { hold: 3000 });
    });
  }

  /* ================= LAYAR 2: IDENTITAS ================= */

  function kategoriTerpilih() {
    const el = document.querySelector('input[name="kategori"]:checked');
    return el ? el.value : "";
  }

  function toggleFieldNimNip(kategori) {
    $("#field-nim").classList.toggle("hidden", kategori !== "Mahasiswa");
    $("#field-nip").classList.toggle("hidden", kategori !== "Dosen");
  }

  function setFieldError(fieldId, isError) {
    $("#" + fieldId).classList.toggle("is-error", isError);
  }

  function validasiIdentitas() {
    const nama = uangTeks($("#inp-nama").value);
    const alamat = uangTeks($("#inp-alamat").value);
    const noHp = uangTeks($("#inp-hp").value).replace(/[-\s]/g, "");
    const kategori = kategoriTerpilih();
    const nim = uangTeks($("#inp-nim").value);
    const nip = uangTeks($("#inp-nip").value);

    let ok = true;
    let firstBad = null;

    const cek = [
      ["field-nama", nama.length >= 3 && /[A-Za-z]/.test(nama)],
      ["field-alamat", alamat.length >= 8],
      ["field-hp", /^(0|\+62)\d{8,13}$/.test(noHp)],
      ["field-kategori", kategori !== ""],
    ];

    if (kategori === "Mahasiswa") cek.push(["field-nim", /^\d{6,15}$/.test(nim)]);
    if (kategori === "Dosen") cek.push(["field-nip", /^\d{15,18}$/.test(nip)]);

    cek.forEach(function (pair) {
      const valid = pair[1];
      setFieldError(pair[0], !valid);
      if (!valid && !firstBad) firstBad = pair[0];
      if (!valid) ok = false;
    });

    if (!ok) {
      if (companion) {
        companion.worried(1600);
        companion.say("Eits, ada isian yang belum benar. Coba cek lagi, ya!", { hold: 3400 });
      }
      if (firstBad) {
        const target = $("#" + firstBad);
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const inp = target.querySelector("input");
        if (inp) inp.focus();
      }
      return null;
    }

    return { nama: nama, alamat: alamat, noHp: noHp, kategori: kategori, nim: nim, nip: nip };
  }

  function buatAtauAmbilRecord(identity) {
    const recs = getRecords();
    let rec = null;
    if (state.recordId) {
      rec = recs.filter(function (r) { return r.id === state.recordId; })[0] || null;
    }
    if (!rec) {
      rec = {
        id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        regNumber: genRegNumber(),
        status: "belum",
        startedAt: new Date().toISOString(),
        completedAt: null,
        durasiDetik: null,
        jawaban: new Array(21).fill(null),
        hasil: null,
      };
      state.recordId = rec.id;
      recs.push(rec);
    }
    rec.nama = identity.nama;
    rec.alamat = identity.alamat;
    rec.noHp = identity.noHp;
    rec.kategori = identity.kategori;
    rec.nim = identity.nim;
    rec.nip = identity.nip;
    saveRecords(recs);
    return rec;
  }

  function simpanDraft() {
    saveDraft({
      identity: state.identity,
      story: state.story,
      answers: state.answers,
      idx: state.idx,
      startedAt: state.startedAt,
      recordId: state.recordId,
    });
  }

  function updateRecordSebagian() {
    if (!state.recordId) return;
    const recs = getRecords();
    const rec = recs.filter(function (r) { return r.id === state.recordId; })[0];
    if (!rec) return;
    rec.jawaban = state.answers.slice();
    rec.keluhan = state.story || "";
    saveRecords(recs);
  }

  function setupIdentitas() {
    $$('input[name="kategori"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        toggleFieldNimNip(radio.value);
        setFieldError("field-kategori", false);
        if (companion && radio.checked) {
          companion.bounce(700);
          if (radio.value === "Mahasiswa") companion.say("Wih, mahasiswa! NIM-nya mana nih?", { hold: 3000 });
          else if (radio.value === "Dosen") companion.say("Salam buat dosen! Isi NIP-nya ya.", { hold: 3000 });
          else companion.say("Halo, pengunjung spesial! Senang bertemu!", { hold: 3000 });
        }
      });
    });

    ["#inp-nama", "#inp-alamat", "#inp-hp", "#inp-nim", "#inp-nip"].forEach(function (sel) {
      $(sel).addEventListener("input", function () {
        this.closest(".field").classList.remove("is-error");
      });
    });

    $("#form-identitas").addEventListener("submit", function (e) {
      e.preventDefault();
      const data = validasiIdentitas();
      if (!data) return;

      state.identity = data;
      state.startedAt = state.startedAt || new Date().toISOString();

      const rec = buatAtauAmbilRecord(data);
      simpanDraft();

      if (companion) {
        companion.bounce(900);
        companion.say("Salam kenal, " + data.nama.split(" ")[0] + "! Yuk lanjut!", { hold: 3000 });
      }
      FX.confetti(window.innerWidth * 0.5, window.innerHeight * 0.4, 14);

      window.setTimeout(function () { showScreen("cerita"); }, 650);
      void rec;
    });
  }

  /* ================= LAYAR 3: CERITA ================= */

  function setupCerita() {
    const ta = $("#inp-story");

    function perbaruiHitung() {
      $("#story-count").textContent = String(ta.value.length);
    }
    ta.addEventListener("input", perbaruiHitung);

    $$("#story-chips .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        const tambahan = chip.textContent;
        ta.value = ta.value ? ta.value.replace(/\s+$/, "") + " " + tambahan : tambahan;
        perbaruiHitung();
        ta.focus();
        if (companion) companion.bounce(600);
      });
    });

    $("#btn-story-skip").addEventListener("click", function () {
      state.story = "";
      simpanDraft();
      updateRecordSebagian();
      if (companion) companion.say("Nggak apa-apa! Kita lanjut ke pertanyaan serunya ya!", { hold: 3200 });
      window.setTimeout(function () { bukaKuis(); }, 500);
    });

    $("#btn-story-next").addEventListener("click", function () {
      state.story = uangTeks(ta.value);
      simpanDraft();
      updateRecordSebagian();
      if (state.story.length > 0 && companion) {
        companion.cheer(1200);
        companion.say("Terima kasih sudah cerita! Aku simpan baik-baik, kok.", { hold: 3200 });
      }
      window.setTimeout(function () { bukaKuis(); }, state.story.length > 0 ? 750 : 400);
    });
  }

  /* ================= LAYAR 4: KUIS ================= */

  const BAB = [
    { mulai: 0, badge: "Bagian 1 dari 3", judul: "Kita Mulai!", sub: "Santai aja — jawab sesuai perasaanmu selama minggu lalu." },
    { mulai: 7, badge: "Bagian 2 dari 3", judul: "Kamu Udah Setengah Jalan!", sub: "7 pertanyaan pertama beres. Pertahankan ya!" },
    { mulai: 14, badge: "Bagian 3 dari 3", judul: "Babak Final!", sub: "Sedikit lagi menuju garis finish. Kamu pasti bisa!" },
  ];

  let splashJustShown = false;

  function bukaKuis() {
    splashJustShown = false;
    const bab = BAB.filter(function (b) { return b.mulai === state.idx; })[0];
    if (bab && state.idx > 0) {
      tampilkanSplash(bab);
    } else {
      showScreen("kuis");
    }
  }

  function tampilkanSplash(bab) {
    splashJustShown = true;
    $("#splash-badge").textContent = bab.badge;
    $("#splash-title").textContent = bab.judul;
    $("#splash-sub").textContent = bab.sub;
    $("#quiz-splash").classList.add("is-show");
    if (splashMascot) {
      splashMascot.cheer(2000);
      splashMascot.say(fraseAcak(FRASE_SEMANGAT), { hold: 3000 });
    }
    FX.confetti(window.innerWidth / 2, window.innerHeight * 0.3, 20);
    showScreen("kuis");
    // layar kuis di belakang splash, pertanyaan sudah dirender
  }

  function renderQuestion() {
    const i = state.idx;
    const butir = Q.butir[i];

    $("#quiz-count").textContent = "Pertanyaan " + (i + 1) + " dari 21";
    $("#quiz-progress").style.width = ((i) / 21 * 100) + "%";
    $("#q-badge").textContent = "Butir " + butir.no;
    $("#q-text").textContent = butir.text;

    // dots bab
    const dots = $$("#chapter-dots i");
    dots.forEach(function (dot, di) {
      dot.classList.toggle("done", i > BAB[di].mulai && (di === 2 || i >= BAB[di + 1].mulai));
      dot.classList.toggle("now", i >= BAB[di].mulai && (di === 2 || i < BAB[di + 1].mulai));
    });

    // pertukaran animasi kartu
    const swap = $("#q-swap");
    swap.classList.remove("anim-swap");
    void swap.offsetWidth;
    swap.classList.add("anim-swap");

    // opsi jawaban
    const wrap = $("#q-options");
    wrap.innerHTML = "";
    Q.opsi.forEach(function (opsi) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", state.answers[i] === opsi.nilai ? "true" : "false");
      if (state.answers[i] === opsi.nilai) btn.classList.add("is-selected");
      btn.innerHTML = '<span class="opt-val">' + opsi.nilai + "</span><span>" + opsi.label + "</span>";
      btn.addEventListener("click", function () { pilihJawaban(opsi.nilai, btn); });
      wrap.appendChild(btn);
    });

    $("#btn-back").disabled = i === 0;
    $("#btn-next").textContent = i === 20 ? "Selesaikan" : "Lanjut";
    $("#btn-next").disabled = state.answers[i] === null;
  }

  function pilihJawaban(nilai, btn) {
    state.answers[state.idx] = nilai;
    $$("#q-options .opt").forEach(function (o) {
      o.classList.remove("is-selected");
      o.setAttribute("aria-checked", "false");
    });
    btn.classList.add("is-selected");
    btn.setAttribute("aria-checked", "true");
    $("#btn-next").disabled = false;

    // reaksi maskot: lebih hidup, kadang disertai semangat
    if (companion) {
      if (Math.random() < 0.35) {
        companion.bounce(650);
        if (Math.random() < 0.5) companion.say(fraseAcak(FRASE_SEMANGAT), { hold: 2400 });
      } else {
        companion.bounce(500);
      }
    }

    simpanDraft();
    updateRecordSebagian();
  }

  function maju() {
    if (state.answers[state.idx] === null) return;

    if (state.idx < 20) {
      state.idx += 1;
      const babBaru = BAB.filter(function (b) { return b.mulai === state.idx; })[0];
      if (babBaru) {
        tampilkanSplash(babBaru);
      } else {
        renderQuestion();
      }
      simpanDraft();
    } else {
      finish();
    }
  }

  function mundur() {
    if (state.idx > 0) {
      state.idx -= 1;
      renderQuestion();
      simpanDraft();
    }
  }

  function setupKuis() {
    $("#btn-next").addEventListener("click", maju);
    $("#btn-back").addEventListener("click", mundur);
    $("#btn-splash-continue").addEventListener("click", function () {
      $("#quiz-splash").classList.remove("is-show");
      splashJustShown = false;
      renderQuestion();
    });
  }

  /* ================= LAYAR 5: SELESAI ================= */

  function finish() {
    const hasil = Scoring.hitung(state.answers);
    if (!hasil) {
      // pengaman: seharusnya tak terjadi karena butir wajib dijawab
      state.idx = 0;
      renderQuestion();
      return;
    }

    const recs = getRecords();
    const rec = recs.filter(function (r) { return r.id === state.recordId; })[0];
    if (rec) {
      rec.jawaban = state.answers.slice();
      rec.hasil = hasil;
      rec.keluhan = state.story || "";
      rec.completedAt = new Date().toISOString();
      rec.status = "selesai";
      if (rec.startedAt) {
        rec.durasiDetik = Math.max(1, Math.round((new Date(rec.completedAt) - new Date(rec.startedAt)) / 1000));
      }
      saveRecords(recs);
    }
    saveDraft(null);

    // isi layar selesai
    const namaDepan = state.identity.nama ? state.identity.nama.split(" ")[0] : "Teman";
    $("#done-sub").textContent =
      "Terima kasih, " + namaDepan + "! Kamu sudah mengambil langkah kecil yang hebat untuk mengenal dirimu sendiri. Seluruh jawabanmu aman dan rahasia.";
    $("#reg-number").textContent = rec ? rec.regNumber : genRegNumber();

    if (rec && rec.durasiDetik) {
      const m = Math.floor(rec.durasiDetik / 60);
      const s = rec.durasiDetik % 60;
      $("#meta-duration").textContent = "Durasi: " + m + " mnt " + pad2(s) + " dtk";
    } else {
      $("#meta-duration").textContent = "Durasi: -";
    }
    $("#meta-date").textContent = tanggalLokal(rec ? rec.completedAt : null);

    showScreen("selesai");

    // perayaan besar
    FX.celebration();
    if (doneMascot) {
      doneMascot.cheer(2400);
      doneMascot.say("HORE! Kamu berhasil, " + namaDepan + "!", { hold: 4200 });
    }
    window.setTimeout(function () { FX.celebration(); }, 1400);
  }

  function setupSelesai() {
    $("#btn-copy").addEventListener("click", function () {
      const teks = $("#reg-number").textContent;
      const btn = this;
      function sukses() {
        btn.textContent = "Tersalin!";
        window.setTimeout(function () { btn.textContent = "Salin Nomor"; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(teks).then(sukses, function () { sukses(); });
      } else {
        const tmp = document.createElement("textarea");
        tmp.value = teks;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand("copy"); } catch (e) { /* noop */ }
        document.body.removeChild(tmp);
        sukses();
      }
      if (doneMascot) doneMascot.wave(1200);
    });

    $("#btn-finish").addEventListener("click", function () {
      state.identity = { nama: "", alamat: "", noHp: "", kategori: "", nim: "", nip: "" };
      state.story = "";
      state.answers = new Array(21).fill(null);
      state.idx = 0;
      state.startedAt = null;
      state.recordId = null;
      $("#consent-check").checked = false;
      $("#btn-start").disabled = true;
      $("#form-identitas").reset();
      toggleFieldNimNip("");
      $("#inp-story").value = "";
      $("#story-count").textContent = "0";
      showScreen("landing");
    });
  }

  /* ---------- inisialisasi ---------- */

  function isiConfigKeHalaman() {
    $("#brand-name").textContent = CFG.namaAcara;
    $("#event-chip").textContent = CFG.tanggalAcara;
    $("#mascot-name-sub").textContent = CFG.namaMaskot;
    $("#info-duration").textContent = CFG.durasiLabel;
    $("#footer-organizer").textContent = CFG.penyelenggara;
    $("#footer-kontak").textContent = CFG.kontak;
    document.title = CFG.namaAcara + " — Ayo Main Bareng " + CFG.namaMaskot + "!";
  }

  function init() {
    isiConfigKeHalaman();

    hero = FX.createMascot($("#mascot-hero-slot"), { variant: "hero" });
    companion = FX.createMascot($("#mascot-companion-slot"), { variant: "companion" });
    splashMascot = FX.createMascot($("#mascot-splash-slot"), { variant: "hero" });
    doneMascot = FX.createMascot($("#mascot-done-slot"), { variant: "hero" });

    setupLanding();
    setupIdentitas();
    setupCerita();
    setupKuis();
    setupSelesai();

    mulaiLandingAnimasi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
