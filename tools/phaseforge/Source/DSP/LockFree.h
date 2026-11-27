// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — lock-free capture of main + sidechain audio for the analysis thread (JUCE-free).
//
// Four capture channels, always in this order:  0 = main L, 1 = main R, 2 = sidechain L, 3 = sidechain R.
// Channel mapping on push (same for every class here):
//   main  mono (mainCh == 1) → L = R = ch0;  mainCh == 0 or nullptr → zeros;  mainCh > 2 → first two channels used
//   side  mono (sideCh == 1) → L = R = ch0;  sideCh == 0 or nullptr → zeros (missing sidechain)
//
// CaptureFifo   — single-producer / single-consumer ring. Producer = audio thread (push, never blocks, never
//                 allocates; frames that do not fit are dropped and counted). Consumer = analysis thread (pop).
// HistoryBuffer — "last N seconds" ring that never makes the writer wait. Readers copy a snapshot with
//                 readLatest(); a seqlock-style claim counter lets the reader detect that the writer lapped the
//                 region it was copying and retry. Samples are std::atomic<float> accessed relaxed (a plain
//                 load/store on x86-64 and AArch64), so concurrent access is well defined (TSan-clean).
//                 Any number of reader threads may call readLatest() concurrently; there is exactly one writer.
// AnalysisCapture — both of the above behind one push() for the audio thread.
//
// prepare()/reset() allocate or clear and must only be called while neither side is running.
#pragma once

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <memory>
#include <vector>

namespace pf {

constexpr int kCaptureChannels = 4;

namespace detail {
// Resolve the 4 source pointers (nullptr = write zeros). Called once per block.
inline void mapCaptureSources(const float* const* main, int mainCh, const float* const* side, int sideCh,
                              const float* src[kCaptureChannels]) noexcept {
    src[0] = src[1] = src[2] = src[3] = nullptr;
    if (main != nullptr && mainCh >= 1) {
        src[0] = main[0];
        src[1] = (mainCh >= 2) ? main[1] : main[0];
    }
    if (side != nullptr && sideCh >= 1) {
        src[2] = side[0];
        src[3] = (sideCh >= 2) ? side[1] : side[0];
    }
}
} // namespace detail

// ───────────────────────────── SPSC FIFO
class CaptureFifo {
public:
    // capacityFrames is rounded up to a power of two (usable capacity = that size).
    void prepare(int capacityFrames) {
        std::int64_t n = 1;
        while (n < std::max(2, capacityFrames)) n <<= 1;
        cap = n;
        mask = n - 1;
        for (auto& b : buf) b.assign((size_t) n, 0.0f);
        reset();
    }
    void reset() noexcept {
        writePos.store(0, std::memory_order_relaxed);
        readPos.store(0, std::memory_order_relaxed);
        dropped.store(0, std::memory_order_relaxed);
    }
    int capacity() const noexcept { return (int) cap; }

    // Producer (audio thread). Writes as many of the n frames as fit; returns that count. Never waits.
    int push(const float* const* main, int mainCh, const float* const* side, int sideCh, int n) noexcept {
        if (n <= 0 || cap == 0) return 0;
        const std::uint64_t w = writePos.load(std::memory_order_relaxed);
        const std::uint64_t r = readPos.load(std::memory_order_acquire);
        const std::int64_t freeFrames = cap - (std::int64_t) (w - r);
        const int m = (int) std::min<std::int64_t>(n, freeFrames);
        if (m < n) dropped.fetch_add((std::uint64_t) (n - m), std::memory_order_relaxed);
        if (m <= 0) return 0;
        const float* src[kCaptureChannels];
        detail::mapCaptureSources(main, mainCh, side, sideCh, src);
        const std::int64_t start = (std::int64_t) (w & (std::uint64_t) mask);
        const std::int64_t first = std::min<std::int64_t>(m, cap - start);
        for (int c = 0; c < kCaptureChannels; ++c) {
            float* d = buf[c].data();
            if (src[c] != nullptr) {
                std::copy(src[c], src[c] + first, d + start);
                std::copy(src[c] + first, src[c] + m, d);
            } else {
                std::fill(d + start, d + start + first, 0.0f);
                std::fill(d, d + (m - first), 0.0f);
            }
        }
        writePos.store(w + (std::uint64_t) m, std::memory_order_release);
        return m;
    }

    // Consumer (analysis thread). out[c] must hold maxFrames floats (any out[c] may be nullptr = discard).
    int pop(float* const* out, int maxFrames) noexcept {
        if (maxFrames <= 0 || cap == 0) return 0;
        const std::uint64_t r = readPos.load(std::memory_order_relaxed);
        const std::uint64_t w = writePos.load(std::memory_order_acquire);
        const int m = (int) std::min<std::uint64_t>((std::uint64_t) maxFrames, w - r);
        if (m <= 0) return 0;
        const std::int64_t start = (std::int64_t) (r & (std::uint64_t) mask);
        const std::int64_t first = std::min<std::int64_t>(m, cap - start);
        for (int c = 0; c < kCaptureChannels; ++c) {
            if (out == nullptr || out[c] == nullptr) continue;
            const float* s = buf[c].data();
            std::copy(s + start, s + start + first, out[c]);
            std::copy(s, s + (m - first), out[c] + first);
        }
        readPos.store(r + (std::uint64_t) m, std::memory_order_release);
        return m;
    }

    int available() const noexcept {
        return (int) (writePos.load(std::memory_order_acquire) - readPos.load(std::memory_order_acquire));
    }
    std::uint64_t droppedFrames() const noexcept { return dropped.load(std::memory_order_relaxed); }

private:
    std::vector<float> buf[kCaptureChannels];
    std::int64_t cap = 0, mask = 0;
    alignas(64) std::atomic<std::uint64_t> writePos{0};
    alignas(64) std::atomic<std::uint64_t> readPos{0};
    alignas(64) std::atomic<std::uint64_t> dropped{0};
};

// ───────────────────────────── History ring (writer never waits, readers retry on overwrite)
class HistoryBuffer {
public:
    void prepare(double fs, double seconds) { prepareFrames((int) std::ceil(std::max(0.01, seconds) * fs)); }
    void prepareFrames(int frames) {
        cap = std::max(16, frames);
        data.reset(new std::atomic<float>[(size_t) cap * kCaptureChannels]());  // value-initialised (0.0f)
        reset();
    }
    void reset() noexcept {
        claimed.store(0, std::memory_order_relaxed);
        done.store(0, std::memory_order_relaxed);
        wIdx = 0;
        for (std::int64_t i = 0; i < cap * kCaptureChannels; ++i) data[(size_t) i].store(0.0f, std::memory_order_relaxed);
    }
    int capacity() const noexcept { return (int) cap; }
    std::uint64_t framesWritten() const noexcept { return done.load(std::memory_order_acquire); }

    // Writer (audio thread): always writes all n frames, overwriting the oldest.
    void write(const float* const* main, int mainCh, const float* const* side, int sideCh, int n) noexcept {
        if (n <= 0 || cap == 0) return;
        const float* src[kCaptureChannels];
        detail::mapCaptureSources(main, mainCh, side, sideCh, src);
        const std::uint64_t d = done.load(std::memory_order_relaxed);
        // seqlock "begin": announce the frames about to be overwritten before touching them
        claimed.store(d + (std::uint64_t) n, std::memory_order_relaxed);
        std::atomic_thread_fence(std::memory_order_release);
        std::int64_t w = wIdx;
        for (int i = 0; i < n; ++i) {
            std::atomic<float>* f = &data[(size_t) (w * kCaptureChannels)];
            for (int c = 0; c < kCaptureChannels; ++c)
                f[c].store(src[c] != nullptr ? src[c][i] : 0.0f, std::memory_order_relaxed);
            if (++w == cap) w = 0;
        }
        wIdx = w;
        done.store(d + (std::uint64_t) n, std::memory_order_release);  // seqlock "end"
    }

    // Reader (any non-audio thread). Copies the most recent n frames (n is clamped to the frames written so far and
    // to capacity − 1/8 capacity, which leaves the writer room so a copy rarely has to be retried).
    // out[c] needs n floats. Returns the number of frames copied (0 if no consistent snapshot after maxTries;
    // the writer lapped the reader every time). *endFrame (optional) = absolute index one past the last frame copied.
    int readLatest(int n, float* const* out, std::uint64_t* endFrame = nullptr, int maxTries = 16) const noexcept {
        if (n <= 0 || cap == 0) return 0;
        for (int attempt = 0; attempt < maxTries; ++attempt) {
            const std::uint64_t end = done.load(std::memory_order_acquire);
            const std::int64_t maxN = std::min<std::int64_t>((std::int64_t) end, cap - cap / 8);
            const int m = (int) std::min<std::int64_t>(n, maxN);
            if (m <= 0) return 0;
            const std::uint64_t start = end - (std::uint64_t) m;
            std::int64_t r = (std::int64_t) (start % (std::uint64_t) cap);
            for (int i = 0; i < m; ++i) {
                const std::atomic<float>* f = &data[(size_t) (r * kCaptureChannels)];
                for (int c = 0; c < kCaptureChannels; ++c) {
                    const float v = f[c].load(std::memory_order_relaxed);
                    if (out[c] != nullptr) out[c][i] = v;
                }
                if (++r == cap) r = 0;
            }
            std::atomic_thread_fence(std::memory_order_acquire);
            // frames [start, end) are intact iff the writer has not claimed anything at or beyond start + cap
            if (claimed.load(std::memory_order_relaxed) <= start + (std::uint64_t) cap) {
                if (endFrame != nullptr) *endFrame = end;
                return m;
            }
        }
        return 0;
    }

private:
    std::unique_ptr<std::atomic<float>[]> data;
    std::int64_t cap = 0;
    std::int64_t wIdx = 0;  // writer-private
    alignas(64) std::atomic<std::uint64_t> claimed{0};
    alignas(64) std::atomic<std::uint64_t> done{0};
};

// ───────────────────────────── One push for the audio thread
class AnalysisCapture {
public:
    void prepare(double fs, double fifoSeconds = 0.5, double historySeconds = 6.0) {
        fifo.prepare((int) std::ceil(fs * fifoSeconds));
        history.prepare(fs, historySeconds);
    }
    void reset() noexcept { fifo.reset(); history.reset(); }
    // audio thread
    void push(const float* const* main, int mainCh, const float* const* side, int sideCh, int n) noexcept {
        fifo.push(main, mainCh, side, sideCh, n);
        history.write(main, mainCh, side, sideCh, n);
    }
    // analysis thread
    int pop(float* const* out4, int maxFrames) noexcept { return fifo.pop(out4, maxFrames); }
    int readLatest(int n, float* const* out4, std::uint64_t* endFrame = nullptr) const noexcept {
        return history.readLatest(n, out4, endFrame);
    }
    CaptureFifo fifo;
    HistoryBuffer history;
};

} // namespace pf
