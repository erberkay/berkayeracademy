// KB-Align C++ testleri: birim + Python ile sayısal eşleşme (tests/parity, export_parity.py üretir).
#include "../src/analysis/Analyzer.h"
#include "../src/dsp/Dsp.h"
#include "../src/engine/Engine.h"

#include <chrono>
#include <cmath>
#include <cstdio>
#include <fstream>
#include <string>
#include <vector>

using namespace kb;

struct RenderCase { const char* name; int latency; int lm; bool xover; std::vector<ParamEvent> ev; };
struct HitCase { int src; long long onset; double d, th, rho, dmin, dmax, availMs; };
#include "parity/expected.inc"

static int failures = 0, checks = 0;
#define CHECK(cond, ...) do { ++checks; if (!(cond)) { ++failures; std::printf("  HATA %s:%d: ", __FILE__, __LINE__); std::printf(__VA_ARGS__); std::printf("\n"); } } while (0)

static std::string dir;
static std::vector<double> load(const std::string& name) {
    std::ifstream f(dir + "/" + name + ".f64", std::ios::binary | std::ios::ate);
    if (!f) { std::printf("  dosya yok: %s\n", name.c_str()); ++failures; return {}; }
    const auto n = (size_t) f.tellg() / 8;
    std::vector<double> v(n);
    f.seekg(0);
    f.read(reinterpret_cast<char*>(v.data()), (std::streamsize) (n * 8));
    return v;
}
static double maxAbs(const std::vector<double>& v) { double m = 0; for (double x : v) m = std::max(m, std::abs(x)); return m; }
static double errDb(const std::vector<double>& a, const std::vector<double>& b, size_t from = 0, size_t to = SIZE_MAX) {
    double m = 0;
    to = std::min({to, a.size(), b.size()});
    for (size_t i = from; i < to; ++i) m = std::max(m, std::abs(a[i] - b[i]));
    return 20.0 * std::log10(m / (maxAbs(b) + 1e-30) + 1e-300);
}

static void testLR4() {
    std::printf("LR4 crossover\n");
    auto x = load("x"), lp = load("lr4_lp"), hp = load("lr4_hp");
    LR4 a, b; a.design(48000, 120, false); b.design(48000, 120, true);
    std::vector<double> yl(x.size()), yh(x.size());
    for (size_t i = 0; i < x.size(); ++i) { yl[i] = a.process(x[i]); yh[i] = b.process(x[i]); }
    const double el = errDb(yl, lp), eh = errDb(yh, hp);
    std::printf("  LP fark %.1f dB, HP fark %.1f dB\n", el, eh);
    CHECK(el < -200 && eh < -200, "LR4 Python ile eşleşmiyor");
}

static void testFrac() {
    std::printf("Kesirli gecikme (Lagrange 5)\n");
    auto xl = load("xl");
    Ring<float> r; r.allocate((int64_t) xl.size());
    for (size_t i = 0; i < xl.size(); ++i) r.write((int64_t) i, (float) xl[i]);
    for (int k = 0; k < 5; ++k) {
        auto ref = load("frac_" + std::to_string(k));
        std::vector<double> y(ref.size());
        for (size_t i = 0; i < ref.size(); ++i) y[i] = fracRead(r, (int64_t) (1000 + i), kFracDelays[k]);
        const double e = errDb(y, ref, 1100, ref.size());
        std::printf("  D=%.3f fark %.1f dB\n", kFracDelays[k], e);
        CHECK(e < -120, "fracRead (float halka) Python'dan uzak");
    }
}

static void testHilbertConv() {
    std::printf("Hilbert FIR + bölümlü evrişim\n");
    auto h = load("hilbert"), xl = load("xl"), ref = load("conv");
    auto hc = hilbertFir(48000, 25.0);
    double m = 0;
    for (size_t i = 0; i < h.size(); ++i) m = std::max(m, std::abs(h[i] - hc[i]));
    std::printf("  katsayı farkı %.2e\n", m);
    CHECK(hc.size() == h.size() && m < 1e-12, "Hilbert katsayıları farklı");
    PartitionedConvolver pc; pc.prepare(hc, kConvBlock);
    std::vector<double> y(xl.size());
    auto t0 = std::chrono::steady_clock::now();
    for (size_t i = 0; i < xl.size(); ++i) y[i] = pc.process(xl[i]);
    const double us = std::chrono::duration<double, std::micro>(std::chrono::steady_clock::now() - t0).count();
    const double e = errDb(y, ref);
    std::printf("  evrişim farkı %.1f dB, %.2f µs/örnek (%.2f %% gerçek zaman @48k)\n", e, us / xl.size(), us / xl.size() * 48000 / 1e4);
    CHECK(e < -200, "evrişim Python'dan uzak");
}

static std::vector<double> runEngine(const std::vector<double>& b, const RenderCase& rc, int block, double* usPerSample = nullptr) {
    AudioEngine eng;
    eng.prepare(48000, block, 1, (LatencyMode) rc.lm, rc.xover, 120.0, 10.0);
    CHECK(eng.latency() == rc.latency, "%s gecikme %d ≠ %d", rc.name, eng.latency(), rc.latency);
    // Python render: ilk olay başlangıç değeri (c=0'da geçiş yok) — C++'ta başlangıç (0,0); ilk olay (0,d,θ) ise
    // geçiş c-X'te biter ama c=0 → baştan uygulanır. Burada ilk olayı da kuyruğa koyarız.
    for (auto& e : rc.ev) eng.events.push(e);
    const int n = (int) b.size() + rc.latency;
    std::vector<float> buf((size_t) n, 0.0f);
    for (size_t i = 0; i < b.size(); ++i) buf[i] = (float) b[i];
    BlockParams bp;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < n; i += block) {
        float* p = buf.data() + i;
        eng.process(&p, 1, nullptr, 0, std::min(block, n - i), bp);
    }
    if (usPerSample) *usPerSample = std::chrono::duration<double, std::micro>(std::chrono::steady_clock::now() - t0).count() / n;
    return std::vector<double>(buf.begin(), buf.end());
}

static void testEngineParity() {
    std::printf("Ses yolu (AudioEngine) — Python engine.render ile\n");
    auto b = load("bass");
    for (const auto& rc : kRenderCases) {
        auto ref = load(rc.name);
        for (int block : {1, 64, 512, 4096}) {
            double us = 0;
            auto y = runEngine(b, rc, block, &us);
            // İlk olay Python'da en baştan geçerli (Hilbert'in sinyal öncesi ön-kuyruğu da döner);
            // C++ nötrden [−X, 0] crossfade ile geçer → karşılaştırma içerik zamanı 0'dan (çıkış indeksi L).
            const double e = errDb(y, ref, (size_t) rc.latency, ref.size());
            if (block == 64 || e > -90)
                std::printf("  %-22s blok %4d: fark %.1f dB, %.3f µs/örnek\n", rc.name, block, e, us);
            CHECK(e < -90, "%s blok %d: %.1f dB", rc.name, block, e);
        }
    }
}

static void testNullAndKick() {
    std::printf("Null testleri ve kick bağımsızlığı\n");
    auto b = load("bass");
    for (double fs : {44100.0, 48000.0, 96000.0, 192000.0}) {
        AudioEngine eng;
        eng.prepare(fs, 512, 1, LatencyMode::Full, false, 120, 10);
        const int L = eng.latency();
        const int n = (int) b.size() + L;
        std::vector<float> buf((size_t) n, 0.0f), kick((size_t) n, 0.0f);
        for (size_t i = 0; i < b.size(); ++i) { buf[i] = (float) b[i]; kick[i] = (float) std::sin(0.01 * (double) i); }
        BlockParams bp;
        for (int i = 0; i < n; i += 512) {
            float* p = buf.data() + i; const float* k = kick.data() + i;
            eng.process(&p, 1, &k, 1, std::min(512, n - i), bp);
        }
        double m = 0;
        for (size_t i = 0; i < b.size(); ++i) m = std::max(m, std::abs((double) buf[i + (size_t) L] - (double) (float) b[i]));
        const double db = 20 * std::log10(m + 1e-30);
        std::printf("  fs %.0f: nötr (crossover kapalı) ↔ saf gecikme: %.1f dBFS (kick bağlı)\n", fs, db);
        CHECK(db <= -100, "null testi geçmedi: %.1f dBFS", db);
    }
}

static void testAnalyzer() {
    std::printf("Analiz (Analyzer.hit) — Python ile\n");
    Analyzer an(48000);
    auto taps = load("decim_taps");
    for (const auto& hc : kHitCases) {
        auto k = load("hit" + std::to_string(hc.src) + "_k"), b = load("hit" + std::to_string(hc.src) + "_b");
        AnalysisParams p; p.dMinMs = hc.dmin; p.dMaxMs = hc.dmax;
        long long n = (long long) k.size();
        if (hc.availMs > 0) n = std::min<long long>(n, hc.onset + (long long) std::floor(hc.availMs * 48000 / 1000));
        auto t0 = std::chrono::steady_clock::now();
        auto r = an.hit(k.data(), b.data(), n, hc.onset, p);
        const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
        const double dth = std::fmod(r.theta - hc.th + 540.0, 360.0) - 180.0;
        std::printf("  vuruş %d: d %.5f (Py %.5f) θ %.3f (Py %.3f) ρ %.6f (Py %.6f)  %.1f ms\n", hc.src, r.dMs, hc.d, r.theta, hc.th, r.rho, hc.rho, ms);
        CHECK(std::abs(r.dMs - hc.d) < 2e-3 && std::abs(dth) < 0.05 && std::abs(r.rho - hc.rho) < 1e-5, "analiz farkı");
    }
}

static void testOnsetPitch() {
    std::printf("Onset ve nota\n");
    auto k = load("loop_k");
    OnsetDetector od; od.prepare(48000);
    std::vector<long long> got;
    for (size_t i = 0; i < k.size(); ++i) { auto o = od.process(k[i], (long long) i); if (o >= 0) got.push_back(o); }
    const size_t nExp = sizeof(kOnsets) / sizeof(kOnsets[0]);
    bool same = got.size() == nExp;
    for (size_t i = 0; same && i < nExp; ++i) same = got[i] == kOnsets[i];
    std::printf("  onset: %zu bulundu, Python ile %s\n", got.size(), same ? "aynı" : "FARKLI");
    CHECK(same, "onset listesi farklı");
    Analyzer an(48000);
    for (auto& pc : kPitch) {
        auto x = load("pitch_" + std::to_string(pc[0]));
        auto d = an.decimate(x.data(), (long long) x.size(), 0, (int) (0.1 * an.fa()));
        auto nt = detectNote(d, an.fa());
        std::printf("  nota %d → %d (Py %d)\n", pc[0], nt ? *nt : -1, pc[1]);
        CHECK((nt ? *nt : -1) == pc[1], "nota farklı");
    }
}

// Modlar: AudioEngine + AlignEngine gerçek zaman akışı, alt bloklarda senkron analiz (çevrimdışı render yolu)
static std::vector<ParamEvent> runModes(Mode mode, std::vector<double>* outAudio = nullptr) {
    auto k = load("mloop_k"), b = load("mloop_b");
    AudioEngine eng;
    eng.prepare(48000, 256, 1, LatencyMode::Full, true, 120, 10);
    AlignEngine al;
    al.prepare(&eng, 48000, 120);
    AlignSettings s; s.mode = mode;
    al.setSettings(s);
    if (mode == Mode::Learn) al.startLearn();
    std::vector<ParamEvent> evs;
    // olayları gözlemek için motorun FIFO'sunu ara katmanla dinle: AlignEngine eng->events'e yazar
    const int n = (int) k.size();
    std::vector<float> buf((size_t) n), kb_((size_t) n);
    for (int i = 0; i < n; ++i) { buf[(size_t) i] = (float) b[(size_t) i]; kb_[(size_t) i] = (float) k[(size_t) i]; }
    BlockParams bp;
    AudioEngine shadow;  // yok — olayları doğrudan AlignEngine çıktısından topluyoruz
    (void) shadow;
    for (int i = 0; i < n; i += 256) {
        float* p = buf.data() + i; const float* kk = kb_.data() + i;
        eng.process(&p, 1, &kk, 1, std::min(256, n - i), bp);
        al.step();
        auto hs = al.recentHits();
        (void) hs;
    }
    for (auto& h : al.recentHits()) if (h.applied) evs.push_back({h.t0 - 48, h.d, h.th});
    if (outAudio) outAudio->assign(buf.begin(), buf.end());
    if (mode == Mode::Learn) {
        auto lr = al.takeLearnResult();
        if (lr) evs.push_back({-1, lr->first, lr->second});
    }
    if (mode == Mode::PerNote) {
        for (auto& [note, e] : al.noteTable()) evs.push_back({-1000 - note, e.d, e.th});
    }
    return evs;
}

static void testModes() {
    std::printf("Modlar — Python modes.simulate ile\n");
    {
        auto ev = runModes(Mode::Learn);
        const auto& py = kMode_learn[1];
        bool found = false;
        for (auto& e : ev) if (e.c == -1) {
            found = true;
            const double dth = std::fmod(e.th - py.th + 540.0, 360.0) - 180.0;
            std::printf("  Learn: d %.4f θ %.2f (Py %.4f, %.2f)\n", e.d, e.th, py.d, py.th);
            CHECK(std::abs(e.d - py.d) < 0.01 && std::abs(dth) < 0.5, "Learn sonucu farklı");
        }
        CHECK(found, "Learn sonucu yok");
    }
    {
        auto ev = runModes(Mode::PerHit);
        const size_t nPy = sizeof(kMode_hit) / sizeof(kMode_hit[0]) - 1;
        std::printf("  Her vuruşta: %zu uygulama (Py %zu)\n", ev.size(), nPy);
        size_t ok = 0;
        for (size_t i = 0; i < std::min(ev.size(), nPy); ++i) {
            const auto& py = kMode_hit[i + 1];
            const double dth = std::fmod(ev[i].th - py.th + 540.0, 360.0) - 180.0;
            if (std::abs(ev[i].d - py.d) < 0.02 && std::abs(dth) < 1.0 && std::llabs(ev[i].c - py.c) <= 1) ++ok;
        }
        std::printf("  eşleşen %zu / %zu\n", ok, nPy);
        CHECK(ok == nPy && ev.size() == nPy, "Her vuruşta sonuçları farklı");
    }
    {
        auto ev = runModes(Mode::PerNote);
        int tableN = 0;
        for (auto& e : ev) if (e.c <= -1000) { ++tableN; std::printf("  nota %lld: d %.3f θ %.2f\n", (long long) (-1000 - e.c), e.d, e.th); }
        CHECK(tableN == 3, "nota tablosu 3 nota içermeli (A1, C2, G1)");
    }
}

static void testCpu() {
    std::printf("CPU (48 kHz, 64 örnek blok, stereo, tüm özellikler)\n");
    for (double fs : {48000.0, 192000.0}) {
        AudioEngine eng;
        eng.prepare(fs, 64, 2, LatencyMode::FullLookahead, true, 120, 10);
        const int n = (int) fs * 4;
        std::vector<float> l((size_t) n), r((size_t) n), k((size_t) n);
        for (int i = 0; i < n; ++i) { l[(size_t) i] = r[(size_t) i] = (float) std::sin(i * 0.004); k[(size_t) i] = (float) std::sin(i * 0.002); }
        BlockParams bp; bp.bassMono = true; bp.duck = true;
        auto t0 = std::chrono::steady_clock::now();
        for (int i = 0; i < n; i += 64) {
            float* ch[2] = {l.data() + i, r.data() + i}; const float* kk = k.data() + i;
            eng.process(ch, 2, &kk, 1, 64, bp);
        }
        const double s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        std::printf("  fs %.0f: %.2f %% tek çekirdek (4 s ses %.3f s'de)\n", fs, s / 4.0 * 100, s);
        if (fs == 48000) CHECK(s / 4.0 * 100 < 2.0, "CPU hedefi (%%2) aşıldı: %.2f %%", s / 4.0 * 100);
    }
}

int main(int argc, char** argv) {
    dir = argc > 1 ? argv[1] : "tests/parity";
    testLR4();
    testFrac();
    testHilbertConv();
    testEngineParity();
    testNullAndKick();
    testAnalyzer();
    testOnsetPitch();
    testModes();
    testCpu();
    std::printf("\n%d kontrol, %d hata\n", checks, failures);
    return failures ? 1 : 0;
}
