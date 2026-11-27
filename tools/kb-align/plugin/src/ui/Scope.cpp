// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
#include "Scope.h"

#include <cmath>

namespace kb::ui {

static void dashedPath(juce::Graphics& g, const juce::Path& p, float w, std::initializer_list<float> dash) {
    juce::Path d;
    std::vector<float> v(dash);
    juce::PathStrokeType(w).createDashedStroke(d, p, v.data(), (int) v.size());
    g.fillPath(d);
}

ScopeView::ScopeView(KBAlignProcessor& p) : proc(p) {
    setWantsKeyboardFocus(true);
    setTitle(juce::String::fromUTF8("Osiloskop"));
    setDescription(juce::String::fromUTF8("Kick, bas ve toplam izleri. Bas izini sürükle: pre-delay. Tık: imleç A, sağ tık/Alt: imleç B. "
                                          "Oklar: imleç A'yı kaydır. F: dondur. [ ]: yakınlaştır."));
    startTimerHz(60);
}

ScopeView::~ScopeView() { stopTimer(); }

void ScopeView::resized() { plot = getLocalBounds().toFloat().reduced(8, 6).withTrimmedBottom(22).withTrimmedLeft(34); }

float ScopeView::xOf(double ms) const { return plot.getX() + (float) ((ms + preMs) / windowMs) * plot.getWidth(); }
double ScopeView::msOf(float x) const { return (x - plot.getX()) / plot.getWidth() * windowMs - preMs; }
float ScopeView::yOf(float v) const { return plot.getCentreY() - v * vScale * plot.getHeight() * 0.48f; }

juce::Range<int> ScopeView::analysisWindowSamples() const {
    if (!cur.valid) return {};
    const double ws = proc.apvts.getRawParameterValue(pid::winStart)->load();
    const double wl = proc.apvts.getRawParameterValue(pid::winMs)->load();
    const int a = (int) std::lround((preMs + ws) * cur.fs / 1000.0);
    const int b = (int) std::lround((preMs + ws + wl) * cur.fs / 1000.0);
    return juce::Range<int>(a, b).getIntersectionWith({0, (int) cur.kick.size()});
}

void ScopeView::displayFilter(std::vector<float>& v, double fs) const {
    LR4 f;
    f.design(fs, viewHz, false);
    for (auto& x : v) x = (float) f.process(x);
    f.reset();
    for (auto it = v.rbegin(); it != v.rend(); ++it) *it = (float) f.process(*it);  // sıfır faz: görüntüde zaman kayması olmasın
}

bool ScopeView::acquire(ScopeFrame& f) {
    auto& eng = proc.engine;
    const double fs = eng.sampleRate();
    const int64_t L = eng.latency();
    const int64_t sc = (int64_t) std::llround(proc.apvts.getRawParameterValue(pid::scOffset)->load() * fs / 1000.0);
    const int64_t availOut = eng.hOut.available();
    const int64_t availContent = std::min(availOut - L, eng.hKickRaw.available() - sc) - 1;
    const int64_t N = (int64_t) (windowMs * fs / 1000.0);
    const int64_t pre = (int64_t) (preMs * fs / 1000.0);
    const int64_t M = (int64_t) (0.05 * fs);
    if (availContent < N + 2 * M) return false;
    int64_t trig = -1;
    if (trigger == Trigger::Kick) {
        const int cnt = eng.onsetCount.load(std::memory_order_acquire);
        for (int k = cnt - 1; k >= std::max(0, cnt - AudioEngine::kOnsetHist + 1); --k) {
            const int64_t c = eng.onsetHist[(size_t) (k % AudioEngine::kOnsetHist)].load(std::memory_order_relaxed);
            if (c - pre - M >= 0 && c - pre + N + M <= availContent) { trig = c; break; }
        }
        if (trig < 0) return false;
        if (trig == lastOnset && cur.valid && !persistence) return false;  // yeni vuruş yok
        lastOnset = trig;
    } else if (trigger == Trigger::Tempo && eng.phValid.load() && eng.phBpm.load() > 0) {
        // VARSAYIM: playhead ppq'su blok başındaki giriş örneğine ait (motordaki ducking ile aynı)
        const double bpm = eng.phBpm.load(), ppq0 = eng.phPpq.load();
        const int64_t pos0 = eng.phPos.load();
        const double spb = 60.0 / bpm * fs;
        const int64_t latest = availContent - N - M + pre;
        const double ppqLatest = ppq0 + (double) (latest - pos0) / spb;
        const double b = std::floor(ppqLatest / tempoBeats) * tempoBeats;
        trig = pos0 + (int64_t) std::llround((b - ppq0) * spb);
        if (trig - pre - M < 0) return false;
    } else {
        trig = availContent - N - M + pre;
    }
    const int64_t a = trig - pre - M, n = N + 2 * M;
    std::vector<float> k((size_t) n), b((size_t) n), bi((size_t) n);
    if (!eng.hKickRaw.copyF(a + sc, a + sc + n, k.data())) return false;
    if (!eng.hOut.copyF(a + L, a + L + n, b.data())) return false;
    if (!eng.hBassRaw.copyF(a, a + n, bi.data())) return false;
    if (lowView) { displayFilter(k, fs); displayFilter(b, fs); displayFilter(bi, fs); }
    f.kick.assign(k.begin() + M, k.begin() + M + N);
    f.bass.assign(b.begin() + M, b.begin() + M + N);
    f.bassIn.assign(bi.begin() + M, bi.begin() + M + N);
    f.sum.resize((size_t) N);
    for (size_t i = 0; i < (size_t) N; ++i) f.sum[i] = f.kick[i] + f.bass[i];
    f.c0 = trig - pre;
    f.fs = fs;
    f.preMs = preMs;
    f.valid = true;
    return true;
}

void ScopeView::timerCallback() {
    if (frozen) return;
    ScopeFrame f;
    if (!acquire(f)) return;
    if (trigger == Trigger::Kick && average > 1) {
        history.push_back(f);
        while ((int) history.size() > average) history.pop_front();
        ScopeFrame avg = f;
        for (auto* v : {&avg.kick, &avg.bass, &avg.sum, &avg.bassIn}) std::fill(v->begin(), v->end(), 0.0f);
        int cnt = 0;
        for (auto& h : history) {
            if (h.kick.size() != avg.kick.size()) continue;
            for (size_t i = 0; i < avg.kick.size(); ++i) {
                avg.kick[i] += h.kick[i]; avg.bass[i] += h.bass[i]; avg.sum[i] += h.sum[i]; avg.bassIn[i] += h.bassIn[i];
            }
            ++cnt;
        }
        for (auto* v : {&avg.kick, &avg.bass, &avg.sum, &avg.bassIn}) for (auto& x : *v) x /= (float) std::max(1, cnt);
        cur = avg;
    } else {
        if (persistence) { history.push_back(cur); while (history.size() > 6) history.pop_front(); }
        else history.clear();
        cur = f;
    }
    float mx = 1e-6f;
    for (auto* v : {&cur.kick, &cur.bass, &cur.sum}) for (float x : *v) mx = std::max(mx, std::abs(x));
    vScale = 0.85f * vScale + 0.15f * (0.95f / mx);
    if (refAuto) {
        auto hs = proc.align.recentHits();
        for (auto it = hs.rbegin(); it != hs.rend(); ++it) if (it->note >= 0) { refHz = 440.0 * std::pow(2.0, (it->note - 69) / 12.0); break; }
    }
    if (onFrame) onFrame();
    repaint();
}

void ScopeView::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 10);
    g.setColour(hasKeyboardFocus(false) ? col::accent.withAlpha(0.6f) : col::line);
    g.drawRoundedRectangle(r.reduced(0.5f), 10, 1);
    // ızgara: ms
    g.setFont(juce::FontOptions(11.0f));
    const double step = windowMs > 200 ? 50 : windowMs > 80 ? 20 : windowMs > 30 ? 10 : windowMs > 8 ? 2 : 0.5;
    for (double ms = std::ceil(-preMs / step) * step; ms <= windowMs - preMs; ms += step) {
        const float x = xOf(ms);
        g.setColour(std::abs(ms) < 1e-9 ? col::accent.withAlpha(0.5f) : col::grid);
        g.drawVerticalLine((int) x, plot.getY(), plot.getBottom());
        g.setColour(col::fgFaint);
        g.drawText(juce::String(std::abs(ms) < 1e-9 ? 0.0 : ms, step < 1 ? 1 : 0), (int) x - 20, (int) plot.getBottom() + 2, 40, 14, juce::Justification::centred);
    }
    g.setColour(col::grid);
    g.drawHorizontalLine((int) plot.getCentreY(), plot.getX(), plot.getRight());
    g.setColour(col::fgFaint);
    g.drawText("ms", (int) plot.getRight() - 24, (int) plot.getBottom() + 2, 24, 14, juce::Justification::centredRight);

    // analiz penceresi (kick tetiğinde)
    if (trigger == Trigger::Kick) {
        const double ws = proc.apvts.getRawParameterValue(pid::winStart)->load();
        const double wl = proc.apvts.getRawParameterValue(pid::winMs)->load();
        const float x0 = xOf(ws), x1 = xOf(ws + wl);
        g.setColour(col::accent.withAlpha(0.06f));
        g.fillRect(juce::Rectangle<float>(x0, plot.getY(), x1 - x0, plot.getHeight()).getIntersection(plot));
        g.setColour(col::accent.withAlpha(0.45f));
        juce::Path ps; ps.startNewSubPath(x0, plot.getY()); ps.lineTo(x0, plot.getBottom());
        dashedPath(g, ps, 1.0f, {4, 4});
        juce::Path pe; pe.startNewSubPath(x1, plot.getY()); pe.lineTo(x1, plot.getBottom());
        dashedPath(g, pe, 1.0f, {4, 4});
        g.setColour(col::fgFaint);
        g.drawText(juce::String::fromUTF8("analiz penceresi"), (int) x0 + 4, (int) plot.getBottom() - 16, 140, 14, juce::Justification::centredLeft);
    }

    auto tracePath = [&](const std::vector<float>& v) {
        juce::Path p;
        if (v.empty()) return p;
        const int n = (int) v.size();
        const int W = std::max(1, (int) plot.getWidth());
        const double spp = (double) n / W;
        for (int px = 0; px < W; ++px) {
            const int i0 = (int) (px * spp), i1 = std::min(n, std::max(i0 + 1, (int) ((px + 1) * spp)));
            float y;
            if (spp <= 1.5) { y = yOf(v[(size_t) std::min(n - 1, i0)]); }
            else { float s = 0; for (int i = i0; i < i1; ++i) s += v[(size_t) i]; y = yOf(s / (float) (i1 - i0)); }
            const float x = plot.getX() + (float) px;
            if (px == 0) p.startNewSubPath(x, y); else p.lineTo(x, y);
        }
        return p;
    };
    g.saveState();
    g.reduceClipRegion(plot.toNearestInt());
    for (size_t h = 0; h < history.size() && persistence; ++h) {
        const float a = 0.12f * (float) (h + 1) / (float) history.size();
        if (showKick) { g.setColour(col::kick.withAlpha(a)); g.strokePath(tracePath(history[h].kick), juce::PathStrokeType(1.0f)); }
        if (showBass) { g.setColour(col::bass.withAlpha(a)); g.strokePath(tracePath(history[h].bass), juce::PathStrokeType(1.0f)); }
    }
    if (cur.valid) {
        if (showBefore) { g.setColour(col::fgFaint.withAlpha(0.7f)); dashedPath(g, tracePath(cur.bassIn), 1.0f, {2, 3}); }
        if (showSum) { g.setColour(col::sum.withAlpha(0.9f)); dashedPath(g, tracePath(cur.sum), 2.2f, {1.5f, 3.5f}); }
        if (showKick) { g.setColour(col::kick); g.strokePath(tracePath(cur.kick), juce::PathStrokeType(2.0f)); }
        if (showBass) { g.setColour(col::bass); dashedPath(g, tracePath(cur.bass), 2.0f, {8, 4}); }
    } else {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(14.0f));
        g.drawText(proc.sidechainConnected() ? juce::String::fromUTF8("Kick vuruşu bekleniyor…")
                                             : juce::String::fromUTF8("Sidechain bağlı değil: kick kanalını sidechain girişine yönlendir."),
                   plot, juce::Justification::centred);
    }
    // imleçler
    auto cursor = [&](double ms, const juce::String& name) {
        if (ms < -preMs) return;
        const float x = xOf(ms);
        g.setColour(col::fg.withAlpha(0.8f));
        g.drawVerticalLine((int) x, plot.getY(), plot.getBottom());
        g.drawText(name, (int) x + 3, (int) plot.getY() + 16, 20, 14, juce::Justification::centredLeft);
    };
    cursor(cursorA, "A");
    cursor(cursorB, "B");
    g.restoreState();

    // açıklama + ölçüm
    auto leg = getLocalBounds().toFloat().reduced(12, 8).removeFromTop(16);
    g.setFont(juce::FontOptions(12.0f));
    auto item = [&](juce::Colour c, const juce::String& s, int style) {
        auto box = leg.removeFromLeft(18);
        g.setColour(c);
        juce::Path p; p.startNewSubPath(box.getX(), box.getCentreY()); p.lineTo(box.getRight() - 2, box.getCentreY());
        if (style == 0) g.strokePath(p, juce::PathStrokeType(2)); else if (style == 1) dashedPath(g, p, 2, {5, 3}); else dashedPath(g, p, 2.2f, {1.5f, 3});
        g.setColour(col::fgSoft);
        g.drawText(s, leg.removeFromLeft(60), juce::Justification::centredLeft);
    };
    leg.removeFromLeft(30);
    if (showKick) item(col::kick, "Kick", 0);
    if (showBass) item(col::bass, "Bas", 1);
    if (showSum) item(col::sum, "Toplam", 2);
    if (frozen) { g.setColour(col::warn); g.drawText(juce::String::fromUTF8("DONDURULDU"), leg.removeFromLeft(90), juce::Justification::centredLeft); }
    if (cursorA >= -preMs && cursorB >= -preMs) {
        const double d = cursorB - cursorA;
        const juce::String s = juce::String::fromUTF8("A→B  ") + juce::String(d, 3) + juce::String::fromUTF8(" ms  ·  ") + juce::String(d * cur.fs / 1000.0, 2) +
                               juce::String::fromUTF8(" örnek  ·  ") + juce::String(std::fmod(d / 1000.0 * refHz * 360.0, 360.0), 1) +
                               juce::String::fromUTF8("° @ ") + juce::String(refHz, 1) + " Hz";
        g.setColour(col::fg);
        g.drawText(s, getLocalBounds().reduced(12, 8).removeFromTop(16), juce::Justification::centredRight);
    } else {
        g.setColour(col::fgFaint);
        g.drawText(juce::String::fromUTF8("tık: imleç A · sağ tık: imleç B · bas izini sürükle: pre-delay"), getLocalBounds().reduced(12, 8).removeFromTop(16),
                   juce::Justification::centredRight);
    }
}

void ScopeView::mouseDown(const juce::MouseEvent& e) {
    grabKeyboardFocus();
    const double ms = msOf(e.position.x);
    drag = Drag::None;
    if (trigger == Trigger::Kick) {
        const double ws = proc.apvts.getRawParameterValue(pid::winStart)->load();
        const double wl = proc.apvts.getRawParameterValue(pid::winMs)->load();
        if (std::abs(e.position.x - xOf(ws + wl)) < 6) { drag = Drag::WinEnd; return; }
        if (std::abs(e.position.x - xOf(ws)) < 6) { drag = Drag::WinStart; return; }
    }
    if (cursorA >= -preMs && std::abs(e.position.x - xOf(cursorA)) < 5) { drag = Drag::CursorA; return; }
    if (cursorB >= -preMs && std::abs(e.position.x - xOf(cursorB)) < 5) { drag = Drag::CursorB; return; }
    if (showBass && cur.valid) {
        const int i = (int) std::lround((ms + preMs) * cur.fs / 1000.0);
        if (i >= 0 && i < (int) cur.bass.size() && std::abs(yOf(cur.bass[(size_t) i]) - e.position.y) < 12) {
            drag = Drag::Bass;
            dragStartMs = ms;
            dragStartVal = proc.apvts.getRawParameterValue(pid::predelay)->load();
            if (auto* p = proc.apvts.getParameter(pid::predelay)) p->beginChangeGesture();
            return;
        }
    }
    if (e.mods.isPopupMenu() || e.mods.isAltDown()) { cursorB = ms; drag = Drag::CursorB; }
    else { cursorA = ms; drag = Drag::CursorA; }
    repaint();
}

void ScopeView::mouseDrag(const juce::MouseEvent& e) {
    const double ms = msOf(e.position.x);
    auto setParam = [&](const char* id, double v) {
        if (auto* p = proc.apvts.getParameter(id)) p->setValueNotifyingHost(p->convertTo0to1((float) v));
    };
    switch (drag) {
        case Drag::Bass: {
            const double k = e.mods.isShiftDown() ? 0.1 : 1.0;
            setParam(pid::predelay, juce::jlimit(-50.0, 50.0, dragStartVal + (ms - dragStartMs) * k));
            break;
        }
        case Drag::CursorA: cursorA = ms; break;
        case Drag::CursorB: cursorB = ms; break;
        case Drag::WinStart: setParam(pid::winStart, juce::jlimit(0.0, 50.0, ms)); break;
        case Drag::WinEnd: setParam(pid::winMs, juce::jlimit(20.0, 150.0, ms - proc.apvts.getRawParameterValue(pid::winStart)->load())); break;
        default: break;
    }
    repaint();
}

void ScopeView::mouseUp(const juce::MouseEvent&) {
    if (drag == Drag::Bass) if (auto* p = proc.apvts.getParameter(pid::predelay)) p->endChangeGesture();
    drag = Drag::None;
}

void ScopeView::mouseDoubleClick(const juce::MouseEvent& e) {
    if (showBass && cur.valid) {
        const int i = (int) std::lround((msOf(e.position.x) + preMs) * cur.fs / 1000.0);
        if (i >= 0 && i < (int) cur.bass.size() && std::abs(yOf(cur.bass[(size_t) i]) - e.position.y) < 12) {
            if (auto* p = proc.apvts.getParameter(pid::predelay)) p->setValueNotifyingHost(p->convertTo0to1(0.0f));
            return;
        }
    }
    cursorA = cursorB = -1e9;
    repaint();
}

void ScopeView::mouseWheelMove(const juce::MouseEvent& e, const juce::MouseWheelDetails& w) {
    if (e.mods.isShiftDown()) vScale *= w.deltaY > 0 ? 1.15f : 1 / 1.15f;
    else windowMs = juce::jlimit(1.0, 500.0, windowMs * (w.deltaY > 0 ? 1 / 1.15 : 1.15));
    repaint();
}

bool ScopeView::keyPressed(const juce::KeyPress& k) {
    const double st = k.getModifiers().isShiftDown() ? 0.01 : 0.1;
    if (k.getKeyCode() == juce::KeyPress::leftKey) { if (cursorA < -preMs) cursorA = 0; cursorA -= st; }
    else if (k.getKeyCode() == juce::KeyPress::rightKey) { if (cursorA < -preMs) cursorA = 0; cursorA += st; }
    else if (k.getTextCharacter() == '[') windowMs = juce::jlimit(1.0, 500.0, windowMs / 1.25);
    else if (k.getTextCharacter() == ']') windowMs = juce::jlimit(1.0, 500.0, windowMs * 1.25);
    else if (k.getTextCharacter() == 'f' || k.getTextCharacter() == 'F') frozen = !frozen;
    else return false;
    repaint();
    return true;
}

// ───────────────────────────── ölçer paneli
void MeterPanel::update() {
    const auto& f = scope.frame();
    if (!f.valid) return;
    auto w = scope.analysisWindowSamples();
    if (w.isEmpty()) w = {0, (int) f.kick.size()};
    double ek = 0, eb = 0, x = 0, es = 0, pkB = 0, pkA = 0, eBefore = 0;
    for (int i = w.getStart(); i < w.getEnd(); ++i) {
        const double k = f.kick[(size_t) i], b = f.bass[(size_t) i], bi = f.bassIn[(size_t) i];
        ek += k * k; eb += b * b; x += k * b; es += (k + b) * (k + b);
        eBefore += (k + bi) * (k + bi);
        pkA = std::max(pkA, std::abs(k + b)); pkB = std::max(pkB, std::abs(k + bi));
    }
    const double n = std::max(1, w.getLength());
    corr = x / std::sqrt(ek * eb + 1e-30);
    cancelDb = 10 * std::log10(es / (ek + eb + 1e-30) + 1e-30);
    peakBefore = 20 * std::log10(pkB + 1e-12); peakAfter = 20 * std::log10(pkA + 1e-12);
    rmsBefore = 10 * std::log10(eBefore / n + 1e-24); rmsAfter = 10 * std::log10(es / n + 1e-24);
    // frekansa göre faz farkı (Hann, son 8 vuruşun çapraz spektrum ortalaması)
    const int len = w.getLength();
    const int order = ceilPow2Order(std::max(1024, len * 2));
    FFT fft(order);
    const int N = fft.size();
    std::vector<std::complex<double>> K((size_t) N), B((size_t) N);
    for (int i = 0; i < len; ++i) {
        const double hw = 0.5 - 0.5 * std::cos(2 * kPi * i / std::max(1, len - 1));
        K[(size_t) i] = f.kick[(size_t) (w.getStart() + i)] * hw;
        B[(size_t) i] = f.bass[(size_t) (w.getStart() + i)] * hw;
    }
    fft.perform(K.data(), false);
    fft.perform(B.data(), false);
    const int k0 = std::max(1, (int) std::floor(20.0 * N / f.fs)), k1 = std::min(N / 2, (int) std::ceil(300.0 * N / f.fs));
    std::vector<std::complex<double>> gx;
    std::vector<double> gk, gb;
    for (int k = k0; k <= k1; ++k) { gx.push_back(B[(size_t) k] * std::conj(K[(size_t) k])); gk.push_back(std::norm(K[(size_t) k])); gb.push_back(std::norm(B[(size_t) k])); }
    gkb.push_back(gx); gkk.push_back(gk); gbb.push_back(gb);
    while (gkb.size() > 8) { gkb.pop_front(); gkk.pop_front(); gbb.pop_front(); }
    phaseHz.clear(); phaseDeg.clear(); coh.clear();
    for (size_t i = 0; i < gx.size(); ++i) {
        std::complex<double> sx = 0; double sk = 0, sb = 0;
        for (size_t h = 0; h < gkb.size(); ++h) if (gkb[h].size() == gx.size()) { sx += gkb[h][i]; sk += gkk[h][i]; sb += gbb[h][i]; }
        phaseHz.push_back((float) ((k0 + (int) i) * f.fs / N));
        phaseDeg.push_back((float) (std::arg(sx) * 180 / kPi));
        coh.push_back((float) (std::norm(sx) / (sk * sb + 1e-30)));
    }
    xy.clear();
    const int stepXY = std::max(1, len / 600);
    for (int i = w.getStart(); i < w.getEnd(); i += stepXY) xy.push_back({f.kick[(size_t) i], f.bass[(size_t) i]});
    repaint();
}

void MeterPanel::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::panel);
    g.fillRoundedRectangle(r, 10);
    auto in = r.reduced(12, 10);
    g.setFont(juce::FontOptions(12.5f));
    auto row = [&](const juce::String& name, const juce::String& val, juce::Colour c = col::fg) {
        auto line = in.removeFromTop(18);
        g.setColour(col::fgSoft); g.drawText(name, line, juce::Justification::centredLeft);
        g.setColour(c); g.drawText(val, line, juce::Justification::centredRight);
    };
    auto bar = [&](double v, double lo, double hi, juce::Colour c, double zero) {
        auto b = in.removeFromTop(10).reduced(0, 1);
        g.setColour(col::panelHi); g.fillRoundedRectangle(b, 3);
        const auto xOf = [&](double t) { return b.getX() + (float) ((juce::jlimit(lo, hi, t) - lo) / (hi - lo)) * b.getWidth(); };
        const float x0 = xOf(zero), x1 = xOf(v);
        g.setColour(c); g.fillRoundedRectangle(std::min(x0, x1), b.getY(), std::abs(x1 - x0), b.getHeight(), 3);
        in.removeFromTop(6);
    };
    g.setColour(col::fg); g.setFont(juce::FontOptions(13.5f, juce::Font::bold));
    g.drawText(juce::String::fromUTF8("Ölçerler · alt bant, analiz penceresi"), in.removeFromTop(20), juce::Justification::centredLeft);
    g.setFont(juce::FontOptions(12.5f));
    row("Korelasyon", juce::String(corr, 3), corr >= 0.5 ? col::ok : corr < 0 ? col::warn : col::fg);
    bar(corr, -1, 1, corr >= 0 ? col::ok : col::warn, 0);
    row(juce::String::fromUTF8("İptal / güçlenme"), (cancelDb >= 0 ? "+" : "") + juce::String(cancelDb, 2) + " dB", cancelDb >= 0 ? col::ok : col::warn);
    bar(cancelDb, -12, 3.1, cancelDb >= 0 ? col::ok : col::warn, 0);
    row(juce::String::fromUTF8("Tepe önce → sonra"), juce::String(peakBefore, 1) + juce::String::fromUTF8(" → ") + juce::String(peakAfter, 1) + " dB  (" +
        (peakAfter - peakBefore >= 0 ? "+" : "") + juce::String(peakAfter - peakBefore, 1) + ")");
    row(juce::String::fromUTF8("RMS önce → sonra"), juce::String(rmsBefore, 1) + juce::String::fromUTF8(" → ") + juce::String(rmsAfter, 1) + " dB  (" +
        (rmsAfter - rmsBefore >= 0 ? "+" : "") + juce::String(rmsAfter - rmsBefore, 1) + ")");
    const double d = proc.engine.uiD.load(), th = std::fmod(proc.engine.uiTh.load() + 3600.0, 360.0);
    row("Uygulanan", juce::String(d, 3) + juce::String::fromUTF8(" ms  ·  ") + juce::String(th, 1) + juce::String::fromUTF8("°"), col::accent);
    row(juce::String::fromUTF8("Güven (son vuruş)"), juce::String(proc.align.lastConfidence(), 3));
    row("Gecikme (L)", juce::String(proc.engine.latency() * 1000.0 / proc.engine.sampleRate(), 1) + " ms");
    if (proc.align.learnInProgress())
        row("Learn", juce::String(proc.align.learnCollected.load()) + " / " + juce::String((int) proc.apvts.getRawParameterValue(pid::learnHits)->load()) +
                         juce::String::fromUTF8(" vuruş"), col::accent);
    in.removeFromTop(6);
    // faz-frekans grafiği
    auto ph = in.removeFromTop(in.getHeight() * 0.5f).reduced(0, 4);
    g.setColour(col::fgSoft); g.drawText(juce::String::fromUTF8("Faz farkı (bas − kick), 20–300 Hz"), ph.removeFromTop(16), juce::Justification::centredLeft);
    g.setColour(col::panelHi); g.fillRoundedRectangle(ph, 6);
    const auto fx = [&](float hz) { return ph.getX() + std::log(hz / 20.0f) / std::log(15.0f) * ph.getWidth(); };
    const auto fy = [&](float deg) { return ph.getCentreY() - deg / 180.0f * ph.getHeight() * 0.46f; };
    g.setColour(col::grid);
    for (float hz : {30.f, 50.f, 100.f, 200.f}) {
        g.drawVerticalLine((int) fx(hz), ph.getY(), ph.getBottom());
        g.setColour(col::fgFaint); g.setFont(juce::FontOptions(10.0f));
        g.drawText(juce::String((int) hz), (int) fx(hz) - 14, (int) ph.getBottom() - 12, 28, 12, juce::Justification::centred);
        g.setColour(col::grid);
    }
    g.drawHorizontalLine((int) fy(0), ph.getX(), ph.getRight());
    for (size_t i = 0; i < phaseHz.size(); ++i) {
        const float a = juce::jlimit(0.08f, 1.0f, coh[i]);
        g.setColour(col::bass.withAlpha(a));
        g.fillEllipse(fx(phaseHz[i]) - 2.5f, fy(phaseDeg[i]) - 2.5f, 5, 5);
    }
    // XY
    in.removeFromTop(6);
    auto xyR = in.reduced(0, 2);
    g.setColour(col::fgSoft); g.setFont(juce::FontOptions(12.5f));
    g.drawText(juce::String::fromUTF8("XY — kick (x) · bas (y)"), xyR.removeFromTop(16), juce::Justification::centredLeft);
    const float s = std::min(xyR.getWidth(), xyR.getHeight());
    auto sq = juce::Rectangle<float>(s, s).withCentre(xyR.getCentre());
    g.setColour(col::panelHi); g.fillRoundedRectangle(sq, 6);
    g.setColour(col::grid);
    g.drawLine(sq.getX(), sq.getBottom(), sq.getRight(), sq.getY());
    g.drawLine(sq.getX(), sq.getY(), sq.getRight(), sq.getBottom());
    float mx = 1e-6f;
    for (auto& p : xy) mx = std::max({mx, std::abs(p.x), std::abs(p.y)});
    juce::Path pth;
    for (size_t i = 0; i < xy.size(); ++i) {
        const float px = sq.getCentreX() + xy[i].x / mx * s * 0.46f, py = sq.getCentreY() - xy[i].y / mx * s * 0.46f;
        if (i == 0) pth.startNewSubPath(px, py); else pth.lineTo(px, py);
    }
    g.setColour(col::sum.withAlpha(0.8f));
    g.strokePath(pth, juce::PathStrokeType(1.2f));
}

} // namespace kb::ui
