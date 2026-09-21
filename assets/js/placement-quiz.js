/* assets/js/placement-quiz.js — seviye belirleme sınavı: soru bankası + puanlama.
   Düz <script> (type="module" DEĞİL), window.bkQuiz olarak açılır.

   ── SORULARI BURADAN DÜZENLE ──────────────────────────────────────────────
   Her soru: { id, topic, tr:{q, options:[...]}, en:{q, options:[...]}, answer }
     answer = doğru seçeneğin sırası (0'dan başlar, tr ve en aynı sırada olmalı)
   Soru eklemek/çıkarmak için listeye satır ekleyip silmek yeterli; puan her
   zaman 100 üzerinden hesaplanır, başka hiçbir yeri değiştirmeye gerek yok.
   Soruları değiştirirsen VERSION'ı 1 artır — eski sonuçlar hangi sürümle
   çözüldüğünü saklar. ─────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var VERSION = 1;

  // Kolaydan zora sıralı. İlk üç soru Ableton'u hiç açmamış biri için.
  var QUESTIONS = [
    {
      id: 'q1', topic: { tr: 'Temel', en: 'Basics' },
      tr: { q: 'Müzikte "BPM" ne anlama gelir?',
            options: ['Şarkının ses seviyesi', 'Dakikadaki vuruş sayısı, yani tempo', 'Projedeki kanal sayısı'] },
      en: { q: 'What does "BPM" mean in music?',
            options: ['The loudness of the track', 'Beats per minute — the tempo', 'The number of channels in a project'] },
      answer: 1
    },
    {
      id: 'q2', topic: { tr: 'Ableton arayüzü', en: 'Ableton interface' },
      tr: { q: 'Ableton Live\'ın iki ana görünümü hangileridir?',
            options: ['Session ve Arrangement', 'Mixer ve Master', 'Studio ve Stage'] },
      en: { q: 'What are the two main views in Ableton Live?',
            options: ['Session and Arrangement', 'Mixer and Master', 'Studio and Stage'] },
      answer: 0
    },
    {
      id: 'q3', topic: { tr: 'Temel', en: 'Basics' },
      tr: { q: 'Bir parçada "kick" hangi sesi ifade eder?',
            options: ['Vokal efekti', 'Zil sesi', 'Bas davul'] },
      en: { q: 'In a track, what does "kick" refer to?',
            options: ['A vocal effect', 'A cymbal', 'The bass drum'] },
      answer: 2
    },
    {
      id: 'q4', topic: { tr: 'Ritim', en: 'Rhythm' },
      tr: { q: '4/4\'lük bir ölçüde kaç vuruş vardır?',
            options: ['8', '4', '2'] },
      en: { q: 'How many beats are there in one 4/4 bar?',
            options: ['8', '4', '2'] },
      answer: 1
    },
    {
      id: 'q5', topic: { tr: 'MIDI', en: 'MIDI' },
      tr: { q: 'MIDI klavyeyle çaldığın notalar projeye ne olarak kaydedilir?',
            options: ['Doğrudan ses kaydı olarak', 'Sadece ritim bilgisi olarak', 'Nota bilgisi olarak; sesi enstrüman üretir'] },
      en: { q: 'What do notes played on a MIDI keyboard record into the project as?',
            options: ['A direct audio recording', 'Rhythm information only', 'Note data — an instrument makes the sound'] },
      answer: 2
    },
    {
      id: 'q6', topic: { tr: 'Aranjman', en: 'Arrangement' },
      tr: { q: 'Bir parçada "loop" ne demektir?',
            options: ['Sürekli tekrar eden bir bölüm', 'Şarkının en yüksek sesli anı', 'Parçanın son akoru'] },
      en: { q: 'What is a "loop" in a track?',
            options: ['A section that repeats continuously', 'The loudest moment of the song', 'The final chord of the track'] },
      answer: 0
    },
    {
      id: 'q7', topic: { tr: 'Sample & Warp', en: 'Sampling & warp' },
      tr: { q: 'Ableton\'da bir ses dosyasında "Warp" ne işe yarar?',
            options: ['Sesi otomatik yükseltir', 'Sesin temposunu projenin temposuna uydurur', 'Stereo genişliği artırır'] },
      en: { q: 'What does "Warp" do to an audio clip in Ableton?',
            options: ['Automatically makes it louder', 'Fits the clip\'s tempo to the project tempo', 'Widens the stereo image'] },
      answer: 1
    },
    {
      id: 'q8', topic: { tr: 'Mix', en: 'Mixing' },
      tr: { q: 'EQ\'da "high-pass" (low cut) filtresi ne yapar?',
            options: ['Tiz frekansları keser', 'Sesi sıkıştırır', 'Belirlenen frekansın altındaki sesleri keser'] },
      en: { q: 'What does a "high-pass" (low cut) EQ filter do?',
            options: ['Cuts the high frequencies', 'Compresses the signal', 'Cuts frequencies below the set point'] },
      answer: 2
    },
    {
      id: 'q9', topic: { tr: 'Mix', en: 'Mixing' },
      tr: { q: 'Kompresör temel olarak ne yapar?',
            options: ['Yüksek sesleri bastırarak dinamik aralığı daraltır', 'Sesin tonunu değiştirir', 'Tempoyu sabitler'] },
      en: { q: 'What does a compressor mainly do?',
            options: ['Reduces loud peaks, narrowing the dynamic range', 'Changes the tone of the sound', 'Locks the tempo'] },
      answer: 0
    },
    {
      id: 'q10', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: 'Sidechain kompresyon tipik olarak ne için kullanılır?',
            options: ['Parçaya reverb eklemek için', 'Kick vurduğunda bas/pad sesini kısmak için', 'Notaları quantize etmek için'] },
      en: { q: 'What is sidechain compression typically used for?',
            options: ['Adding reverb to a track', 'Ducking the bass/pad whenever the kick hits', 'Quantizing notes'] },
      answer: 1
    },
    {
      id: 'q11', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: 'Send / Return kanalı ne sağlar?',
            options: ['Kanalın birebir kopyasını', 'Master çıkışını limitlemeyi', 'Aynı efekti birden fazla kanalın paylaşmasını'] },
      en: { q: 'What does a send / return channel give you?',
            options: ['An exact copy of a channel', 'A limiter on the master output', 'One effect shared by several channels'] },
      answer: 2
    },
    {
      id: 'q12', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: 'Mix\'i teslim ederken master çıkışında "headroom" bırakmak neden önemlidir?',
            options: ['Dosya boyutu küçülsün diye', 'Mastering işlemine pay kalsın ve clipping olmasın diye', 'Tempo kaymasın diye'] },
      en: { q: 'Why leave "headroom" on the master when you hand off a mix?',
            options: ['To make the file smaller', 'So mastering has room to work and nothing clips', 'To keep the tempo from drifting'] },
      answer: 1
    }
  ];

  // Puan aralıkları (100 üzerinden, max dahil).
  var LEVELS = [
    { key: 'zero',         max: 25,  tr: 'Sıfırdan Başlangıç', en: 'Absolute Beginner' },
    { key: 'beginner',     max: 50,  tr: 'Başlangıç',          en: 'Beginner' },
    { key: 'intermediate', max: 75,  tr: 'Orta',               en: 'Intermediate' },
    { key: 'advanced',     max: 100, tr: 'İleri',              en: 'Advanced' }
  ];

  var UNKNOWN = -1; // "Bilmiyorum" — yanlış sayılır ama ayrı raporlanır

  function levelFor(score) {
    for (var i = 0; i < LEVELS.length; i++) if (score <= LEVELS[i].max) return LEVELS[i];
    return LEVELS[LEVELS.length - 1];
  }

  // answers: { q1: 0, q2: -1, ... } → { correct, unknown, total, score, level }
  function score(answers) {
    var correct = 0, unknown = 0;
    QUESTIONS.forEach(function (q) {
      var a = answers ? answers[q.id] : undefined;
      if (a === UNKNOWN || a == null) { unknown++; return; }
      if (a === q.answer) correct++;
    });
    var total = QUESTIONS.length;
    var pct = total ? Math.round((correct / total) * 100) : 0;
    return { correct: correct, unknown: unknown, total: total, score: pct, level: levelFor(pct) };
  }

  window.bkQuiz = {
    VERSION: VERSION,
    UNKNOWN: UNKNOWN,
    questions: QUESTIONS,
    levels: LEVELS,
    levelFor: levelFor,
    score: score
  };
})();
