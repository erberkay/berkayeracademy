#!/usr/bin/env node
/*
 * Berkay Er Academy — duyuru animasyonu üretici.
 * Paket bağımlılığı YOK: Node 22+ (global fetch + WebSocket), Google Chrome, ffmpeg.
 *
 *   node tools/duyuru/render.mjs [all|gif|web|dikey|poster]
 *   node tools/duyuru/render.mjs still  --w 1920 --h 1080 --t 0,1.2,2.8 --out KLASÖR [--dsf 1] [--q gif=1]
 *   node tools/duyuru/render.mjs frames --w 600 --h 338 --dsf 2 --fps 10 --out KLASÖR [--n 30] [--q gif=1]
 *
 * scene.html'i headless Chrome'da (ham CDP) açar, her kare için window.seek(t) çağırıp
 * Page.captureScreenshot ile PNG alır, ardından ffmpeg ile GIF / MP4 / JPG üretir.
 * Ortam değişkenleri: CHROME_BIN, FFMPEG_BIN, FFPROBE_BIN, TMPDIR (geçici dosyalar iş bitince silinir).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT_DIR = join(ROOT, 'tools', 'duyuru', 'cikti'); // git'e ve siteye GİRMEZ (.gitignore + firebase.json tools/**)
const SCENE_URL = pathToFileURL(join(HERE, 'scene.html')).href;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.FFMPEG_BIN || '/opt/homebrew/bin/ffmpeg';
const FFPROBE = process.env.FFPROBE_BIN || '/opt/homebrew/bin/ffprobe';

/* ---- çıktılar -------------------------------------------------------- */
const JOBS = {
  // 600x338 görünür boyut; 2x (1200x676) çekilip lanczos ile küçültülür. ?gif=1 -> tane yok, ışık sabit
  gif:    { kind: 'gif', w: 600,  h: 338,  dsf: 2, fps: 10, query: '&gif=1', file: 'etkinlik-duyuru-mail.gif', targetMB: 1.6, hardMB: 2.5 },
  web:    { kind: 'mp4', w: 1920, h: 1080, dsf: 1, fps: 30, file: 'etkinlik-duyuru-web.mp4' },
  dikey:  { kind: 'mp4', w: 1080, h: 1920, dsf: 1, fps: 30, file: 'etkinlik-duyuru-dikey.mp4' },
  // 2400x1350 çekilip 1200x675'e lanczos ile indirilir
  poster: { kind: 'jpg', w: 1200, h: 675,  dsf: 2, t: 0,     file: 'etkinlik-duyuru-poster.jpg' },
};

const log = (...a) => console.error('[duyuru]', ...a);
const pad4 = (n) => String(n).padStart(4, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(promise, ms, msg) {
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ---- Chrome + CDP ---------------------------------------------------- */
function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

async function launchChrome() {
  if (!existsSync(CHROME)) throw new Error('Chrome bulunamadı: ' + CHROME + ' (CHROME_BIN ile belirtin)');
  const port = await freePort();
  const userDir = mkdtempSync(join(tmpdir(), 'duyuru-chrome-'));
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--force-color-profile=srgb',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-features=Translate,MediaRouter',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, 'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let exited = false;
  proc.once('exit', () => { exited = true; });

  let ws = null;
  const stopChrome = async () => {
    try { ws && ws.close(); } catch { /* yoksay */ }
    if (!exited) {
      proc.kill('SIGTERM');
      for (let i = 0; i < 20 && !exited; i++) await sleep(100);
      if (!exited) proc.kill('SIGKILL');
    }
    try { rmSync(userDir, { recursive: true, force: true }); } catch { /* yoksay */ }
  };

  try {
    let wsUrl = null;
    for (let i = 0; i < 100 && !wsUrl; i++) {
      if (exited) throw new Error('Chrome beklenmedik şekilde kapandı');
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json/version`);
        wsUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { await sleep(150); }
    }
    if (!wsUrl) throw new Error('Chrome uzaktan hata ayıklama portu açılmadı');

    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', () => rej(new Error('CDP WebSocket bağlanamadı')), { once: true });
    });
  } catch (e) {
    await stopChrome();
    throw e;
  }

  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const text = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8');
    const msg = JSON.parse(text);
    if (msg.id) {
      const p = pending.get(msg.id);
      if (!p) return;                       // zaman aşımına uğramış komutun geç gelen yanıtı
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result);
    } else {
      for (const fn of listeners) fn(msg);
    }
  });
  ws.addEventListener('close', () => {
    for (const [, p] of pending) p.reject(new Error('CDP bağlantısı kapandı'));
    pending.clear();
  });

  const send = (method, params = {}, sessionId) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
  };

  return { send, on: (fn) => listeners.push(fn), close: stopChrome };
}

async function openPage(cdp, { w, h, dsf, query = '' }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  // her CDP komutuna zaman aşımı: yanıt kaybolursa sonsuza kadar beklemesin
  const call = (m, p, ms = 30000) => withTimeout(cdp.send(m, p, sessionId), ms, `CDP zaman aşımı: ${m}`);
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: dsf, mobile: false, screenWidth: w, screenHeight: h,
  });
  const loaded = new Promise((res) => {
    cdp.on((m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res(); });
  });
  // sayfa istisnaları, konsol uyarıları ve başarısız ağ istekleri görünsün (sessiz başarısızlık olmasın)
  const reqUrl = new Map();
  cdp.on((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Network.requestWillBeSent') reqUrl.set(m.params.requestId, m.params.request.url);
    else if (m.method === 'Network.loadingFailed') log('AĞ HATASI:', (reqUrl.get(m.params.requestId) || m.params.requestId).slice(0, 140), m.params.errorText);
    else if (m.method === 'Network.responseReceived' && process.env.DUYURU_DEBUG) log('ağ', m.params.response.status, m.params.response.url.slice(0, 140));
    else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      log('SAYFA İSTİSNASI:', d.exception?.description || d.text, `(satır ${d.lineNumber}:${d.columnNumber})`);
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      log('konsol', m.params.type + ':', m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });
  const url = `${SCENE_URL}?w=${w}&h=${h}${query}`;
  await call('Page.navigate', { url });
  await withTimeout(loaded, 60000, 'sayfa yüklenemedi: ' + url);

  const ev = async (expression, awaitPromise = false, ms = 30000) => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, awaitPromise ? 90000 : ms);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('sayfa hatası: ' + (d.exception?.description || d.exception?.value || d.text));
    }
    return r.result.value;
  };

  if (!(await ev('window.ready instanceof Promise && typeof window.seek === "function"'))) {
    throw new Error('sahne kurulamadı (window.ready / window.seek yok) - yukarıdaki SAYFA İSTİSNASI satırına bakın');
  }
  await ev('window.ready', true);   // yazı tipleri + yerleşim hazır olana kadar bekler (sorun varsa hata fırlatır)
  const loop = await ev('window.LOOP');
  const px = await ev('JSON.stringify([innerWidth, innerHeight, devicePixelRatio])');
  log(`sayfa hazır: ${w}x${h} @${dsf}x  (innerWidth/innerHeight/dpr = ${px}), LOOP=${loop} sn`);

  // kare yakala: takılırsa (yanıt gelmezse) aynı kareyi yeniden dener
  const shot = async (t, file) => {
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await ev(`seek(${t})`, false, 15000);
        const r = await call('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false }, 20000);
        writeFileSync(file, Buffer.from(r.data, 'base64'));
        return;
      } catch (e) {
        lastErr = e;
        log(`kare t=${t} deneme ${attempt}/4 başarısız: ${e.message}`);
        await call('Page.bringToFront', {}, 5000).catch(() => {});
        await sleep(400 * attempt);
      }
    }
    throw new Error(`kare t=${t} yakalanamadı: ${lastErr && lastErr.message}`);
  };
  const closeTarget = () => cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  return { ev, shot, loop, closeTarget };
}

/* ---- ffmpeg ---------------------------------------------------------- */
function runFfmpeg(args) {
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error('ffmpeg başarısız: ' + args.join(' '));
}

function encodeGif(frameDir, fps, out, size) {
  const [w, h] = size;
  const vf =
    `scale=${w}:${h}:flags=lanczos,split[a][b];` +
    `[a]palettegen=max_colors=96:stats_mode=diff[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
  // -loop 0 = sonsuz döngü (NETSCAPE2.0 uzantısı)
  runFfmpeg(['-framerate', String(fps), '-i', join(frameDir, 'f%04d.png'), '-vf', vf, '-loop', '0', out]);
}

function encodeMp4(frameDir, fps, out) {
  // sRGB PNG -> BT.709 / TV aralığı; etiketler setparams ile kareye yazılır (oynatıcılar doğru matrisi kullansın)
  const vf =
    'scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,' +
    'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv';
  runFfmpeg([
    '-framerate', String(fps), '-i', join(frameDir, 'f%04d.png'),
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-x264-params', 'aq-mode=3:aq-strength=1.0',
    '-r', String(fps), '-an', '-movflags', '+faststart', out,
  ]);
}

function encodeJpg(png, out, size) {
  const [w, h] = size;
  // -q:v 3 ≈ libjpeg kalite 89-90
  runFfmpeg(['-i', png, '-vf', `scale=${w}:${h}:flags=lanczos`, '-frames:v', '1', '-q:v', '3', '-pix_fmt', 'yuvj420p', out]);
}

function probe(file) {
  const r = spawnSync(FFPROBE, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames:format=duration,size',
    '-of', 'default=noprint_wrappers=1:nokey=0', file,
  ], { encoding: 'utf8' });
  return (r.stdout || '').trim().split('\n').join('  ');
}

const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB');

/* ---- işler ----------------------------------------------------------- */
async function renderJob(cdp, name, tmpRoot) {
  const job = JOBS[name];
  const out = join(OUT_DIR, job.file);
  mkdirSync(OUT_DIR, { recursive: true });
  const frameDir = mkdtempSync(join(tmpRoot, `frames-${name}-`));
  const page = await openPage(cdp, { w: job.w, h: job.h, dsf: job.dsf, query: job.query || '' });
  try {
    if (job.kind === 'jpg') {
      const png = join(frameDir, 'f0000.png');
      await page.shot(job.t, png);
      encodeJpg(png, out, [job.w, job.h]);
    } else {
      const n = Math.round(page.loop * job.fps);
      const t0 = Date.now();
      for (let i = 0; i < n; i++) {
        await page.shot(i / job.fps, join(frameDir, `f${pad4(i)}.png`));
        if (i % 30 === 29 || i === n - 1) log(`${name}: kare ${i + 1}/${n}  (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
      }
      if (job.kind === 'gif') encodeGif(frameDir, job.fps, out, [job.w, job.h]);
      else encodeMp4(frameDir, job.fps, out);
    }
  } finally {
    await page.closeTarget();
    rmSync(frameDir, { recursive: true, force: true });
  }
  return { name, out };
}

function parseSceneOptions(opts) {
  return {
    w: +opts.w || 1920, h: +opts.h || 1080, dsf: +opts.dsf || 1, fps: +opts.fps || 30,
    dir: resolve(opts.out || '.'), query: opts.q ? '&' + opts.q : '',
  };
}

async function renderStills(cdp, opts) {
  const { w, h, dsf, dir, query } = parseSceneOptions(opts);
  const times = String(opts.t || '0').split(',').map(Number);
  mkdirSync(dir, { recursive: true });
  const page = await openPage(cdp, { w, h, dsf, query });
  try {
    for (const t of times) {
      const f = join(dir, `still-${w}x${h}-${String(t).replace('.', '_')}.png`);
      await page.shot(t, f);
      console.log(f);
    }
  } finally {
    await page.closeTarget();
  }
}

async function renderFramesTo(cdp, opts) {
  const { w, h, dsf, fps, dir, query } = parseSceneOptions(opts);
  mkdirSync(dir, { recursive: true });
  const page = await openPage(cdp, { w, h, dsf, query });
  try {
    const all = Math.round(page.loop * fps);
    const n = opts.n ? Math.min(+opts.n, all) : all;
    for (let i = 0; i < n; i++) await page.shot(i / fps, join(dir, `f${pad4(i)}.png`));
    console.log(`${n} kare -> ${dir}`);
  } finally {
    await page.closeTarget();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all';
  const opts = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];

  const valid = ['all', 'gif', 'web', 'dikey', 'poster', 'still', 'frames'];
  if (!valid.includes(cmd)) {
    console.error([
      'Kullanım: node tools/duyuru/render.mjs [all|gif|web|dikey|poster]',
      '          node tools/duyuru/render.mjs still  --w 1920 --h 1080 --t 0,1.2 --out KLASÖR [--dsf 1] [--q gif=1]',
      '          node tools/duyuru/render.mjs frames --w 600 --h 338 --dsf 2 --fps 10 --out KLASÖR [--n 30] [--q gif=1]',
    ].join('\n'));
    process.exit(2);
  }
  if (typeof WebSocket === 'undefined' || typeof fetch === 'undefined') throw new Error('Node 22+ gerekli (global WebSocket/fetch yok)');
  if (!existsSync(FFMPEG)) throw new Error('ffmpeg bulunamadı: ' + FFMPEG + ' (FFMPEG_BIN ile belirtin)');

  const tmpRoot = mkdtempSync(join(tmpdir(), 'duyuru-'));
  let cdp = null;
  const cleanup = async () => {
    if (cdp) await cdp.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  };
  process.once('SIGINT', async () => { await cleanup(); process.exit(130); });
  process.once('SIGTERM', async () => { await cleanup(); process.exit(143); });

  try {
    cdp = await launchChrome();
    if (cmd === 'still') { await renderStills(cdp, opts); return; }
    if (cmd === 'frames') { await renderFramesTo(cdp, opts); return; }

    const names = cmd === 'all' ? ['poster', 'gif', 'web', 'dikey'] : [cmd];
    const results = [];
    for (const n of names) results.push(await renderJob(cdp, n, tmpRoot));
    console.log('\nÇıktılar (' + OUT_DIR + '):');
    for (const r of results) {
      const job = JOBS[r.name];
      const size = statSync(r.out).size;
      console.log(`  ${job.file.padEnd(30)} ${fmtSize(size).padStart(10)}   ${probe(r.out)}`);
      if (job.hardMB && size > job.hardMB * 1048576) console.log(`  !! UYARI: ${job.file} ${job.hardMB} MB üst sınırını aşıyor`);
      else if (job.targetMB && size > job.targetMB * 1048576) console.log(`  !  ${job.file} hedef boyutun (${job.targetMB} MB) üzerinde`);
    }
  } finally {
    await cleanup();
  }
}

main().catch((e) => { console.error('[duyuru] HATA:', e.message); process.exit(1); });
