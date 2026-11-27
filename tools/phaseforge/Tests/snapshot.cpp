// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../LICENSE (GNU AGPL v3 or later).
// Editor screenshot with a real signal: a synthetic kick (sidechain) + bass (main) loop is fed through the processor,
// then the editor is rendered to PNG.  Usage: pf_snapshot [out.png] [width height] [demo] [match] [tr]
// "demo": also runs RESOLVE CONFLICTS and ANALYZE PHASE on the loop and selects node 1 (shows the whole workflow).
#include "../Source/PluginEditor.h"

#include <cstdio>

using namespace pf;

int main(int argc, char** argv) {
    juce::ScopedJuceInitialiser_GUI init;
    if (argc > 2 && juce::String(argv[1]) == "--export-presets") {   // writes the factory presets as .pfpreset files
        const juce::File dir(juce::File::getCurrentWorkingDirectory().getChildFile(argv[2]));
        dir.createDirectory();
        PhaseForgeProcessor p;
        for (int i = 0; i < p.getNumPrograms(); ++i) {
            p.setCurrentProgram(i);
            const auto name = p.getProgramName(i);
            const auto f = dir.getChildFile(juce::File::createLegalFileName(name.replace(juce::String::fromUTF8("\xe2\x80\x94"), "-")) + ".pfpreset");
            std::printf("%s %s\n", p.savePresetFile(f, name) ? "wrote" : "FAILED", f.getFullPathName().toRawUTF8());
        }
        return 0;
    }
    const juce::File out(juce::File::getCurrentWorkingDirectory().getChildFile(argc > 1 ? argv[1] : "phaseforge.png"));
    const int w = argc > 3 ? std::atoi(argv[2]) : 0, h = argc > 3 ? std::atoi(argv[3]) : 0;
    juce::StringArray opts;
    for (int i = 4; i < argc; ++i) opts.add(argv[i]);
    const bool demo = opts.contains("demo");
    const double fs = 48000;
    const int block = 256;

    PhaseForgeProcessor p;
    p.setRateAndBufferSizeDetails(fs, block);
    p.prepareToPlay(fs, block);
    p.setNonRealtime(true);
    if (opts.contains("match"))
        if (auto* prm = p.apvts.getParameter(id::phaseMode)) prm->setValueNotifyingHost(1.0f);
    p.processPendingWork();
    const juce::String oldLang = ui::userSettings().getValue("lang", "en");
    ui::userSettings().setValue("lang", opts.contains("tr") ? "tr" : "en");
    std::unique_ptr<juce::AudioProcessorEditor> ed(p.createEditor());
    ui::userSettings().setValue("lang", oldLang);
    if (w > 0 && h > 0) ed->setSize(w, h);
    ed->setVisible(true);

    // kick: 55 Hz body with a pitch drop, every 0.5 s; bass: 55 Hz saw-ish line, a little behind in phase
    juce::AudioBuffer<float> buf(4, block);
    juce::MidiBuffer midi;
    double kickPh = 0, bassPh = 0;
    const int total = (int) ((demo ? 7.0 : 4.0) * fs);
    for (int pos = 0; pos < total; pos += block) {
        for (int i = 0; i < block; ++i) {
            const double t = (pos + i) / fs, tk = std::fmod(t, 0.5);
            const double fk = 55.0 + 110.0 * std::exp(-tk / 0.03);
            if (tk < 1.0 / fs) kickPh = bassPh = 0;   // 808-style: the bass note restarts with each kick
            kickPh += 2 * kPi * fk / fs;
            const double kick = 0.8 * std::exp(-tk / 0.15) * std::min(1.0, tk / 0.002) * std::sin(kickPh);
            bassPh += 2 * kPi * 55.0 / fs;
            const double bass = 0.35 * (std::sin(bassPh + 0.6) + 0.3 * std::sin(2 * bassPh) + 0.12 * std::sin(3 * bassPh));
            buf.setSample(0, i, (float) bass);
            buf.setSample(1, i, (float) (0.9 * bass));
            buf.setSample(2, i, (float) kick);
            buf.setSample(3, i, (float) kick);
        }
        p.processBlock(buf, midi);
        if (demo && pos == (int) (1.0 * fs) / block * block) { p.requestResolveConflicts(); p.requestPhaseAnalysis(); }
        if ((pos / block) % 8 == 0) juce::MessageManager::getInstance()->runDispatchLoopUntil(demo ? 6 : 1);
    }
    juce::MessageManager::getInstance()->runDispatchLoopUntil(300);
    if (demo)
        if (auto* pe = dynamic_cast<PhaseForgeEditor*>(ed.get())) {
            pe->getContent().analyzer().selectNode(0);
            juce::MessageManager::getInstance()->runDispatchLoopUntil(200);
        }
    auto img = ed->createComponentSnapshot(ed->getLocalBounds(), true, 1.0f);
    out.deleteFile();
    juce::FileOutputStream os(out);
    if (!os.openedOk() || !juce::PNGImageFormat().writeImageToStream(img, os)) {
        std::printf("could not write %s\n", out.getFullPathName().toRawUTF8());
        return 1;
    }
    std::printf("wrote %s (%dx%d), latency %d samples, sidechain %s\n", out.getFullPathName().toRawUTF8(), img.getWidth(), img.getHeight(),
                p.getLatencySamples(), p.sidechainSignalPresent() ? "signal" : "none");
    return 0;
}
