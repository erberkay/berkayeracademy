# PHASEFORGE — DSP design

All algorithms below are PHASEFORGE's own and were designed independently. Where FUSER's *documented
behaviour* shaped a decision, that is noted with a reference to `FUSER_TECHNICAL_ANALYSIS.md`. Nothing here is a
claim about how FUSER works internally.

The complete derivations, constants and edge cases are in the header comment of each module in `Source/DSP/`.
This file is the overview and records the reasons behind each decision.

| Module | File | Thread |
|---|---|---|
| Phase rotation (band-limited) | `PhaseRotator.h/.cpp` | audio |
| Phase analysis (angle search) | `PhaseAnalyzer.h/.cpp` | analysis |
| Phase Match (frequency-dependent) | `PhaseMatcher.h/.cpp` | estimate/design: analysis · filtering: audio |
| Dynamic EQ (nodes) | `DynamicEQ.h/.cpp`, `EnvelopeFollower.h`, `MidSide.h` | audio |
| Spectrum + conflicts + Resolve | `FFTAnalyzer.h/.cpp`, `ConflictDetector.h/.cpp` | analysis |
| Loudness / peak | `LoudnessMeter.h/.cpp` | audio (meter state read lock-free) |
| Capture, FIFOs | `LockFree.h` | audio → analysis |

## 1. Phase rotation

**Convention.** A rotation by θ of a real signal *x* is `y = x·cosθ − H{x}·sinθ` (H = Hilbert transform), so every
frequency inside the band is shifted by θ and its magnitude is unchanged.

**Linear Phase (FIR).** The band is isolated with a linear-phase band-pass BP and only that part is rotated:

    y = D(x) + (cosθ − 1)·BP(x) − sinθ·H{BP}(x)

- D is a pure delay matching the FIR latency.
- BP and H{BP} come from one complex FIR pair: half-length Hs = round(0.025·fs) and a Kaiser window. They are
  applied with uniformly partitioned FFT convolution (block 128).
- Latency is Hs + 128 samples: 1328 at 48 kHz, or 27.7 ms.
- At θ = 0 the output is exactly D(x) (bit-exact). Outside the band the result equals D(x) to within the
  band-pass skirt.
- Angle changes are smoothed over 20 ms and are wrap-aware.

**Zero Latency (IIR).**
- A polyphase all-pass quadrature pair (elliptic design, 16 sections) produces two outputs that are 90° apart.
- The band is cut with LR8 crossovers placed half an octave outside it. LR4 at the band edges produced nulls,
  which is why LR8 is used.
- The network is causal, so it only rotates *relative* to its own reference path. That is why an angle measured in
  FIR mode does not carry over to IIR mode.
- In IIR mode the processor therefore re-optimises the angle for the real IIR network (closed form, see
  `iirOptimalAngle` in `PluginProcessor.cpp`), and refuses to apply a result measured in the other mode.
- θ = 0 is a bit-exact bypass. Latency is 0.

## 2. ANALYZE PHASE

The input is 2–5 s of captured audio: the main signal (the "submissive" one, the one being rotated) and the
sidechain (the "dominant" one), both band-limited to the analysis band.

1. **Windowing.** The audio is cut into 150 ms windows with 50% hop.
2. **Gating.** A window counts as active only if both signals are above −70 dBFS and within 30 dB of their own
   loudest window. This keeps tails and silence from voting. At least 4 active windows covering at least 0.5 s
   are required.
3. **Objective.** For each angle θ the normalised cross-term is
   `S(θ) = Σ_w ⟨d, R_θ s⟩ / sqrt(Σ‖d‖²·Σ‖s‖²)`.
   Maximising S maximises the energy of d + R_θ s, i.e. the low end gets louder and fuller instead of cancelling.
4. **Search.** θ is scanned from −180° to 180° in 1° steps, then refined to 0.1° around the best value. The
   361-point curve is returned so the user interface can draw it.
5. **Refusal.** The result is refused (status ≠ Ok, angle 0) when:
   - there is not enough active audio, or it is silent;
   - the signals are unrelated (coherence below 0.35);
   - the per-window angles disagree (resultant length R below 0.70, "Inconsistent").
   A refused analysis never moves the knob.
6. **Reporting.** The result also gives a confidence (0–1):
   `clamp((coh − 0.35)/0.55) · clamp((R − 0.70)/0.25) · √min(1, windows/12)`.
   It also gives `sumGainDb`, the band energy change of d + s compared with 0°. The interface warns when the
   confidence is below 30%.

Why refuse instead of "always give an angle": KB-Align's first version always moved the bass by its best guess,
and on real material without a stable relationship it produced random shifts that "bozuyor" (damaged) the sound.
That is the user's own report.

## 3. Phase Match

This is a frequency-dependent correction rather than a single angle.

1. **Cross-spectrum.** G(f) is computed on 341 ms STFT frames. Shorter frames leaked too much at 30–60 Hz, which
   is why 341 ms is used.
2. **Weighting.** Each frame is weighted by energy × coherence.
3. **Smoothing.** Complex smoothing over 1/6 octave is applied. It is complex so that phase is averaged correctly.
4. **Correction.** The target is the measured phase, unwrapped from the most reliable bin. It is then
   regularised:
   - the group delay is limited to 7.5 ms;
   - total correction is limited to ±360°;
   - unreliable regions fade towards 0.
5. **Kernel.** A frequency-sampled FIR with a Kaiser window (β = 2.5) and 2·Hs + 1 taps (main tap at Hs), so it has the
   same latency as the FIR rotator. A design is accepted only if |H| stays within ±0.5 dB from 20 Hz to 20 kHz;
   otherwise the group-delay limit is reduced and the design is repeated.
6. **Blend.** Blend scales the correction phase, not the audio. Each blend value gives a new kernel, so there is
   no comb filtering.
7. **Kernel swap.** Three kernel slots are switched with a lock-free atomic index and a 20 ms crossfade.
8. **"Aggressive" flag.** Shown to the user when any of these holds:
   - the correction's group-delay spread in the band is above 3 ms;
   - it is a narrow-band correction: above 90°, with less than an octave where it exceeds 45°;
   - in-band pre-ringing more than 2 ms before the main tap is above −15 dB of the band energy, compared with the
     identity.

## 4. Conflict detection and RESOLVE CONFLICTS

- **Spectra.** Mid and Side are computed for both inputs:
  - STFT with a periodic Hann window and 75% overlap; the FFT size scales with the sample rate (4096 at 48 kHz);
  - 1/6-octave smoothing (never narrower than 3 bins);
  - 400 log-spaced display points;
  - display ballistics of 5 ms attack and 300 ms release.
- **Gain Stage Fix.** The two mixer-fader values are added to the levels (`g` = sidechain fader − main fader), so
  the comparison uses the levels you actually hear.
- **Conflict intensity.** For each band, with Sensitivity X (dB):

      ŝ = sidechain level after a 1/3-octave masking spread (36 dB/oct)
      Δ = ŝ − (m − g)          (how far the gain-staged main sits under the sidechain)
      R = smoothstep((X − Δ) / 3 dB)
      C = P_main · P_sc · R    (P = "meaningful energy" weights)

  Mid conflicts are drawn red and Side conflicts yellow (documented FUSER behaviour, see §2.7 and §2.12 of the
  analysis). Sensitivity is treated as a *target gap*.
- **RESOLVE CONFLICTS.**
  1. The frames from about 3 s of audio are averaged.
  2. Candidates are the peaks of conflict × energy of the weaker signal. Merging is greedy, at least 1/3 octave
     apart, at most 8 nodes, each Mid or Side.
  3. Each node gets:
     - `range = min(12, (m − g) − (s − X))`;
     - Q from the width of the conflict region (0.5–8);
     - attack/release interpolated from 10/150 ms at 50 Hz or below to 2/60 ms at 2 kHz or above.
  4. The processor writes `threshold = sidechain band level − 12 dB`, so the node reaches its full range on the
     hits. This was measured at 4.5 of 4.5 dB on kick hits.
  5. Nodes 1–8 are replaced (one undo step restores them); nodes 9–12 are left alone.

## 5. Dynamic EQ (12 nodes)

- **Detector.** A band envelope at the node's frequency and Q (quadrature peak, sine-calibrated).
  - Source: the sidechain Mid in Sidechain mode, or the node's own main channel when Sidechain is off
    (self-keyed).
- **Gain computer.**
  - Sidechain mode: soft knee ±2 dB around the threshold; the full range is reached 10 dB above it.
  - Difference mode: removes exactly the excess of the main over (sidechain − 3 dB), up to the range. It is
    gated by the threshold.
  - Attack 0.1–200 ms and release 5–1000 ms (63% time constants). Frequency, Q and range are smoothed over
    20 ms.
- **Zero Latency.**
  - Each node is a TPT-SVF bell (Simper), `y = x + k(A² − 1)·BP(x)`, with per-sample gain and coefficient
    updates, so there is no zipper noise.
  - Stereo nodes run on L/R; Mid/Side nodes run between an M/S encode and decode.
- **Linear Phase.**
  - At every block the product of the nodes' exact magnitude curves is sampled on an M-point grid and
    transformed to a symmetric FIR (Tukey window).
  - The FIR is applied by partitioned convolution. Consecutive kernels are cross-faded over one block.
  - Reductions are delayed by M/2 so the gain lines up with the delayed audio.
  - M = 8192 at 48 kHz, which gives a latency of B + M/2 = 4352 samples, or 90.7 ms.
  - When nothing changes the path is a bit-exact delay.
- **Solo, Mix, Delta.**
  - Solo: band-pass of the node's band.
  - Mix: dry/wet of the dynamic EQ only. The phase stage is not affected.
  - Delta: dry − wet, combined or for one node ("Hold: hear removed").

## 6. Metering

- **LoudnessMeter.** ITU-R BS.1770-4:
  - K-weighting coefficients recomputed for each sample rate;
  - momentary (400 ms), short-term (3 s) and gated integrated loudness (−70 LUFS absolute, −10 LU relative);
  - plus sample peak.
- **Calibration.** A 997 Hz sine at −20 dBFS in both channels reads −20.0 LUFS (EBU Tech 3341 cases 1 and 2
  pass). A mono sine reads −23.0 LUFS.
- **Level match.** Short-term loudness of main vs sidechain after Gain Stage Fix. Green means within 3 LU.

## 7. Latency (reported to the host, measured in `plugin_tests`)

| Filter mode | Phase mode | 48 kHz |
|---|---|---|
| Linear Phase | Rotate or Match | 1328 + 4352 = **5680 samples (118.3 ms)** |
| Zero Latency | Rotate | **0** |
| Zero Latency | Match (always FIR) | 1328 (27.7 ms) |

The latency depends only on (filter mode, phase mode, sample rate). Moving the band, the angle or a node never
changes it. Bypass outputs the dry signal delayed by the same latency, crossfaded over 10 ms.

**Decision.** Linear Phase is the default because a Rotate angle is absolute only in FIR mode, and because FIR
leaves the out-of-band phase untouched. The cost is 118 ms, which a DAW compensates. For live playing or tracking,
choose Zero Latency. FUSER markets itself as zero-latency (§2.14); this is a deliberate difference.

## 8. Real-time safety

- **Audio thread.** No allocation, no locks that can wait, no I/O.
  - The only lock is a `SpinLock::tryLock` around reconfiguration. If it is busy, the block is output silent
    instead of waiting.
  - All buffers are sized in `prepareToPlay`.
  - Analysis audio leaves through an SPSC FIFO plus a seqlock history.
- **Analysis thread.** Spectrum, Phase Analyze, Resolve and Phase Match kernel design.
- **Message thread.** Parameter writes (Resolve nodes, APPLY) and reconfiguration (AsyncUpdater).
- **Verification.** ThreadSanitizer reported 0 warnings over the plugin test suite. pluginval passes at
  strictness 10; see `TEST_REPORT.md`.
