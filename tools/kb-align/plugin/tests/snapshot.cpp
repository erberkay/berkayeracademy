// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — KB-Align. Lisans: ../LICENSE (GNU AGPL v3 ya da sonrası).
// Editörün gerçek sinyalle ekran görüntüsü: işlemciye kick/bas döngüsü beslenir, editör PNG'ye çizilir.
// Kullanım: kb_snapshot <parity klasörü> <çıktı.png> [mod] [sekme: -1 = basit görünüm] [görünüm 0/1/2] [tur adımı, -1 = yok]
//           [veri: mloop | adv0 | adv1 | adv2]
#include "../src/PluginEditor.h"

#include <fstream>

using namespace kb;

static std::vector<double> load(const std::string& p) {
    std::ifstream f(p, std::ios::binary | std::ios::ate);
    const size_t n = (size_t) f.tellg() / 8;
    std::vector<double> v(n);
    f.seekg(0);
    f.read((char*) v.data(), (std::streamsize) (n * 8));
    return v;
}

int main(int argc, char** argv) {
    juce::ScopedJuceInitialiser_GUI init;
    const std::string dir = argc > 1 ? argv[1] : "tests/parity";
    const juce::File out(juce::File::getCurrentWorkingDirectory().getChildFile(argc > 2 ? argv[2] : "kb-align.png"));
    const int mode = argc > 3 ? std::atoi(argv[3]) : (int) Mode::PerNote;
    const int tab = argc > 4 ? std::atoi(argv[4]) : 0;
    const int viewIdx = argc > 5 ? std::atoi(argv[5]) : 0;
    const int tourStep = argc > 6 ? std::atoi(argv[6]) : -1;
    EditorContent::autoTour = false;
    const std::string src = argc > 7 ? argv[7] : "mloop";
    auto k = load(dir + "/" + src + "_k.f64"), b = load(dir + "/" + src + "_b.f64");
    KBAlignProcessor p;
    auto layout = p.getBusesLayout();
    layout.inputBuses.getReference(0) = juce::AudioChannelSet::mono();
    layout.outputBuses.getReference(0) = juce::AudioChannelSet::mono();
    layout.inputBuses.getReference(1) = juce::AudioChannelSet::mono();
    p.setBusesLayout(layout);
    p.setRateAndBufferSizeDetails(48000, 256);
    p.prepareToPlay(48000, 256);
    auto* prm = p.apvts.getParameter(pid::mode);
    prm->setValueNotifyingHost(prm->convertTo0to1((float) mode));
    p.setNonRealtime(true);
    std::unique_ptr<juce::AudioProcessorEditor> ed(p.createEditor());
    ed->setVisible(true);
    juce::AudioBuffer<float> buf(2, 256);
    juce::MidiBuffer midi;
    for (int pass = 0; pass < 2; ++pass)
        for (size_t pos = 0; pos + 256 <= b.size(); pos += 256) {
            for (int i = 0; i < 256; ++i) { buf.setSample(0, i, (float) b[pos + (size_t) i]); buf.setSample(1, i, (float) k[pos + (size_t) i]); }
            p.processBlock(buf, midi);
            juce::MessageManager::getInstance()->runDispatchLoopUntil(1);
        }
    // Danışman kendi thread'inde vuruşları işler: sonuç durulana kadar bekle (en çok 8 s)
    for (int w = 0, same = 0, lastV = -1; w < 160 && same < 6; ++w) {
        juce::MessageManager::getInstance()->runDispatchLoopUntil(50);
        const int v = p.advisor.version();
        same = v == lastV ? same + 1 : 0;
        lastV = v;
    }
    auto& content = dynamic_cast<KBAlignEditor*>(ed.get())->getContent();
    content.setAdvanced(tab >= 0);
    if (tab >= 0) content.advancedTabs().setCurrentTabIndex(tab);
    content.setView(viewIdx);
    if (tourStep >= 0) content.startTour(tourStep);
    juce::MessageManager::getInstance()->runDispatchLoopUntil(400);
    auto img = ed->createComponentSnapshot(ed->getLocalBounds(), true, 2.0f);
    out.deleteFile();
    juce::FileOutputStream os(out);
    juce::PNGImageFormat().writeImageToStream(img, os);
    std::printf("yazıldı: %s (%dx%d)\n", out.getFullPathName().toRawUTF8(), img.getWidth(), img.getHeight());
    return 0;
}
