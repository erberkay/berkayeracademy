# PHASEFORGE — test report

Every result below comes from a run on the same date as this report (Linux x86-64, GCC, Release build,
JUCE 9.0.6, VST3). The raw output is in `docs/test-logs/`. Nothing in this file is estimated or "expected": if a
test was not run, it is listed under **Not tested**.

How to reproduce:

```bash
cmake -S tools/phaseforge -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DPF_DEPS_DIR=$HOME/kbdeps
ninja -C build
cd build
./phase_tests && ./phasematch_tests && ./dyneq_tests && ./analysis_tests     # DSP, no JUCE
./pf_plugin_tests_artefacts/Release/pf_plugin_tests                           # whole processor
xvfb-run -a ./pf_ui_tests_artefacts/Release/pf_ui_tests                        # editor gestures
pluginval --strictness-level 10 --validate-in-process PHASEFORGE_artefacts/Release/VST3/PHASEFORGE.vst3
```

## Summary

| Suite | Tests | Result |
|---|---|---|
| `phase_tests` — PhaseRotator (FIR/IIR), PhaseAnalyzer | 92 | 92 passed |
| `phasematch_tests` — PhaseMatcher | 121 | 121 passed |
| `dyneq_tests` — DynamicEQ | 149 | 149 passed |
| `analysis_tests` — LoudnessMeter, FFTAnalyzer, ConflictDetector, capture | 174 | 174 passed |
| `pf_plugin_tests` — processor end to end | 82 | 82 passed |
| `pf_ui_tests` — editor interaction | 28 | 28 passed |
| pluginval, strictness 10, 3 random seeds (incl. Editor + Editor Automation) | 3 runs | SUCCESS × 3 |
| ThreadSanitizer build of the plugin tests (81 tests at the time) | — | 0 warnings |

## Key measurements

### Identity, bypass and latency
- **Nodes off at 0°.** The output equals the input delayed by the reported latency, **bit-exact** (max difference
  0). This holds for all four combinations of FIR/IIR × Rotate/Match.
- **Bypass.** Both the bypass parameter and `processBlockBypassed` return the delayed dry signal bit-exactly. A
  bypass switch while the processed signal is inverted (180°) produces no step larger than the signal's own slope
  (10 ms crossfade).
- **Latency.** The reported latency equals the measured impulse delay in all 16 cases (44.1/48/96/192 kHz ×
  2 filter modes × 2 phase modes). At 48 kHz:
  - Linear Phase: **5680 samples (118.3 ms)**;
  - Zero Latency + Rotate: **0**;
  - Zero Latency + Match: **1328**.
- **Band changes** do not change the latency.

### Phase
- **Analyzer.** Material: bass = the kick rotated by α, scaled 0.8, plus noise.
  - Found angle = −α within **0.00–0.1°**, across 44.1–176.4 kHz.
  - Silence, not enough audio, unrelated signals (noise vs a tone) and inconsistent relationships are all
    **refused** with angle 0.
- **Through the processor (FIR).**
  - α = −110°: angle +110.0°, summed 20–200 Hz energy **+4.71 dB** (predicted +4.72).
  - α = +75°: angle −75.0°, **+1.97 dB** (predicted +1.97).
  - Residual angle after processing: 0.2° or less.
- **Zero Latency (IIR).**
  - The re-optimised angle gives **+2.74 dB** (α = −110°) and **+0.01 dB** (α = +75°). Both are within 0.1 dB of
    the prediction for the IIR network.
  - A result measured in FIR mode is refused while the plugin is in IIR mode.
- **Phase Match.**
  - **+4.73 dB** summed; the kernel's magnitude deviation is 0.076 dB.
  - Blend 50 % gives +3.45 dB.
  - With Phase On switched off the output is bit-exact.
  - This large correction (109°) was correctly flagged *aggressive*.

### Dynamic EQ, Resolve, Delta
- **Sidechain-keyed node** (60 Hz, 12 dB).
  - Sidechain on: 60 Hz is cut by **12.00 dB** (IIR) / **11.98 dB** (FIR); 1 kHz by 0.015 dB; 5 kHz by 0.001 dB.
  - Sidechain off: no change (0.002 dB or less).
- **Resolve.** With a kick on the sidechain and a bass on the main input, it placed 1 node (95 Hz, 4.5 dB, Mid).
  On the kick hits the reduction reaches **4.5 of 4.5 dB**.
- **Delta.** wet + delta − delayed dry is **6·10⁻⁸** or less. Auditioning one node gives the same signal as the
  combined delta.

### Metering
- **K-weighting.** The 48 kHz coefficients match the BS.1770-4 table to 9·10⁻¹⁶. Other sample rates are within
  0.04 dB of it.
- **EBU Tech 3341.** Cases 1 and 2 read −23.0 / −33.0 LUFS (M, S and I) at all rates, within 0.02 LU.
- **997 Hz sine at −20 dBFS.** Stereo reads **−20.0** LUFS and mono reads −23.0 LUFS.

### State, robustness, real time
- **Save and restore.**
  - 138 parameters, both A/B slots, the Phase Match estimate and the UI state round-trip.
  - The restored processor renders **bit-identical** audio.
  - Copying active → inactive is correct.
  - Garbage or out-of-range state is clamped and never crashes.
- **Missing sidechain.** The disabled bus and a mono sidechain, with a mono or stereo main, give finite output.
  Analysis reports "no sidechain", and invalid layouts are refused.
- **Determinism.** Realtime-paced and offline rendering are identical, and so are block sizes 37, 64, 512 and
  1000.
- **CPU** at 48 kHz, 64-sample blocks, stereo, 4 active nodes:
  - Linear Phase: about 9 % of one core;
  - Zero Latency: about 1 %.
  - Occasional single FIR callbacks took up to 3.8 ms on this shared 4-core VM; the budget is 1.33 ms. This was
    **not investigated** further and should be checked on the Mac (see below).

### Editor (`pf_ui_tests`)
- **Node gestures.** Each gesture writes exactly the parameters it should:
  - double-click creates a node at the clicked frequency and reduction (100.00 Hz, 9.00 dB);
  - drag: 200.0 Hz, 12.00 dB;
  - Shift-drag moves 0.15 octave per octave of mouse movement;
  - mouse wheel changes Q;
  - rubber-band selection, and moving the whole selection;
  - Delete removes the selection, and Undo restores it;
  - zoom and the R reset.
- **Other controls.** A/B, ANALYZE / cancel, RESOLVE / cancel, the EN↔TR rebuild (nodes kept), and the 150 %
  window size (content scaled 1.5×) all work.
- **Bugs found and fixed by these tests.**
  - The **R** key did not reset the zoom; it only reacted to a typed character, not the key code.
  - Undo directly after an edit landed in the wrong transaction. This is because APVTS writes to the undo history
    from its own timer. The test now waits for the flush; a user acting at human speed is not affected.

## Not tested (yet)

- **AU and the Standalone app.** They were built but not validated: `auval` needs macOS (the Mac install script
  runs it).
- **Inside a real DAW** (Ableton Live sidechain routing, automation recording, offline bounce). This needs the
  Mac session.
- **Real recorded music.** All signal tests use synthetic material: kicks, basses, tones and noise with known
  answers. A listening test on real songs is the next step.
- **Apple Silicon performance** and the occasional slow FIR callback noted above.
- **Windows build.**

## Known limitations (measured, by design)

- **Latency.** Linear Phase adds 118 ms at 48 kHz, of which 90.7 ms is the dynamic EQ's linear-phase stage. Use
  Zero Latency for live work.
- **Zero Latency rotation is relative.** Its best angle gains less than in FIR mode; in one test case +0.0 dB
  vs +2.0 dB.
- **Mode switches.** Switching filter or phase mode briefly outputs silence while the plugin re-prepares. A/B
  between different modes behaves the same way.
- **Very narrow nodes in Linear Phase.** At 60 Hz with Q 10 the node reaches −9.1 of −12 dB, because the kernel
  length is fixed at M = 8192.
