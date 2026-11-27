// Editörün gerçek sinyalle ekran görüntüsü: işlemciye kick/bas döngüsü beslenir, editör PNG'ye çizilir.
// Kullanım: kb_snapshot <parity klasörü> <çıktı.png> [mod] [sekme]
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
    auto k = load(dir + "/mloop_k.f64"), b = load(dir + "/mloop_b.f64");
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
    if (auto* tabs = ed->findChildWithID("tabs")) (void) tabs;
    for (auto* c : ed->getChildren()) if (auto* content = dynamic_cast<EditorContent*>(c))
        for (auto* cc : content->getChildren()) if (auto* t = dynamic_cast<juce::TabbedComponent*>(cc)) t->setCurrentTabIndex(tab);
    juce::MessageManager::getInstance()->runDispatchLoopUntil(400);
    auto img = ed->createComponentSnapshot(ed->getLocalBounds(), true, 2.0f);
    out.deleteFile();
    juce::FileOutputStream os(out);
    juce::PNGImageFormat().writeImageToStream(img, os);
    std::printf("yazıldı: %s (%dx%d)\n", out.getFullPathName().toRawUTF8(), img.getWidth(), img.getHeight());
    return 0;
}
