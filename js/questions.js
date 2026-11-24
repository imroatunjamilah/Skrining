/* ============================================================
   BUTIR RESMI DASS-21 — Depression Anxiety Stress Scales
   ------------------------------------------------------------
   SUMBER (terverifikasi):
   - Lovibond, P. F., & Lovibond, S. H. (1995). The structure of
     the negative emotional states: Comparison of the Depression
     Anxiety Stress Scales (DASS) with the Beck Depression and
     Anxiety Inventories. Behaviour Research and Therapy, 33(3).
   - Formulir resmi DASS-21, The University of New South Wales
     (www2.psy.unsw.edu.au/dass/).
   - Pemetaan subskala resmi:
       Depresi  : butir 3, 5, 10, 13, 16, 17, 21
       Ansietas : butir 2, 4, 7, 9, 15, 19, 20
       Stres    : butir 1, 6, 8, 11, 12, 14, 18
   - Teks Inggris mengikuti formulir resmi DASS-21 (dipastikan
     lintas sumber: formulir PDF resmi & repositori psikologi).

   CATATAN TERJEMAHAN:
   Terjemahan Bahasa Indonesia di bawah disusun setia pada
   formulir resmi. Bila penyelenggara memiliki dokumen referensi
   resmi (terjemahan lain / penyesuaian redaksi), CUKUP ubah
   teks "text" di bawah — nomor butir, urutan, dan pemetaan
   subskala TIDAK boleh diubah tanpa recalibrasi ulang.

   SKALA JAWABAN (menurut spesifikasi penyelenggara):
   0 = Tidak pernah, 1 = Kadang-kadang, 2 = Sering,
   3 = Hampir selalu — merujuk pada minggu lalu (7 hari terakhir).
   ============================================================ */

window.DASS21 = {
  instruksi:
    "Pada minggu lalu (7 hari terakhir), seberapa sering pernyataan berikut sesuai dengan pengalamanmu?",

  opsi: [
    { nilai: 0, label: "Tidak pernah" },
    { nilai: 1, label: "Kadang-kadang" },
    { nilai: 2, label: "Sering" },
    { nilai: 3, label: "Hampir selalu" },
  ],

  subskalaLabel: {
    depresi: "Depresi",
    ansietas: "Ansietas",
    stres: "Stres",
  },

  butir: [
    { no: 1,  subscale: "stres",    en: "I found it hard to wind down", text: "Saya sulit untuk merasa tenang" },
    { no: 2,  subscale: "ansietas", en: "I was aware of dryness of my mouth", text: "Mulut saya terasa kering" },
    { no: 3,  subscale: "depresi",  en: "I couldn't seem to experience any positive feeling at all", text: "Saya tidak dapat merasakan perasaan positif sama sekali" },
    { no: 4,  subscale: "ansietas", en: "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)", text: "Saya mengalami kesulitan bernapas (misalnya bernapas terlalu cepat atau terengah-engah tanpa melakukan aktivitas fisik)" },
    { no: 5,  subscale: "depresi",  en: "I found it difficult to work up the initiative to do things", text: "Saya kesulitan mengambil inisiatif untuk melakukan sesuatu" },
    { no: 6,  subscale: "stres",    en: "I tended to over-react to situations", text: "Saya cenderung bereaksi berlebihan terhadap suatu situasi" },
    { no: 7,  subscale: "ansietas", en: "I experienced trembling (e.g. in the hands)", text: "Tubuh saya gemetar (misalnya tangan gemetar)" },
    { no: 8,  subscale: "stres",    en: "I felt that I was using a lot of nervous energy", text: "Saya merasa banyak menguras energi karena gugup" },
    { no: 9,  subscale: "ansietas", en: "I was worried about situations in which I might panic and make a fool of myself", text: "Saya khawatir berada dalam situasi yang bisa membuat saya panik dan tampak bodoh" },
    { no: 10, subscale: "depresi",  en: "I felt that I had nothing to look forward to", text: "Saya merasa tidak ada hal yang bisa saya harapkan di masa depan" },
    { no: 11, subscale: "stres",    en: "I found myself getting agitated", text: "Saya mendapati diri saya menjadi gelisah" },
    { no: 12, subscale: "stres",    en: "I found it difficult to relax", text: "Saya merasa sulit untuk bersantai" },
    { no: 13, subscale: "depresi",  en: "I felt down-hearted and blue", text: "Saya merasa sedih dan murung" },
    { no: 14, subscale: "stres",    en: "I was intolerant of anything that kept me from getting on with what I was doing", text: "Saya tidak dapat menoleransi apa pun yang menghalangi saya melanjutkan kegiatan yang sedang saya kerjakan" },
    { no: 15, subscale: "ansietas", en: "I felt I was close to panic", text: "Saya merasa hampir panik" },
    { no: 16, subscale: "depresi",  en: "I was unable to become enthusiastic about anything", text: "Saya tidak mampu merasa antusias terhadap apa pun" },
    { no: 17, subscale: "depresi",  en: "I felt I wasn't worth much as a person", text: "Saya merasa diri saya tidak berharga sebagai pribadi" },
    { no: 18, subscale: "stres",    en: "I felt that I was rather touchy", text: "Saya merasa diri saya mudah tersinggung" },
    { no: 19, subscale: "ansietas", en: "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)", text: "Saya menyadari denyut jantung saya tanpa melakukan aktivitas fisik (misalnya jantung berdetak lebih cepat atau berdenyut tidak beraturan)" },
    { no: 20, subscale: "ansietas", en: "I felt scared without any good reason", text: "Saya merasa takut tanpa alasan yang jelas" },
    { no: 21, subscale: "depresi",  en: "I felt that life was meaningless", text: "Saya merasa hidup ini tidak bermakna" },
  ],
};
