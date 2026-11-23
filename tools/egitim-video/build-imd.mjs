#!/usr/bin/env node
// "İntermodülasyon distorsiyonu" videosunun SES + VERİ üreticisi. node build-imd.mjs → cikti/imd/
// Sinyaller saf sinüs notalar (A4 = 440 Hz, C#5 = 554,37 Hz, E5 = 659,26 Hz). Doyurma: dsp.mjs CURVES.soft (tanh).
// Spektrumdaki her çizgi Node'da ÖLÇÜLÜR ve sınıflanır: giriş notası · harmonik (bir notanın tam katı) · IMD (hiçbirinin katı değil).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, CURVES, rms, peak, dB, lin, writeWav } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'cikti', 'imd'); mkdirSync(OUT, { recursive: true });
const FPS = 30, A4 = 440, CS5 = 554.37, E5 = 659.26;
const f32 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);

// Notalar: her saniye yeniden vurulan, yumuşak zarflı sinüsler (yan yana çalınan akor hissi)
function notes(dur, freqs, amp = 0.32) {
  const n = Math.floor(dur * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, tb = t % 2, env = Math.min(1, tb / 0.02) * (tb < 1.7 ? 1 : Math.max(0, 1 - (tb - 1.7) / 0.3));
    let v = 0; for (const f of freqs) v += Math.sin(2 * Math.PI * f * t); x[i] = v * amp * env;
  }
  return x;
}
const sat = (x, drive) => { const d = lin(drive), y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = CURVES.soft(x[i] * d); return y; };
function matchRms(y, ref) { const k = rms(ref) / Math.max(rms(y), 1e-9), o = new Float32Array(y.length); for (let i = 0; i < y.length; i++) o[i] = y[i] * k; return o; }

// Ölçüm: 0,5–1,5 sn arası (zarf düz) Hann + DFT; 60 Hz–3 kHz tepe çizgileri
function lines(y, freqs, floor = -60) {
  const a = Math.floor(0.5 * SR), L = SR, seg = y.slice(a, a + L), res = [];
  const mag = f => { let re = 0, im = 0; for (let i = 0; i < L; i++) { const w = .5 - .5 * Math.cos(2 * Math.PI * i / L), ph = 2 * Math.PI * f * i / SR; re += seg[i] * w * Math.cos(ph); im -= seg[i] * w * Math.sin(ph); } return 20 * Math.log10(Math.hypot(re, im) * 4 / L + 1e-12); };
  const cand = new Map();   // frekans → en düşük derece                                             // aday frekanslar: |p·f1 + q·f2 (+ r·f3)| , derece ≤ 7
  const R = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
  const fs = freqs.concat([0, 0]).slice(0, 3);
  for (const p of R) for (const q of R) for (const r of (freqs.length > 2 ? R : [0])) {
    if (Math.abs(p) + Math.abs(q) + Math.abs(r) > 7) continue; const f = Math.abs(p * fs[0] + q * fs[1] + r * fs[2]);
    const key = Math.round(f * 100) / 100, ord = Math.abs(p) + Math.abs(q) + Math.abs(r);
    if (f >= 60 && f <= 3000 && !(cand.get(key) <= ord)) cand.set(key, ord);
  }
  const ref = Math.max(...freqs.map(mag));
  // düşük dereceli (girişler, katlar) önce yerleşir; birkaç Hz yanındaki yüksek dereceli adaylar aynı tepeyi tekrar saymaz
  for (const f of [...cand.keys()].sort((u, v) => cand.get(u) - cand.get(v) || u - v)) {
    if (res.some(l => Math.abs(l.f - f) < 4)) continue;
    const m = mag(f) - ref; if (m < floor) continue;
    const isIn = freqs.some(g => Math.abs(g - f) < 1), isH = !isIn && freqs.some(g => { const k = f / g; return Math.abs(k - Math.round(k)) * g < 1; });
    res.push({ f: +f.toFixed(1), db: +m.toFixed(1), kind: isIn ? 'in' : isH ? 'harm' : 'imd' });
  }
  return res.sort((u, v) => u.f - v.f);
}

const SCENES = [
  { id: 's0', dur: 5, title: 'ÜÇÜNCÜ BİR SES?', freqs: [A4, CS5], wet: t => t >= 2.2, drive: 12,
    cap: [[0, 2.2, 'İki nota çalıyorsun.'], [2.2, 5, 'Distorsiyon yeni sesler yaratıyor.']] },
  { id: 's1', dur: 11, title: 'HARMONİK DİSTORSİYON', freqs: [A4], wet: t => t >= 2, drive: 12,
    cap: [[0, 2, 'Tek nota: 440 Hz (La).'], [2, 6.5, 'HARMONİK: notanın tam katları eklenir.'], [6.5, 11, 'Katlar notayla uyumlu: müzikal duyulur.']] },
  { id: 's2', dur: 12, title: 'İNTERMODÜLASYON', freqs: [A4, CS5], wet: t => t >= 2, drive: 12,
    cap: [[0, 2, 'İki nota: La + Do#.'], [2, 7, 'IMD: iki nota birbirine karışır.'], [7, 12, 'Kırmızılar hiçbir notanın katı değil.']] },
  { id: 's3', dur: 12, title: 'AKORDA PATLAR', freqs: [A4, CS5, E5], wet: t => t >= 2, drive: 12,
    cap: [[0, 2, 'Üç nota: La majör akor.'], [2, 7, 'Nota arttıkça IMD çizgileri katlanır.'], [7, 12, 'Sonuç: çamurlu, kirli bir ses.']] },
  { id: 's4', dur: 13, title: 'ÇÖZÜM', freqs: [A4, CS5, E5], wet: () => true, drive: 12, split: [4.5, 9],
    cap: [[0, 4.5, 'BİRLİKTE doyur: IMD var.'], [4.5, 9, 'AYRI doyur: her nota kendi kanalında.'], [9, 13, 'AZ DRIVE: en güçlü IMD 10 dB düşer.']] },
  { id: 's5', dur: 6, title: 'ÖZET', freqs: [A4, CS5, E5], wet: () => false, drive: 0, outro: true,
    cap: [[0, 3, 'Harmonik = katlar. IMD = karışım.'], [3, 6, 'Akorları az drive ile doyur.']] },
];

let cursor = 0; const meta = { fps: FPS, sr: SR, scenes: [] }, chunks = [];
for (const S of SCENES) {
  const dry = notes(S.dur, S.freqs), n = dry.length;
  const together = matchRms(sat(dry, S.drive), dry);
  // ayrı doyurma: her nota kendi kanalında doyurulur, sonra toplanır
  let apart = new Float32Array(n); for (const f of S.freqs) { const one = sat(notes(S.dur, [f]), S.drive); for (let i = 0; i < n; i++) apart[i] += one[i]; } apart = matchRms(apart, dry);
  const low = matchRms(sat(dry, 3), dry);
  const heard = new Float32Array(n), state = [];
  const which = t => S.split ? (t < S.split[0] ? 'tog' : t < S.split[1] ? 'apart' : 'low') : S.wet(t) ? 'tog' : 'dry';
  const src = { dry, tog: together, apart, low };
  const fade = Math.floor(0.01 * SR);
  for (let i = 0; i < n; i++) heard[i] = src[which(i / SR)][i] * Math.min(1, i / fade, (n - 1 - i) / fade);
  chunks.push(heard);
  const L = { dry: lines(dry, S.freqs), tog: lines(together, S.freqs), apart: lines(apart, S.freqs), low: lines(low, S.freqs) };
  const mx = k => Math.max(-99, ...L[k].filter(l => l.kind === 'imd').map(l => l.db));
  const count = k => L[k].filter(l => l.kind === 'imd' && l.db > -50).length;
  meta.scenes.push({ id: S.id, start: cursor, dur: S.dur, title: S.title, cap: S.cap, freqs: S.freqs, split: S.split || null, outro: !!S.outro,
    wetFrom: S.split ? 0 : S.outro ? null : (S.id === 's0' ? 2.2 : 2), lines: L, imdCount: { tog: count('tog'), apart: count('apart'), low: count('low') }, imdMax: { tog: mx('tog'), apart: mx('apart'), low: mx('low') } });
  writeFileSync(join(OUT, `${S.id}.out.f32`), f32(heard));
  console.log(S.id, S.title.padEnd(22), 'IMD çizgisi (>-50 dB): birlikte', count('tog'), '· ayrı', count('apart'), '· az drive', count('low'),
    '| en güçlü IMD birlikte', mx('tog').toFixed(1), 'ayrı', mx('apart').toFixed(1), 'az drive', mx('low').toFixed(1));
  cursor += S.dur;
}
meta.total = cursor;
const all = new Float32Array(Math.round(cursor * SR)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
const pk = peak(all); for (let i = 0; i < all.length; i++) all[i] *= 0.5 / pk;   // tepe −6 dBFS: sinüsler kulak yormasın
writeFileSync(join(OUT, 'audio.wav'), writeWav('', all)); writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta));
console.log('toplam', cursor, 's · RMS', dB(rms(all)).toFixed(1), 'dBFS');
for (const k of ['tog']) console.log('s2 çizgileri:', JSON.stringify(meta.scenes[2].lines[k]));
console.log('s1 çizgileri:', JSON.stringify(meta.scenes[1].lines.tog));
