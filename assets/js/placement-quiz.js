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
      tr: { q: 'Şarkıların hızı için "BPM" denir. BPM ne anlama gelir?',
            options: ['Şarkının ne kadar yüksek sesle çaldığı', 'Şarkının hızı: bir dakikada kaç vuruş olduğu', 'Projede kaç ses kanalı olduğu'] },
      en: { q: 'Song speed is measured in "BPM". What does BPM mean?',
            options: ['How loud the song plays', 'The speed: how many beats fit in one minute', 'How many channels the project has'] },
      answer: 1
    },
    {
      id: 'q2', topic: { tr: 'Ableton arayüzü', en: 'Ableton interface' },
      tr: { q: 'Ableton Live\'ı açtığında birbirinden farklı iki çalışma ekranı görürsün. Bu ekranların adları nedir?',
            options: ['Session ve Arrangement', 'Mixer ve Master', 'Studio ve Stage'] },
      en: { q: 'When you open Ableton Live you get two different working screens. What are they called?',
            options: ['Session and Arrangement', 'Mixer and Master', 'Studio and Stage'] },
      answer: 0
    },
    {
      id: 'q3', topic: { tr: 'Temel', en: 'Basics' },
      tr: { q: 'Şarkılarda geçen "kick" hangi sesi anlatır?',
            options: ['Şarkıcının sesine eklenen bir efekt', 'Zil sesi', 'Davulun en kalın sesi, yani bas davul'] },
      en: { q: 'In a song, which sound is called the "kick"?',
            options: ['An effect added to the singer\'s voice', 'A cymbal', 'The deepest drum sound — the bass drum'] },
      answer: 2
    },
    {
      id: 'q4', topic: { tr: 'Ritim', en: 'Rhythm' },
      tr: { q: 'Pop, rock ve elektronik müziğin çoğu "4/4\'lük" ritim düzeniyle yazılır. Bu düzende bir ölçüde kaç vuruş vardır?',
            options: ['8', '4', '2'] },
      en: { q: 'Most pop, rock and electronic music uses the "4/4" rhythm. How many beats are in one bar of it?',
            options: ['8', '4', '2'] },
      answer: 1
    },
    {
      id: 'q5', topic: { tr: 'MIDI', en: 'MIDI' },
      tr: { q: 'MIDI klavye (bilgisayara bağlanan piyano şeklindeki cihaz) ile çaldığın notalar programa nasıl kaydedilir?',
            options: ['Mikrofonla kaydedilmiş hazır ses olarak', 'Sadece ritim bilgisi olarak', 'Nota bilgisi olarak; sesi programdaki enstrüman çalar'] },
      en: { q: 'You play notes on a MIDI keyboard (the piano-style device you plug into a computer). How are they recorded?',
            options: ['As finished audio, like a microphone recording', 'As rhythm information only', 'As note data — an instrument in the software plays the sound'] },
      answer: 2
    },
    {
      id: 'q6', topic: { tr: 'Aranjman', en: 'Arrangement' },
      tr: { q: 'Müzikte "loop" ne demektir?',
            options: ['Dönüp dönüp tekrar eden kısa bir bölüm', 'Şarkının en yüksek sesli anı', 'Şarkının son akoru'] },
      en: { q: 'What does "loop" mean in music?',
            options: ['A short section that keeps repeating', 'The loudest moment of the song', 'The final chord of the song'] },
      answer: 0
    },
    {
      id: 'q7', topic: { tr: 'Sample & Warp', en: 'Sampling & warp' },
      tr: { q: 'Ableton\'a bir ses dosyası sürüklediğinde "Warp" özelliği ne işe yarar?',
            options: ['Sesi otomatik olarak yükseltir', 'Sesin hızını projenin hızına uydurur', 'Sesi sağ ve sol hoparlöre yayar'] },
      en: { q: 'You drag an audio file into Ableton. What does the "Warp" feature do to it?',
            options: ['Makes it louder automatically', 'Matches its speed to the project\'s tempo', 'Spreads it across the left and right speakers'] },
      answer: 1
    },
    {
      id: 'q8', topic: { tr: 'Mix', en: 'Mixing' },
      tr: { q: 'EQ, sesin kalın ve ince taraflarını ayarlayan araçtır. EQ\'daki "high-pass" filtresi ne yapar?',
            options: ['İnce (tiz) sesleri keser', 'Sesin yükselen anlarını bastırır', 'Seçtiğin noktanın altındaki kalın (bas) sesleri keser'] },
      en: { q: 'EQ is the tool that shapes the low and high parts of a sound. What does its "high-pass" filter do?',
            options: ['Cuts the high (treble) part', 'Tames the loudest moments', 'Cuts the low (bass) part below the point you choose'] },
      answer: 2
    },
    {
      id: 'q9', topic: { tr: 'Mix', en: 'Mixing' },
      tr: { q: '"Kompresör" adlı araç temel olarak ne yapar?',
            options: ['Çok yükselen sesleri bastırır, ses seviyesini dengeler', 'Sesin tonunu, yani rengini değiştirir', 'Şarkının hızını sabit tutar'] },
      en: { q: 'What does the tool called a "compressor" mainly do?',
            options: ['Holds back the loudest peaks so the level stays even', 'Changes the tone, the colour of the sound', 'Keeps the song\'s tempo steady'] },
      answer: 0
    },
    {
      id: 'q10', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: '"Sidechain" yöntemi genellikle ne için kullanılır?',
            options: ['Şarkıya yankı (reverb) eklemek için', 'Bas davul her vurduğunda bas sesini kısacık kısmak için', 'Notaları ritme oturtmak için'] },
      en: { q: 'What is "sidechain" usually used for?',
            options: ['To add echo (reverb) to a track', 'To dip the bass for a moment every time the kick hits', 'To snap notes onto the beat'] },
      answer: 1
    },
    {
      id: 'q11', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: '"Send / Return" kanalı ne işe yarar?',
            options: ['Bir kanalın birebir kopyasını çıkarır', 'Ana çıkıştaki sesin seviyesini sınırlar', 'Tek bir efekti (ör. reverb) birden fazla kanalın ortak kullanmasını sağlar'] },
      en: { q: 'What is a "send / return" channel for?',
            options: ['It makes an exact copy of a channel', 'It limits the level of the main output', 'It lets several channels share one effect, e.g. a reverb'] },
      answer: 2
    },
    {
      id: 'q12', topic: { tr: 'İleri', en: 'Advanced' },
      tr: { q: 'Bir mix\'i teslim ederken ana çıkışta biraz boşluk ("headroom") bırakmak neden önemlidir?',
            options: ['Dosya boyutu küçülsün diye', 'Mastering aşamasında sesi yükseltecek yer kalsın ve ses bozulmasın diye', 'Şarkının hızı kaymasın diye'] },
      en: { q: 'Why leave a little space ("headroom") on the main output when you hand off a mix?',
            options: ['To make the file smaller', 'So mastering has room to raise the level without distortion', 'To keep the song\'s tempo from drifting'] },
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
