// KB-Align — DSP yapı taşları (JUCE'den bağımsız). Python referansı: prototype/kbalign/dsp.py
// Her yapı Python karşılığıyla sayısal eşleşme testine tabidir (tests/parity).
#pragma once

#include <array>
#include <cmath>
#include <complex>
#include <cstdint>
#include <vector>

namespace kb {

constexpr double kPi = 3.14159265358979323846;

// ───────────────────────────── Biquad (doğrudan biçim II, devrik) — scipy sosfilt ile aynı
struct Biquad {
    double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    double z1 = 0, z2 = 0;
    inline double process(double x) noexcept {
        const double y = b0 * x + z1;
        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;
        return y;
    }
    void reset() noexcept { z1 = z2 = 0; }
};

// 2. derece Butterworth (çift doğrusal dönüşüm, ön-bükmeli) — scipy.signal.butter(2, fc, fs) ile aynı
inline Biquad butter2(double fs, double fc, bool highpass) {
    const double k = std::tan(kPi * fc / fs);
    const double r2 = std::sqrt(2.0);
    const double norm = 1.0 / (1.0 + r2 * k + k * k);
    Biquad q;
    if (!highpass) {
        q.b0 = k * k * norm;
        q.b1 = 2.0 * q.b0;
        q.b2 = q.b0;
    } else {
        q.b0 = norm;
        q.b1 = -2.0 * norm;
        q.b2 = norm;
    }
    q.a1 = 2.0 * (k * k - 1.0) * norm;
    q.a2 = (1.0 - r2 * k + k * k) * norm;
    return q;
}

// Linkwitz–Riley 4: iki ardışık Butterworth 2
struct LR4 {
    Biquad s1, s2;
    void design(double fs, double fc, bool hp) {
        s1 = butter2(fs, fc, hp);
        s2 = s1;
        reset();
    }
    // tasarımı durumu sıfırlamadan güncelle (fc otomasyonu)
    void retune(double fs, double fc, bool hp) {
        auto a = butter2(fs, fc, hp);
        a.z1 = s1.z1; a.z2 = s1.z2; s1 = a;
        auto b = butter2(fs, fc, hp);
        b.z1 = s2.z1; b.z2 = s2.z2; s2 = b;
    }
    inline double process(double x) noexcept { return s2.process(s1.process(x)); }
    void reset() noexcept { s1.reset(); s2.reset(); }
};

// ───────────────────────────── Kesirli gecikme: 5. derece Lagrange, düğümler j ∈ {-2..3}
// y(t - m - μ) = Σ_j w_j(μ)·x[t - m - j]
inline void lagrangeWeights(double mu, double w[6]) noexcept {
    static constexpr double nodes[6] = {-2, -1, 0, 1, 2, 3};
    for (int k = 0; k < 6; ++k) {
        double v = 1.0;
        for (int i = 0; i < 6; ++i)
            if (i != k) v *= (mu - nodes[i]) / (nodes[k] - nodes[i]);
        w[k] = v;
    }
}

// İki'nin kuvveti boyutlu halka tampon (tek yazar: ses thread'i)
template <typename T>
struct Ring {
    std::vector<T> buf;
    std::int64_t mask = 0;
    void allocate(std::int64_t minSize) {
        std::int64_t n = 1;
        while (n < minSize) n <<= 1;
        buf.assign((size_t) n, T{});
        mask = n - 1;
    }
    inline void write(std::int64_t idx, T v) noexcept { buf[(size_t) (idx & mask)] = v; }
    inline T read(std::int64_t idx) const noexcept { return buf[(size_t) (idx & mask)]; }
    std::int64_t size() const noexcept { return mask + 1; }
    void clear() { std::fill(buf.begin(), buf.end(), T{}); }
};

// t anında, (t - delay) konumunu oku. delay ≥ 3 örnek olmalı.
inline double fracRead(const Ring<float>& r, std::int64_t t, double delay) noexcept {
    const double m = std::floor(delay);
    const double mu = delay - m;
    double w[6];
    lagrangeWeights(mu, w);
    const std::int64_t base = t - (std::int64_t) m;
    double acc = 0;
    for (int j = 0; j < 6; ++j) acc += w[j] * (double) r.read(base - (j - 2));
    return acc;
}

// ───────────────────────────── Hilbert FIR (tip III, Kaiser pencereli)
inline double besselI0(double x) {
    double sum = 1.0, term = 1.0;
    const double y = x * x / 4.0;
    for (int k = 1; k < 200; ++k) {
        term *= y / ((double) k * (double) k);
        sum += term;
        if (term < sum * 1e-17) break;
    }
    return sum;
}

inline std::vector<double> hilbertFir(double fs, double halfMs, double beta = 8.0) {
    const int hs = (int) std::lround(halfMs * fs / 1000.0);
    const int n = 2 * hs + 1;
    std::vector<double> h((size_t) n, 0.0);
    const double i0b = besselI0(beta);
    for (int i = 0; i < n; ++i) {
        const int k = i - hs;
        if (k % 2 == 0) continue;
        // numpy.kaiser(M, β): I0(β·√(1 - (2i/(M-1) - 1)²)) / I0(β)
        const double r = 2.0 * i / (n - 1) - 1.0;
        const double win = besselI0(beta * std::sqrt(std::max(0.0, 1.0 - r * r))) / i0b;
        h[(size_t) i] = 2.0 / (kPi * k) * win;
    }
    return h;
}

// ───────────────────────────── Radix-2 karmaşık FFT (yerinde, yinelemeli)
class FFT {
public:
    explicit FFT(int order = 9) { setOrder(order); }
    void setOrder(int order) {
        n = 1 << order;
        rev.resize((size_t) n);
        for (int i = 0; i < n; ++i) {
            int r = 0;
            for (int b = 0; b < order; ++b) if (i & (1 << b)) r |= 1 << (order - 1 - b);
            rev[(size_t) i] = r;
        }
        tw.resize((size_t) n / 2);
        for (int i = 0; i < n / 2; ++i) tw[(size_t) i] = std::polar(1.0, -2.0 * kPi * i / n);
    }
    int size() const { return n; }
    // inverse=true: ölçeklemesiz ters dönüşüm (çağıran 1/n ile çarpar)
    void perform(std::complex<double>* x, bool inverse) const noexcept {
        for (int i = 0; i < n; ++i)
            if (i < rev[(size_t) i]) std::swap(x[i], x[rev[(size_t) i]]);
        for (int len = 2; len <= n; len <<= 1) {
            const int half = len >> 1, step = n / len;
            for (int i = 0; i < n; i += len)
                for (int j = 0; j < half; ++j) {
                    auto w = tw[(size_t) (j * step)];
                    if (inverse) w = std::conj(w);
                    const auto u = x[i + j];
                    const auto v = x[i + j + half] * w;
                    x[i + j] = u + v;
                    x[i + j + half] = u - v;
                }
        }
    }
private:
    int n = 0;
    std::vector<int> rev;
    std::vector<std::complex<double>> tw;
};

inline int ceilPow2Order(int n) {
    int o = 0;
    while ((1 << o) < n) ++o;
    return o;
}

// ───────────────────────────── Düzgün bölümlü FFT evrişimi (UPOLS), sabit blok B
// Çıkış girişe göre B örnek gecikir: y_out(t) = (h * x)(t - B). Ses thread'inde bellek ayırmaz.
class PartitionedConvolver {
public:
    void prepare(const std::vector<double>& h, int blockSize) {
        B = blockSize;
        order = ceilPow2Order(2 * B);
        fft.setOrder(order);
        N = fft.size();
        P = (int) ((h.size() + (size_t) B - 1) / (size_t) B);
        H.assign((size_t) P * N, {});
        std::vector<std::complex<double>> tmp((size_t) N);
        for (int p = 0; p < P; ++p) {
            std::fill(tmp.begin(), tmp.end(), std::complex<double>{});
            for (int i = 0; i < B; ++i) {
                const size_t k = (size_t) (p * B + i);
                if (k < h.size()) tmp[(size_t) i] = h[k];
            }
            fft.perform(tmp.data(), false);
            std::copy(tmp.begin(), tmp.end(), H.begin() + (ptrdiff_t) p * N);
        }
        X.assign((size_t) P * N, {});
        inBuf.assign((size_t) 2 * B, 0.0);
        acc.assign((size_t) N, {});
        outBuf.assign((size_t) B, 0.0);
        pos = 0; head = 0;
    }
    void reset() {
        std::fill(X.begin(), X.end(), std::complex<double>{});
        std::fill(inBuf.begin(), inBuf.end(), 0.0);
        std::fill(outBuf.begin(), outBuf.end(), 0.0);
        pos = 0; head = 0;
    }
    int latency() const { return B; }
    // örnek örnek: girişi al, B örnek önceki çıktıyı döndür
    inline double process(double x) noexcept {
        const double y = outBuf[(size_t) pos];
        inBuf[(size_t) (B + pos)] = x;
        if (++pos == B) { runBlock(); pos = 0; }
        return y;
    }
private:
    void runBlock() noexcept {
        // overlap-save: son 2B giriş → FFT
        std::complex<double>* xs = X.data() + (ptrdiff_t) head * N;
        for (int i = 0; i < 2 * B; ++i) xs[i] = inBuf[(size_t) i];
        for (int i = 2 * B; i < N; ++i) xs[i] = 0.0;
        fft.perform(xs, false);
        std::fill(acc.begin(), acc.end(), std::complex<double>{});
        for (int p = 0; p < P; ++p) {
            const int slot = (head - p + P) % P;
            const std::complex<double>* xp = X.data() + (ptrdiff_t) slot * N;
            const std::complex<double>* hp = H.data() + (ptrdiff_t) p * N;
            for (int k = 0; k < N; ++k) acc[(size_t) k] += xp[k] * hp[k];
        }
        fft.perform(acc.data(), true);
        const double s = 1.0 / N;
        for (int i = 0; i < B; ++i) outBuf[(size_t) i] = acc[(size_t) (B + i)].real() * s;
        for (int i = 0; i < B; ++i) inBuf[(size_t) i] = inBuf[(size_t) (B + i)];
        head = (head + 1) % P;
    }
    FFT fft;
    int B = 128, N = 256, P = 1, order = 8, pos = 0, head = 0;
    std::vector<std::complex<double>> H, X, acc;
    std::vector<double> inBuf, outBuf;
};

// ───────────────────────────── Ducking eğrisi (Python dsp.curve_eval ile aynı)
struct CurvePoint { double t, g, c; };

inline double curveEvalN(const CurvePoint* pts, int n, double u) noexcept {
    u = std::fmin(1.0, std::fmax(0.0, u));
    double out = 1.0;
    for (int i = 0; i + 1 < n; ++i) {
        const auto& a = pts[i];
        const auto& b = pts[i + 1];
        if (u >= a.t && u <= b.t && b.t > a.t) {
            const double p = (u - a.t) / (b.t - a.t);
            const double k = std::pow(2.0, 4.0 * b.c);
            out = a.g + (b.g - a.g) * std::pow(p, k);
        }
    }
    return out;
}
inline double curveEval(const std::vector<CurvePoint>& pts, double u) noexcept {
    return curveEvalN(pts.data(), (int) pts.size(), u);
}
constexpr int kMaxCurvePoints = 32;

// VARSAYIM: kullanıcının çizdiği eğri gelene kadar yer tutucu (Python PLACEHOLDER_CURVE ile aynı)
inline std::vector<CurvePoint> placeholderCurve() {
    return {{0.00, 0.00, 0.0}, {0.04, 0.00, 0.0}, {0.35, 0.85, -0.5}, {1.00, 1.00, 0.0}};
}

} // namespace kb
