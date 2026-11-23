// Eğitim videoları için ses motoru (Node, bağımlılıksız). Kick sentezi + kompresör + saturator modeli.
// Not: bunlar Ableton'ın dahili algoritmalarının kopyası DEĞİL; standart bir feed-forward kompresör
// (dB alanında, yumuşak dirsek, attack/release düzleştirmesi) ve waveshaper modelidir. Parametre adları Ableton'ınkiyle aynıdır.
export const SR = 48000;
export const dB = x => 20 * Math.log10(Math.max(Math.abs(x), 1e-6));
export const lin = d => Math.pow(10, d / 20);

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Tek kick vuruşu: düşen frekanslı sinüs (gövde) + çok kısa gürültü patlaması (click = vuruş / transient)
export function kickHit(rand = rng(7), clickAmp = 0.62) {
  const n = Math.floor(0.55 * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 48 + 120 * Math.exp(-t / 0.028);
    ph += 2 * Math.PI * f / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.16) * 0.78;
    const click = (rand() * 2 - 1) * Math.exp(-t / 0.0014) * clickAmp;
    out[i] = body + click;
  }
  let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] *= 0.92 / pk;
  return out;
}
// 4'e 4 kick dizisi. vels döngüsel; dönen onsets (saniye) görselde kullanılır
export function kickTrain(dur, bpm, vels, offset = 0.12, hit = kickHit()) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), beat = 60 / bpm, onsets = [];
  for (let k = 0; ; k++) {
    const t0 = offset + k * beat; if (t0 >= dur) break;
    const s = Math.floor(t0 * SR), v = vels[k % vels.length]; onsets.push({ t: t0, vel: v });
    for (let i = 0; i < hit.length && s + i < n; i++) x[s + i] += hit[i] * v;
  }
  return { x, onsets };
}
export function hatTrain(dur, bpm, level = 0.13, rand = rng(11)) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), beat = 60 / bpm;
  for (let k = 0; ; k++) {
    const t0 = 0.12 + k * beat + beat / 2; if (t0 >= dur) break;
    const s = Math.floor(t0 * SR); let prev = 0;
    for (let i = 0; i < 0.06 * SR && s + i < n; i++) {
      const nz = rand() * 2 - 1, hp = nz - prev; prev = nz;
      x[s + i] += hp * 0.5 * Math.exp(-i / SR / 0.02) * level;
    }
  }
  return x;
}

// Feed-forward kompresör. P(t) → { T, R, A, Rl, knee, makeup } (dB, oran, ms, ms, dB, dB). Zamanla değişebilir.
// Dönen gr = o anki gain azaltması (dB, ≤ 0), attack/release ile düzleştirilmiş.
export function compress(x, P) {
  const n = x.length, y = new Float32Array(n), gr = new Float32Array(n);
  let g = 0, env = 0;
  const dec = Math.exp(-1 / (0.015 * SR));            // tepe dedektörü: anında yükselir, 15 ms'de sönümlenir
  for (let i = 0; i < n; i++) {
    const p = P(i / SR);
    env = Math.max(Math.abs(x[i]), env * dec);
    const a = Math.exp(-1 / (Math.max(p.A, 0.01) * 1e-3 * SR)), r = Math.exp(-1 / (Math.max(p.Rl, 1) * 1e-3 * SR));
    const lvl = dB(env), over = lvl - p.T, k = Math.max(p.knee, 0.01);
    let target;
    if (2 * over < -k) target = 0;
    else if (2 * Math.abs(over) <= k) target = (1 / p.R - 1) * Math.pow(over + k / 2, 2) / (2 * k);
    else target = (1 / p.R - 1) * over;
    g = target < g ? a * g + (1 - a) * target : r * g + (1 - r) * target;
    gr[i] = g;
    y[i] = x[i] * lin(g + p.makeup);
  }
  return { y, gr };
}
// Statik giriş→çıkış eğrisi (transfer curve): giriş seviyesi dB → çıkış seviyesi dB
export function transfer(lvl, T, R, knee) {
  const over = lvl - T, k = Math.max(knee, 0.01);
  if (2 * over < -k) return lvl;
  if (2 * Math.abs(over) <= k) return lvl + (1 / R - 1) * Math.pow(over + k / 2, 2) / (2 * k);
  return T + over / R;
}
export const rms = x => { let s = 0; for (const v of x) s += v * v; return Math.sqrt(s / x.length); };
export const peak = x => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p; };

// Saturator modeli: sürüş (dB) → eğri → çıkış telafisi
export const CURVES = {
  soft: v => Math.tanh(v),                       // yumuşak (Analog Clip / Soft Sine'a benzer his)
  hard: v => Math.max(-1, Math.min(1, v)),       // sert kırpma (Digital Clip)
  fold: v => Math.sin(v * Math.PI / 2),          // katlama (Sinoid Fold'a benzer)
};
export function saturate(x, type, driveDb, outDb = 0) {
  const f = CURVES[type], d = lin(driveDb), o = lin(outDb), y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = f(x[i] * d) * o;
  return y;
}

export function writeWav(path, mono, sr = SR) {
  const n = mono.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mono[i] * 32767))), 44 + i * 2);
  return buf;
}
