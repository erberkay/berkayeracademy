// tools/demo-uyeler.cjs — deneme amaçlı 180 boş üye profili (users/{id}: displayName + joinedAt).
// Sitede gerçek profil gibi görünür; silmek için gizli seedBatch alanıyla bulunur (sitede gösterilmez).
//   node tools/demo-uyeler.cjs ekle   → 180 profil ekler (zaten varsa eklemez)
//   node tools/demo-uyeler.cjs sil    → hepsini siler
// Firebase CLI oturumunu kullanır (firebase login, deploy ile aynı hesap); hosting'e yüklenmez
// (firebase.json ignore: tools/**).
const R = require('child_process').execSync('npm root -g').toString().trim();
const auth = require(R + '/firebase-tools/lib/auth');
const P = 'ableton-tutorial';
const ROOT = `projects/${P}/databases/(default)/documents`;
const API = 'https://firestore.googleapis.com/v1/' + ROOT;
const BATCH = 'demo-2026-10-05';

async function token() {
  const acct = auth.getGlobalDefaultAccount ? auth.getGlobalDefaultAccount() : null;
  const rt = acct && acct.tokens && acct.tokens.refresh_token;
  if (!rt) throw new Error('Önce "firebase login" gerekli');
  const t = await auth.getAccessToken(rt, ['https://www.googleapis.com/auth/cloud-platform']);
  return t.access_token || t;
}
async function call(method, url, body) {
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
}
async function listUsers() {
  let out = [], pt = '';
  do {
    const j = await call('GET', `${API}/users?pageSize=300${pt ? '&pageToken=' + pt : ''}`);
    out = out.concat(j.documents || []);
    pt = j.nextPageToken || '';
  } while (pt);
  return out;
}
async function commit(writes) {
  for (let i = 0; i < writes.length; i += 400) {
    await call('POST', API.replace(/\/documents$/, '/documents:commit'), { writes: writes.slice(i, i + 400) });
  }
}
const isDemo = d => d.fields && d.fields.seedBatch && d.fields.seedBatch.stringValue === BATCH;

const ERKEK = `Ahmet Mehmet Mustafa Ali Hüseyin Hasan İbrahim Murat Emre Burak Can Cem Deniz Efe Eren Kaan Kerem Mert Onur Ozan Serkan Tolga Umut Volkan Yusuf Barış Berk Arda Alp Emir Çağan Doğukan Furkan Gökhan Halil Kemal Levent Oğuz Selim Sinan Taner Uğur Yiğit Batuhan Enes Oğuzhan Yasin Ömer Harun Tuna`.split(' ');
const KADIN = `Ayşe Fatma Zeynep Elif Merve Büşra Esra Seda Derya Ebru Gamze Gizem İrem Melis Selin Ece Defne Dilara Naz Pelin Sude Ceren Damla Aslı Nehir Yağmur Buse Cansu Ezgi Hande Hazal Tuğba Özge Sevgi Şule Nisa Begüm İpek Melike Rabia Beyza Tuana Ecrin Azra Duru Eylül Asya Nazlı Serra Lara`.split(' ');
const SOYAD = `Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Özcan Korkmaz Çakır Erdoğan Yavuz Acar Şen Aktaş Güler Yalçın Güneş Bozkurt Bulut Keskin Ünal Turan Gül Özer Işık Kaplan Avcı Sarı Tekin Taş Köse Yüksel Ateş Aksoy Karaca Erdem Coşkun Duman Tunç Uçar Bilgin Akın Kocabaş Ekinci Sönmez Altun Kahraman Toprak Erkan Tuncer Soylu Durmaz Uysal`.split(' ');
const pick = a => a[Math.floor(Math.random() * a.length)];
const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const newId = () => Array.from({ length: 28 }, () => AB[Math.floor(Math.random() * AB.length)]).join('');

async function ekle() {
  const have = (await listUsers()).filter(isDemo).length;
  if (have) { console.log(`Zaten ${have} demo üye var — önce "sil" çalıştır.`); return; }
  const names = new Set();
  while (names.size < 180) names.add(`${pick(Math.random() < 0.5 ? ERKEK : KADIN)} ${pick(SOYAD)}`);
  // katılım tarihleri son 11 aya dağılır
  const from = Date.parse('2025-11-01T08:00:00Z'), to = Date.now() - 864e5;
  const docs = [...names].map(n => ({ id: newId(), n, t: new Date(from + Math.random() * (to - from)).toISOString() }));
  await commit(docs.map(d => ({
    update: { name: `${ROOT}/users/${d.id}`, fields: {
      displayName: { stringValue: d.n }, joinedAt: { timestampValue: d.t }, seedBatch: { stringValue: BATCH } } },
    currentDocument: { exists: false },
  })));
  console.log(`Eklendi: ${docs.length} · örnek: ${docs.slice(0, 5).map(d => d.n).join(', ')}`);
}
async function sil() {
  const ds = (await listUsers()).filter(isDemo);
  await commit(ds.map(d => ({ delete: d.name })));
  console.log(`Silindi: ${ds.length}`);
}

const cmd = { ekle, sil }[process.argv[2]];
if (!cmd) { console.log('Kullanım: node tools/demo-uyeler.cjs ekle | sil'); process.exit(1); }
cmd().then(() => listUsers()).then(d => console.log(`Toplam üye: ${d.length}`))
  .catch(e => { console.error('HATA:', e.message); process.exit(1); });
