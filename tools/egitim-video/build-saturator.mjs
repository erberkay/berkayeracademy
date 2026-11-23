#!/usr/bin/env node
// "Saturator nedir?" videosunun SES + VERİ üreticisi. node build-saturator.mjs → cikti/saturator/
// Dosya anlamları (sahne başına): in = ham kick · out = KULAĞA GELEN · gr = her zaman doyurulmuş (A/B için spektrum karşılaştırması)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, kickHit, kickTrain, hatTrain, CURVES, rms, peak, dB, lin, writeWav } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'cikti', 'saturator'); mkdirSync(OUT, { recursive: true });
const FPS = 30, BPM = 125, TYPES = ['soft', 'hard', 'fold'];
const hit = kickHit(undefined, 0.03), f32 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));

const SCENES = [
  { id: 's0', dur: 5, mode: 'spec', focus: '', title: 'KICK KAYBOLUYOR MU?', dry: true,
    P: () => ({ drive: 0, type: 0, wet: 100 }),
    cap: [[0, 2.6, 'Kick küçük hoparlörde kayboluyor mu?'], [2.6, 5, 'Saturator ona harmonik ekler.']] },
  { id: 's1', dur: 12, mode: 'curve', focus: '', title: 'SATURATOR NEDİR?',
    P: () => ({ drive: 12, type: 0, wet: 100 }),
    cap: [[0, 3.6, 'Saturator = kontrollü bozulma.'], [3.6, 8, 'Sesi bir eğriden geçirir: tepeler yuvarlanır.'], [8, 12, 'Yeni harmonikler doğar: ses zenginleşir.']] },
  { id: 's2', dur: 12, mode: 'curve', focus: 'drive', title: 'DRIVE',
    P: t => ({ drive: lerp(0, 20, (t - 1) / 9), type: 0, wet: 100 }),
    cap: [[0, 3.5, 'DRIVE: sesi eğriye ne kadar sert gönderiyorsun?'], [3.5, 8, 'Arttıkça dalga kareleşir, harmonikler çoğalır.'], [8, 12, 'Çok fazla: bozulur. Azla başla.']] },
  { id: 's3', dur: 12, mode: 'curve', focus: 'type', title: 'TYPE',
    P: t => ({ drive: 10, type: t < 4 ? 0 : t < 8 ? 1 : 2, wet: 100 }),
    cap: [[0, 4, 'SOFT — yumuşak, sıcak bozulma'], [4, 8, 'HARD — sert, agresif bozulma'], [8, 12, 'FOLD — katlanan, metalik bozulma']] },
  { id: 's4', dur: 13, mode: 'ab', focus: '', title: 'KICK’TE ETKİSİ', ab: [3, 6, 9],
    P: () => ({ drive: 10, type: 0, wet: 100 }),
    cap: [[0, 3, 'SATURATORSUZ: kick yalnız alt frekansta'], [3, 6, 'SATURATORLU: harmonikler kick’i duyurur'], [6, 9, 'SATURATORSUZ'], [9, 13, 'SATURATORLU — aynı ses seviyesi, daha net kick']] },
  { id: 's5', dur: 6, mode: 'outro', focus: '', title: 'ÖZET',
    P: () => ({ drive: 10, type: 0, wet: 100 }),
    cap: [[0, 3, 'Saturator: harmonik ekler.'], [3, 6, 'Sıradaki video: REVERB']] },
];

// Çıkış telafisi (dB): her drive + tip için doyurulmuş kick, hamla AYNI RMS'te (ilk 150 ms) çalsın → "daha yüksek" değil "daha zengin"
const cache = new Map();
function compFor(d, ty) {
  const key = ty + ':' + Math.round(d * 4); if (cache.has(key)) return cache.get(key);
  const seg = hit.slice(0, Math.floor(0.15 * SR)), f = CURVES[TYPES[ty]], y = seg.map(v => f(v * lin(d)));
  const v = Math.max(-24, Math.min(6, -20 * Math.log10(rms(y) / rms(seg)))); cache.set(key, v); return v;
}
function sat(x, P, dry) {                              // zamanla değişebilen drive/tip + dry/wet + sürekli telafi
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { const p = P(i / SR), f = CURVES[TYPES[p.type]], o = dry ? 0 : compFor(p.drive, p.type);
    y[i] = (p.wet / 100) * f(x[i] * lin(p.drive)) * lin(o) + (1 - p.wet / 100) * x[i]; }
  return y;
}

let cursor = 0; const meta = { fps: FPS, sr: SR, scenes: [] }, chunks = [], narr = {};
for (const S of SCENES) {
  const { x, onsets } = kickTrain(S.dur, BPM, [1], 0.12, hit), wet = sat(x, S.P, S.dry), heard = new Float32Array(x.length);
  const isWet = t => S.dry ? false : !S.ab ? true : (t >= S.ab[0] && t < S.ab[1]) || t >= S.ab[2];
  for (let i = 0; i < x.length; i++) heard[i] = isWet(i / SR) ? wet[i] : x[i];
  const hat = hatTrain(S.dur, BPM), audio = new Float32Array(x.length), fade = Math.floor(0.006 * SR);
  for (let i = 0; i < x.length; i++) audio[i] = (heard[i] + hat[i]) * 0.9 * Math.min(1, i / fade, (x.length - 1 - i) / fade);
  chunks.push(audio);
  const frames = Math.round(S.dur * FPS), params = [];
  for (let f = 0; f < frames; f++) { const p = S.P(f / FPS); params.push([+p.drive.toFixed(2), p.type, +(S.dry ? 0 : compFor(p.drive, p.type)).toFixed(2), p.wet]); }
  meta.scenes.push({ id: S.id, start: cursor, dur: S.dur, mode: S.mode, focus: S.focus, title: S.title, cap: S.cap, onsets, params, ab: S.ab || null, dry: !!S.dry });
  writeFileSync(join(OUT, `${S.id}.in.f32`), f32(x)); writeFileSync(join(OUT, `${S.id}.out.f32`), f32(heard)); writeFileSync(join(OUT, `${S.id}.gr.f32`), f32(wet));
  console.log(`${S.id} ${S.title.padEnd(20)} ${S.dur}s  RMS ham ${dB(rms(x)).toFixed(1)} doygun ${dB(rms(wet)).toFixed(1)} dBFS  tepe ham ${dB(peak(x)).toFixed(1)} → doygun ${dB(peak(wet)).toFixed(1)} dBFS`);
  cursor += S.dur;
}
meta.total = cursor;
const all = new Float32Array(Math.round(cursor * SR)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
const pk = peak(all); if (pk > 0.95) for (let i = 0; i < all.length; i++) all[i] *= 0.95 / pk;
writeFileSync(join(OUT, 'audio.wav'), writeWav('', all)); writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta));
console.log(`toplam ${cursor} s · tepe ${dB(peak(all)).toFixed(1)} dBFS · RMS ${dB(rms(all)).toFixed(1)} dBFS`);
