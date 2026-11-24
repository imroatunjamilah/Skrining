/* ============================================================
   BUTIR RESMI DASS-21 — VERSI INDONESIA (UPA BK)
   ------------------------------------------------------------
   SUMBER RESMI (dokumen referensi penyelenggara, telah diterima
   dan diverifikasi):
   • "DASS 21 Versi Indonesia UPA BK.pdf"
     - Halaman 1–2 : 21 pernyataan versi Indonesia (teks di bawah
       disalin VERBATIM — kata per kata, tanpa perubahan redaksi).
     - Petunjuk Pengisian : skala 0–3 dan jangka waktu
       "satu minggu belakangan ini".
     - Halaman 3 "SCORING DASS 21" : pemetaan subskala,
       pengali x2, dan tabel ambang severity (lihat scoring.js).

   PEMETAAN SUBSKALA (persis dokumen referensi):
       Depresi   : butir 3, 5, 10, 13, 16, 17, 21
       Kecemasan : butir 2, 4, 7, 9, 15, 19, 20
       Stress    : butir 1, 6, 8, 11, 12, 14, 18

   SKALA JAWABAN (persis dokumen referensi):
       0 = Tidak Terjadi    — "Tidak sesuai dengan saya sama
                              sekali, atau tidak pernah."
       1 = Jarang Terjadi   — "Sesuai dengan saya sampai tingkat
                              tertentu, atau kadang kadang."
       2 = Sering Terjadi   — "Sesuai dengan saya sampai batas
                              yang dapat dipertimbangkan, atau
                              lumayan sering."
       3 = Selalu Terjadi   — "Sangat sesuai dengan saya, atau
                              sering sekali."

   ATURAN: nomor butir, urutan, teks pernyataan, dan pemetaan
   subskala TIDAK boleh diubah tanpa recalibrasi ulang.
   ============================================================ */

window.DASS21 = {
  instruksi:
    "Pilih jawaban yang paling sesuai dengan pengalamanmu selama satu minggu belakangan ini (7 hari terakhir). Tidak ada jawaban yang benar ataupun salah — isilah dengan cepat berdasarkan jawaban pertama yang terlintas dalam pikiranmu.",

  opsi: [
    {
      nilai: 0,
      label: "Tidak Terjadi",
      deskripsi: "Tidak sesuai dengan saya sama sekali, atau tidak pernah.",
    },
    {
      nilai: 1,
      label: "Jarang Terjadi",
      deskripsi: "Sesuai dengan saya sampai tingkat tertentu, atau kadang kadang.",
    },
    {
      nilai: 2,
      label: "Sering Terjadi",
      deskripsi: "Sesuai dengan saya sampai batas yang dapat dipertimbangkan, atau lumayan sering.",
    },
    {
      nilai: 3,
      label: "Selalu Terjadi",
      deskripsi: "Sangat sesuai dengan saya, atau sering sekali.",
    },
  ],

  subskalaLabel: {
    depresi: "Depresi",
    ansietas: "Kecemasan",
    stres: "Stress",
  },

  butir: [
    { no: 1,  subscale: "stres",    text: "Saya merasa bahwa diri saya menjadi marah karena hal-hal sepele." },
    { no: 2,  subscale: "ansietas", text: "Saya merasa mulut saya sering kering." },
    { no: 3,  subscale: "depresi",  text: "Saya sama sekali tidak dapat merasakan perasaan positif." },
    { no: 4,  subscale: "ansietas", text: "Saya mengalami kesulitan bernafas (misalnya: sering kali terengah-engah atau tidak dapat bernafas padahal tidak melakukan aktivitas fisik sebelumnya)." },
    { no: 5,  subscale: "depresi",  text: "Saya sepertinya tidak kuat lagi untuk melakukan suatu kegiatan." },
    { no: 6,  subscale: "stres",    text: "Saya cenderung bereaksi berlebihan terhadap suatu situasi." },
    { no: 7,  subscale: "ansietas", text: "Saya merasa gemetar (misalnya: pada tangan)." },
    { no: 8,  subscale: "stres",    text: "Saya merasa telah menghabiskan banyak energi di saat merasa cemas." },
    { no: 9,  subscale: "ansietas", text: "Saya merasa khawatir dengan situasi dimana saya mungkin menjadi panik dan mempermalukan diri sendiri." },
    { no: 10, subscale: "depresi",  text: "Saya merasa tidak ada hal yang dapat diharapkan di masa depan." },
    { no: 11, subscale: "stres",    text: "Saya merasa gelisah." },
    { no: 12, subscale: "stres",    text: "Saya merasa sulit untuk bersantai." },
    { no: 13, subscale: "depresi",  text: "Saya merasa sedih dan tertekan." },
    { no: 14, subscale: "stres",    text: "Saya sulit bersabar saat menghadapi gangguan terhadap hal yang sedang saya lakukan." },
    { no: 15, subscale: "ansietas", text: "Saya merasa hampir panik." },
    { no: 16, subscale: "depresi",  text: "Saya tidak merasa antusias dalam hal apapun." },
    { no: 17, subscale: "depresi",  text: "Saya merasa tidak berharga sebagai seorang manusia." },
    { no: 18, subscale: "stres",    text: "Saya merasa mudah tersinggung." },
    { no: 19, subscale: "ansietas", text: "Saya menyadari perubahan detak jantung walaupun tidak melakukan aktivitas fisik (misalnya: merasa detak jantung meningkat atau melemah)." },
    { no: 20, subscale: "ansietas", text: "Saya merasa takut tanpa alasan yang jelas." },
    { no: 21, subscale: "depresi",  text: "Saya merasa hidup ini tidak bermanfaat." },
  ],
};
