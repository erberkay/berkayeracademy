#!/usr/bin/env node
// scene-<ad>.html'i Chromium'da kare kare sürer, ffmpeg ile sesle birleştirir (dikey 1080×1920, 30 fps).
//   node render.mjs kompresor                  → cikti/kompresor/kompresor.mp4
//   node render.mjs kompresor --stills 3,10,20 → cikti/kompresor/still-<t>.png (hızlı önizleme)
import http from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'kompresor', args = process.argv.slice(3);
const arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const DIR = join(HERE, 'cikti', name), FPS = 30;
const req = createRequire(import.meta.url);
let pw; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = req(p); break; } catch (_) {} }
if (!pw) throw new Error('playwright bulunamadı');

const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.f32': 'application/octet-stream', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = u === '/' ? join(HERE, `scene-${name}.html`) : join(DIR, u);
  if (!existsSync(f) || statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');
await new Promise(r => srv.on('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/`;
const browser = await pw.chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', e => console.error('SAYFA HATASI:', e.message));
await page.goto(url); await page.evaluate(() => window.ready);
const total = await page.evaluate(() => meta.total);

if (arg('--stills')) {
  for (const t of arg('--stills').split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
    await page.screenshot({ path: join(DIR, `still-${t}.png`) }); console.log('still', t);
  }
} else {
  const out = arg('--out') || join(DIR, `${name}.mp4`), n = Math.round(total * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', join(DIR, 'audio.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))); });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`kare ${f}/${n}  (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
  }
  ff.stdin.end(); await done; console.log('bitti:', out, `(${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
}
await browser.close(); srv.close();
