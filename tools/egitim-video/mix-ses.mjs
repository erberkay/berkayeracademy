#!/usr/bin/env node
// Seslendirmeyi videoya karıştırır. Kick duyulsun diye anlatım KISIK ve alt frekansı kesilmiş eklenir.
//   node mix-ses.mjs kompresor [--db -8] [--duck 0]
// Girdi : tools/egitim-video/ses/<ad>/s0.mp3 … sN.mp3 (.wav / .m4a de olur; sahne sırasıyla)
//         tools/egitim-video/cikti/<ad>/{audio.wav, meta.json, <ad>.mp4}
// Çıktı : tools/egitim-video/cikti/<ad>/<ad>-sesli.mp4 (video yeniden kodlanmaz, yalnız ses değişir)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeWav, rms, SR, dB, lin } from './dsp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'kompresor', args = process.argv.slice(3);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const REL_DB = opt('--db', -8);          // anlatım RMS'i = o sahnedeki müziğin (kick) RMS'i + REL_DB
const DUCK_DB = opt('--duck', 0);        // anlatım sırasında müziği ek kısma (0 = kick'e dokunma)
const OUT = join(HERE, 'cikti', name), VOICE = join(HERE, 'ses', name);
const meta = JSON.parse(readFileSync(join(OUT, 'meta.json'), 'utf8'));
const music = (() => { const b = readFileSync(join(OUT, 'audio.wav')); const n = (b.length - 44) / 2, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = b.readInt16LE(44 + i * 2) / 32768; return a; })();

function decode(file, dur, tempo) {
  // alt frekans kesilir (kick'i örtmesin), sahneden uzunsa hafifçe hızlandırılır
  const af = ['highpass=f=130', 'lowpass=f=9500'].concat(tempo > 1.001 ? [`atempo=${tempo.toFixed(4)}`] : []).join(',');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  const b = r.stdout; return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const probeDur = f => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString());
const speechRms = v => { const w = Math.floor(0.03 * SR), act = []; for (let i = 0; i + w < v.length; i += w) { const r = rms(v.subarray(i, i + w)); if (dB(r) > -45) act.push(r * r); } return act.length ? Math.sqrt(act.reduce((a, b) => a + b, 0) / act.length) : 1e-6; };

const mix = Float32Array.from(music); let found = 0;
meta.scenes.forEach((S, i) => {
  const f = ['mp3', 'wav', 'm4a', 'ogg'].map(e => join(VOICE, `s${i}.${e}`)).find(existsSync);
  if (!f) { console.log(`s${i}: ses dosyası yok — atlandı`); return; }
  const lead = 0.15, room = S.dur - lead - 0.1, d0 = probeDur(f);
  const tempo = d0 > room ? Math.min(1.25, d0 / room) : 1;
  const v = decode(f, S.dur, tempo);
  const s0 = Math.floor(S.start * SR), sc = music.subarray(s0, s0 + Math.floor(S.dur * SR));
  const g = lin(REL_DB) * rms(sc) / speechRms(v);                // kısık: müziğin RMS'inin REL_DB altı
  const at = s0 + Math.floor(lead * SR), fade = Math.floor(0.02 * SR);
  for (let k = 0; k < v.length && at + k < mix.length; k++) {
    const e = Math.min(1, k / fade, (v.length - 1 - k) / fade);
    mix[at + k] += v[k] * g * e;
  }
  if (DUCK_DB) for (let k = 0; k < v.length && at + k < mix.length; k++) if (Math.abs(v[k]) > 0.01) mix[at + k] -= music[at + k] * (1 - lin(DUCK_DB)) * 0.0; // (kapalı: kick'e dokunma)
  found++; console.log(`s${i}: ${f.split('/').pop()}  ${d0.toFixed(2)} sn${tempo > 1 ? `  → ${(d0 / tempo).toFixed(2)} sn (x${tempo.toFixed(2)})` : ''}  anlatım ${dB(g * speechRms(v)).toFixed(1)} dBFS RMS (müzik ${dB(rms(sc)).toFixed(1)})`);
});
let pk = 0; for (const v of mix) pk = Math.max(pk, Math.abs(v)); if (pk > 0.95) for (let i = 0; i < mix.length; i++) mix[i] *= 0.95 / pk;
writeFileSync(join(OUT, 'audio-sesli.wav'), writeWav('', mix));
const out = join(OUT, `${name}-sesli.mp4`);
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', join(OUT, `${name}.mp4`), '-i', join(OUT, 'audio-sesli.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'pan=stereo|c0=c0|c1=c0', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
if (r.status !== 0) throw new Error(String(r.stderr));
console.log(`\n${found}/${meta.scenes.length} sahne seslendirildi → ${out}`);
