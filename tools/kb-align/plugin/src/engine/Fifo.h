// Tek üretici / tek tüketici kilitsiz FIFO ve kilitsiz geçmiş tamponu.
#pragma once

#include <atomic>
#include <cstdint>
#include <vector>

namespace kb {

template <typename T>
class SpscFifo {
public:
    explicit SpscFifo(size_t capacityPow2 = 256) { buf.resize(capacityPow2); mask = capacityPow2 - 1; }
    bool push(const T& v) noexcept {
        const auto w = wr.load(std::memory_order_relaxed);
        if (w - rd.load(std::memory_order_acquire) >= buf.size()) return false;
        buf[w & mask] = v;
        wr.store(w + 1, std::memory_order_release);
        return true;
    }
    bool pop(T& v) noexcept {
        const auto r = rd.load(std::memory_order_relaxed);
        if (r == wr.load(std::memory_order_acquire)) return false;
        v = buf[r & mask];
        rd.store(r + 1, std::memory_order_release);
        return true;
    }
    void clear() noexcept { rd.store(wr.load()); }
private:
    std::vector<T> buf;
    size_t mask;
    std::atomic<size_t> wr{0}, rd{0};
};

// Ses thread'inin yazdığı, başka thread'lerin kopyalayarak okuduğu halka tampon.
// Okuyucu [a, b) aralığını kopyalar; kopyadan sonra yazar aralığı ezmediyse geçerlidir.
class HistoryRing {
public:
    void allocate(int64_t minSize) {
        int64_t n = 1;
        while (n < minSize) n <<= 1;
        data.assign((size_t) n, 0.0f);
        mask = n - 1;
        written.store(0);
    }
    int64_t capacity() const { return mask + 1; }
    inline void write(int64_t idx, float v) noexcept { data[(size_t) (idx & mask)] = v; }
    void publish(int64_t count) noexcept { written.store(count, std::memory_order_release); }
    int64_t available() const noexcept { return written.load(std::memory_order_acquire); }
    // [a, b) → out (b ≤ available). Aralık ezildiyse false. a < 0 → sıfır.
    bool copy(int64_t a, int64_t b, double* out) const noexcept {
        const int64_t w0 = available();
        if (b > w0 || w0 - a > capacity() - 4096) return false;
        for (int64_t i = a; i < b; ++i) out[i - a] = i < 0 ? 0.0 : (double) data[(size_t) (i & mask)];
        const int64_t w1 = available();
        return w1 - a <= capacity() - 4096;
    }
    bool copyF(int64_t a, int64_t b, float* out) const noexcept {
        const int64_t w0 = available();
        if (b > w0 || w0 - a > capacity() - 4096) return false;
        for (int64_t i = a; i < b; ++i) out[i - a] = i < 0 ? 0.0f : data[(size_t) (i & mask)];
        return available() - a <= capacity() - 4096;
    }
private:
    std::vector<float> data;
    int64_t mask = 0;
    std::atomic<int64_t> written{0};
};

} // namespace kb
