#!/usr/bin/env node
// "Kompresör nedir?" videosunun SES + VERİ üreticisi. Görsel kareler scene-kompresor.html'de aynı sayılardan çizilir.
//   node build-kompresor.mjs   →  cikti/kompresor/{audio.wav, meta.json, <sahne>.{in,out,gr}.f32}
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, kickHit, kickTrain, hatTrain, compress, rms, peak, dB, lin, writeWav } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'cikti', 'kompresor'); mkdirSync(OUT, { recursive: true });
const FPS = 30, BPM = 125, KNEE = 6;
const hit = kickHit();
const f32 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));

// ── Sahneler ────────────────────────────────────────────────────────────────────────────
const MIX = [1, 0.5, 0.85, 0.45];        // vuruşlar arası büyük dinamik farkı
const SCENES = [
  { id: 's0', dur: 5, mode: 'wave', focus: '', title: 'KICK’İN DİNAMİĞİ', vels: MIX, off: true,
    P: () => ({ T: 0, R: 1, A: 10, Rl: 120 }),
    cap: [[0, 2.6, 'Kick bazen çok sert, bazen çok yumuşak mı?'], [2.6, 5, 'Kompresör bunu dengeler.']] },
  { id: 's1', dur: 11, mode: 'wave', focus: '', title: 'KOMPRESÖR NEDİR?', vels: MIX, match: true,
    P: () => ({ T: -10, R: 4, A: 4, Rl: 120 }),
    cap: [[0, 3.6, 'Kompresör = otomatik fader.'], [3.6, 7.6, 'Ses eşiği geçince fader kendiliğinden iner.'], [7.6, 11, 'Altta kırmızı çubuk: ne kadar kıstığını gösterir.']] },
  { id: 's2', dur: 10, mode: 'wave', focus: 'T', title: 'THRESHOLD', vels: MIX, match: true,
    P: t => ({ T: lerp(-3, -20, (t - 1) / 7.5), R: 4, A: 10, Rl: 120 }),
    cap: [[0, 3, 'THRESHOLD: nereden itibaren kısılsın?'], [3, 7, 'Eşik düştükçe kompresör daha çok çalışır.'], [7, 10, '−3 dB: neredeyse dokunmaz · −20 dB: sıkı tutar']] },
  { id: 's3', dur: 12, mode: 'curve', focus: 'R', title: 'RATIO', vels: MIX, match: true,
    P: t => ({ T: -14, R: t < 2.5 ? 1 : t < 5.5 ? 2 : t < 8.5 ? 4 : 10, A: 10, Rl: 120 }),
    cap: [[0, 2.5, 'RATIO 1:1 — hiçbir şey olmaz'], [2.5, 5.5, '2:1 — eşiği aşan 2 dB, 1 dB olur'], [5.5, 8.5, '4:1 — aşan her 4 dB, 1 dB olur'], [8.5, 12, '10:1 — neredeyse duvar (limiter gibi)']] },
  { id: 's4', dur: 13, mode: 'zoom', focus: 'A', title: 'ATTACK', vels: [1], match: true,
    P: t => ({ T: -12, R: 6, A: t < 6.5 ? 40 : 0.5, Rl: 100 }),
    cap: [[0, 3, 'ATTACK: kompresör ne kadar geç tepki versin?'], [3, 6.5, 'Yavaş (40 ms): vuruş kısılmadan geçer → PUNCH'], [6.5, 10, 'Hızlı (0,5 ms): vuruş da kısılır → yassı kick'], [10, 13, 'Punch için kick’te attack’ı yavaş tut.']] },
  { id: 's5', dur: 10, mode: 'gr', focus: 'Rl', title: 'RELEASE', vels: [1, 0.9, 1, 0.9], match: true,
    P: t => ({ T: -14, R: 4, A: 5, Rl: t < 5 ? 40 : 450 }),
    cap: [[0, 2.5, 'RELEASE: kısılan ses ne kadar hızlı geri gelsin?'], [2.5, 5, 'Hızlı (40 ms): kuyruk hemen yükselir'], [5, 8, 'Yavaş (450 ms): sonraki vuruşa kadar kısık kalır'], [8, 10, 'Tempoya göre ayarla.']] },
  { id: 's6', dur: 12, mode: 'bars', focus: '', title: 'ÖNCE / SONRA', vels: MIX, match: true, ab: [3, 6, 9],   // 0–3 ham, 3–6 kompresörlü, 6–9 ham, 9–12 kompresörlü
    P: () => ({ T: -14, R: 4, A: 20, Rl: 120 }),
    cap: [[0, 3, 'KOMPRESÖRSÜZ: vuruşlar arasında büyük fark'], [3, 6, 'KOMPRESÖRLÜ: dengeli ve güçlü'], [6, 9, 'KOMPRESÖRSÜZ'], [9, 12, 'KOMPRESÖRLÜ — aynı ses seviyesi, daha tutarlı']] },
  { id: 's7', dur: 5, mode: 'outro', focus: '', title: 'ÖZET', vels: MIX, match: true,
    P: () => ({ T: -14, R: 4, A: 20, Rl: 120 }),
    cap: [[0, 2.5, 'Kompresör: dinamiği kontrol eder.'], [2.5, 5, 'Sıradaki video: SATURATOR']] },
];

// ── Üretim ─────────────────────────────────────────────────────────────────────────────
let cursor = 0; const meta = { fps: FPS, sr: SR, scenes: [] }; const chunks = [];
for (const S of SCENES) {
  const { x, onsets } = kickTrain(S.dur, BPM, S.vels, 0.12, hit);
  const mk = m => t => ({ ...S.P(t), knee: KNEE, makeup: m });
  let m = 0;
  if (S.match) {                                              // aynı RMS: kompresörlü "daha yüksek" değil "daha dengeli" duyulsun
    const q = compress(x, mk(0));
    m = Math.min(9, Math.max(0, 20 * Math.log10(rms(x) / rms(q.y))));
    while (peak(q.y) * lin(m) > 0.97 && m > 0) m -= 0.1;
  }
  const { y, gr } = compress(x, mk(m));
  // heard = kulağa gelen kick; ab varsa ham ↔ kompresörlü geçişi (her kenarda 6 ms çapraz geçiş)
  const heard = new Float32Array(x.length), grShown = new Float32Array(x.length);
  const on = t => !S.ab ? !S.off : (t >= S.ab[0] && t < S.ab[1]) || t >= S.ab[2];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, isOn = on(t) && !S.off;
    heard[i] = isOn ? y[i] : x[i]; grShown[i] = isOn ? gr[i] : 0;
  }
  let rawGain = 1;
  if (S.ab) {                                                // adil A/B: ham kick, kompresörlüyle aynı RMS'te çalar
    rawGain = Math.min(1, rms(y) / rms(x));
    for (let i = 0; i < x.length; i++) if (!on(i / SR)) heard[i] = x[i] * rawGain;
  }
  const hat = hatTrain(S.dur, BPM);
  const audio = new Float32Array(x.length);
  const fade = Math.floor(0.006 * SR);
  for (let i = 0; i < x.length; i++) {
    const k = Math.min(1, i / fade, (x.length - 1 - i) / fade);
    audio[i] = (heard[i] + hat[i]) * 0.9 * k;
  }
  chunks.push(audio);
  const frames = Math.round(S.dur * FPS), params = [];
  for (let f = 0; f < frames; f++) { const p = S.P(f / FPS); params.push([+p.T.toFixed(2), +p.R.toFixed(2), +p.A.toFixed(2), +p.Rl.toFixed(1)]); }
  const info = { id: S.id, start: cursor, dur: S.dur, mode: S.mode, focus: S.focus, title: S.title, cap: S.cap, onsets, params, off: !!S.off, ab: S.ab || null, makeup: +m.toFixed(2) };
  if (S.mode === 'bars') {                                    // ilk 4 vuruşun tepe seviyesi (dB): ham ve kompresörlü
    // vuruşun "yüksekliği" = ilk 150 ms RMS (tepe değil: attack vuruşun ilk ms'sini zaten geçirir)
    const lv = (arr, t0, g = 1) => dB(rms(arr.slice(Math.floor(t0 * SR), Math.floor((t0 + 0.15) * SR))) * g);
    info.bars = { raw: onsets.slice(0, 4).map(o => +lv(x, o.t, rawGain).toFixed(2)), comp: onsets.slice(0, 4).map(o => +lv(y, o.t).toFixed(2)), rawGain: +rawGain.toFixed(3) };
  }
  writeFileSync(join(OUT, `${S.id}.in.f32`), f32(x)); writeFileSync(join(OUT, `${S.id}.out.f32`), f32(heard)); writeFileSync(join(OUT, `${S.id}.gr.f32`), f32(grShown));
  meta.scenes.push(info);
  console.log(`${S.id} ${S.title.padEnd(18)} ${S.dur}s  makeup ${m.toFixed(1)} dB  min GR ${gr.reduce((a, b) => Math.min(a, b), 0).toFixed(1)} dB` + (info.bars ? `  bars raw ${info.bars.raw} comp ${info.bars.comp}` : ''));
  cursor += S.dur;
}
meta.total = cursor;
const all = new Float32Array(Math.round(cursor * SR)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
const pk = peak(all); if (pk > 0.95) for (let i = 0; i < all.length; i++) all[i] *= 0.95 / pk;
writeFileSync(join(OUT, 'audio.wav'), writeWav(join(OUT, 'audio.wav'), all));
writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta));
console.log(`toplam ${cursor} s · audio.wav tepe ${dB(peak(all)).toFixed(1)} dBFS · RMS ${dB(rms(all)).toFixed(1)} dBFS`);
