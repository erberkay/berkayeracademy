// Duyuru sesi: ElevenLabs müziği (cikti/ses/muzik-pulse.wav) + sentez geçiş efektleri -> cikti/ses/mix.wav
// Olay zamanları scene.html'deki T tablosu × k ile aynıdır.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const SR = 48000, LOOP = 28.11, k = 28.11 / 26, N = Math.round(LOOP * SR);
const T = { titleOut: 3.6, cardIn: [4.5, 6.9, 9.3, 11.7], itemsOut: 14.1, whyH: 14.6, whyS: [15.1, 15.55, 16.0], whyLine: 16.6, whyOut: 18.8,
  closeH: 19.3, closeNote: 19.7, closeGo: 20.1, closeBrand: 20.5, closeOut: 24.6, titleIn: 25.2 };
const S = (v) => v * k;
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const L = new Float32Array(N), R = new Float32Array(N);
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
function impact(t, g = 1) {               // sub düşüşü 95->38 Hz + kısa gürültü çatlağı
  const i0 = Math.round(t * SR); let ph = 0, hp = 0, prev = 0;
  for (let n = 0; n < SR * 0.9; n++) {
    const tt = n / SR, f = 38 + 57 * Math.exp(-tt * 9); ph += 2 * Math.PI * f / SR;
    let sub = Math.sin(ph) * Math.exp(-tt * 4.2) * Math.min(1, n / 48);
    sub = Math.tanh(sub * 1.6) * 0.9;
    const nz = rnd(); hp = 0.85 * (hp + nz - prev); prev = nz;
    const crack = hp * Math.exp(-tt * 38) * 0.55;
    add(i0 + n, g * (sub + crack), g * (sub + crack * 0.9));
  }
}
function glitch(t, g = 1) {               // 6 kesik, bit-crush'lı kare dalga + gürültü
  const i0 = Math.round(t * SR);
  for (let s = 0; s < 6; s++) {
    const st = i0 + Math.round(s * 0.034 * SR), len = Math.round(0.022 * SR), f = [1800, 900, 2400, 600, 3100, 1200][s];
    for (let n = 0; n < len; n++) {
      const q = Math.sign(Math.sin(2 * Math.PI * f * n / SR)) * 0.5 + Math.round(rnd() * 3) / 3 * 0.35;
      const e = Math.sin(Math.PI * n / len);
      add(st + n, g * q * e * (s % 2 ? 0.6 : 1), g * q * e * (s % 2 ? 1 : 0.6));
    }
  }
}
function whoosh(t, dur = 0.38, g = 1) {   // yükselen bant-geçiren gürültü (kart girişi)
  const i0 = Math.round((t - dur * 0.6) * SR); let lp = 0, lp2 = 0;
  for (let n = 0; n < dur * SR; n++) {
    const x = n / (dur * SR), a = Math.sin(Math.PI * x) ** 2, c = 0.02 + 0.25 * x;
    const nz = rnd(); lp += c * (nz - lp); lp2 += c * 0.5 * (lp - lp2);
    const v = (lp - lp2) * a * 2.2 * g;
    add(i0 + n, v * (1 - 0.5 * x), v * (0.5 + 0.5 * x));
  }
}
function riser(tEnd, dur = 1.6, g = 1) {  // beyaz gürültü yükselişi, sonda kesilir
  const i0 = Math.round((tEnd - dur) * SR); let hp = 0, prev = 0;
  for (let n = 0; n < dur * SR; n++) {
    const x = n / (dur * SR), c = 0.6 + 0.39 * x, nz = rnd(); hp = c * (hp + nz - prev); prev = nz;
    const v = hp * (x ** 2.2) * 0.45 * g;
    add(i0 + n, v, v * (0.8 + 0.2 * Math.sin(x * 40)));
  }
}
// olaylar
[T.titleOut + .05, T.itemsOut - .05, T.whyOut - .05, T.closeOut - .02].forEach((t) => { impact(S(t), 0.9); glitch(S(t) + 0.02, 0.22); });
T.cardIn.forEach((t) => { whoosh(S(t) + 0.12, 0.38, 0.5); glitch(S(t) + 0.12, 0.09); });
T.whyS.forEach((t, i) => impact(S(t) + 0.05, 0.45 + 0.1 * i));
riser(S(T.closeGo), 1.7, 0.8); impact(S(T.closeGo) + 0.02, 1.0);
riser(S(T.itemsOut) - 0.05, 1.0, 0.45);
// müzik
const mb = execFileSync('ffmpeg', ['-v','error','-i','cikti/ses/muzik-pulse.wav','-f','f32le','-ac','2','-ar',String(SR),'-'], { maxBuffer: 1 << 29 });
const m = new Float32Array(mb.buffer, mb.byteOffset, mb.length / 4);
const out = new Float32Array(N * 2), fadeN = Math.round(0.35 * SR);
for (let n = 0; n < N; n++) {
  const f = n > N - fadeN ? (N - n) / fadeN : 1;
  out[2 * n] = (m[2 * n] || 0) * 0.78 * f + L[n] * 0.5;
  out[2 * n + 1] = (m[2 * n + 1] || 0) * 0.78 * f + R[n] * 0.5;
}
writeFileSync('cikti/ses/mix-ham.f32', Buffer.from(out.buffer));
execFileSync('ffmpeg', ['-v','error','-y','-f','f32le','-ar',String(SR),'-ac','2','-i','cikti/ses/mix-ham.f32',
  '-af','loudnorm=I=-14:TP=-1.0:LRA=9','-ar','48000','-c:a','pcm_s24le','cikti/ses/mix.wav']);
console.log('mix.wav hazır', LOOP, 's');
