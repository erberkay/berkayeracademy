// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 or later).
#include "MeterComponent.h"

namespace pf::ui {

static juce::String lufsText(float v) { return v <= -99.0f ? juce::String::fromUTF8("—") : fmtNum(v, 1); }

void MeterComponent::set(const MeterValues& v) {
    val = v;
    bar = std::max(v.peakDb, bar - 1.2f);
    if (v.peakDb >= hold) { hold = v.peakDb; holdFrames = 40; }
    else if (--holdFrames < 0) hold -= 0.8f;
    repaint();
}

void MeterComponent::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    auto toX = [&](juce::Rectangle<float> b, float db) { return b.getX() + juce::jlimit(0.0f, 1.0f, (db + 60.0f) / 66.0f) * b.getWidth(); };
    if (compact) {
        auto lab = r.removeFromLeft(30);
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(10.5f, juce::Font::bold));
        g.drawText(name, lab, juce::Justification::centredLeft);
        auto txt = r.removeFromRight(44);
        g.setColour(hold > -0.1f ? col::bad : col::fgSoft);
        g.setFont(juce::FontOptions(11.0f));
        g.drawText(hold <= -99 ? juce::String::fromUTF8("−∞") : fmtNum(hold, 1), txt, juce::Justification::centredRight);
        auto b = r.reduced(2, r.getHeight() * 0.32f);
        g.setColour(col::panelHi2);
        g.fillRoundedRectangle(b, 2);
        juce::ColourGradient gr(col::accentLo, b.getX(), 0, col::bad, toX(b, 6), 0, false);
        gr.addColour(0.80, col::accentHi);
        gr.addColour(0.92, col::warn);
        g.setGradientFill(gr);
        g.fillRoundedRectangle(b.withRight(toX(b, bar)), 2);
        g.setColour(col::fg);
        g.fillRect(toX(b, hold) - 1, b.getY() - 2, 2.0f, b.getHeight() + 4);
        return;
    }
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.06f));
    g.drawText(name, r.removeFromTop(14), juce::Justification::centredLeft);
    auto b = r.removeFromTop(8);
    g.setColour(col::panelHi2);
    g.fillRoundedRectangle(b, 2);
    g.setColour(col::accent);
    g.fillRoundedRectangle(b.withRight(toX(b, bar)), 2);
    r.removeFromTop(4);
    auto cell = [&](const juce::String& k, float v) {
        auto c = r.removeFromLeft(r.getWidth() / 3.0f + 0.5f);
        g.setColour(col::fgFaint); g.setFont(juce::FontOptions(10.0f)); g.drawText(k, c.removeFromTop(12), juce::Justification::centredLeft);
        g.setColour(col::fg); g.setFont(juce::FontOptions(13.0f, juce::Font::bold)); g.drawText(lufsText(v), c, juce::Justification::centredLeft);
    };
    cell("M", val.momentary);
    cell("S", val.shortTerm);
    cell("I", val.integrated);
}

void LevelMatch::paint(juce::Graphics& g) {
    auto r = getLocalBounds().toFloat();
    g.setColour(col::fgFaint);
    g.setFont(juce::FontOptions(10.5f, juce::Font::bold).withKerningFactor(0.06f));
    g.drawText(L("LEVEL MATCH", "SEVİYE EŞLEŞMESİ"), r.removeFromTop(14), juce::Justification::centredLeft);
    if (!sc || m <= -99 || s <= -99) {
        g.setColour(col::fgFaint);
        g.setFont(juce::FontOptions(12.0f));
        g.drawText(sc ? L("waiting for audio", "ses bekleniyor") : L("no sidechain", "sidechain yok"), r, juce::Justification::centredLeft);
        return;
    }
    const float d = m - s;  // main relative to sidechain
    auto b = r.removeFromTop(10).reduced(0, 2);
    g.setColour(col::panelHi2);
    g.fillRoundedRectangle(b, 3);
    const float cx = b.getCentreX(), x = cx + juce::jlimit(-1.0f, 1.0f, d / 12.0f) * b.getWidth() * 0.5f;
    g.setColour(std::abs(d) < 3 ? col::ok : std::abs(d) < 6 ? col::warn : col::bad);
    g.fillRoundedRectangle(juce::jmin(cx, x), b.getY(), std::max(2.0f, std::abs(x - cx)), b.getHeight(), 3);
    g.setColour(col::fg);
    g.fillRect(cx - 0.75f, b.getY() - 3, 1.5f, b.getHeight() + 6);
    g.setFont(juce::FontOptions(12.0f));
    g.setColour(col::fgSoft);
    g.drawText(L("main ", "ana ") + fmtNum(d, 1, true) + " LU " + L("vs sidechain", "sidechain'e göre"), r, juce::Justification::centredLeft);
}

}  // namespace pf::ui
