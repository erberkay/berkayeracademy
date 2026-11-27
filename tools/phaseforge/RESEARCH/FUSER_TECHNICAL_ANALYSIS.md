# PHASEFORGE: FUSER technical analysis (public behaviour vs. our implementation)

Status: research note, revised 2026-11-27 after reading every source directly (see §0). Scope: PHASEFORGE
independently implements functionality *inspired by the publicly documented behaviour* of Mastering The Mix FUSER.
This document does not describe, and must not be read as describing, FUSER's private implementation. Nothing here was
taken from FUSER binaries, decompilation or non-public material.

Every statement about FUSER falls into one of these categories:

| Tag | Meaning |
|---|---|
| **[A] Claim** | What the manufacturer says publicly (product page, blog). Marketing, not a specification. |
| **[B] Manual** | What the FUSER manual documents (controls, workflow, modes), quoted with its section heading. |
| **[C] Unknown** | Not publicly known. We do **not** guess at FUSER internals. |
| **[D] DSP** | Established, published DSP methods that can produce the same *observable* behaviour. |
| **[E] Ours** | The algorithm PHASEFORGE uses. Our design, not FUSER's. |
| **[F] Test** | The test that shows [E] does what we say. |

Quotations are verbatim from the pages as retrieved on 2026-11-27, including the sources' own typos. Sections are
cited as `URL § Heading`.

---

## 0. Source access log

The first version of this note relied on search snippets because the session's network blocked these hosts. The
coordinator then allowed `www.masteringthemix.com`, `masteringthemix.com`, `juce.com` and `docs.juce.com`. The
WebFetch tool still failed with DNS `ENOTFOUND` after a retry. `curl` through the session proxy succeeded (HTTP 200
for all 12 pages), so each page was downloaded and converted to plain text locally.

| # | Source | Read directly? | Notes |
|---|---|---|---|
| 1 | https://www.masteringthemix.com/pages/fuser-manual | **Yes** | Full text, all sections from "Overview" to "Help" |
| 2 | https://www.masteringthemix.com/products/fuser | **Yes** | Feature copy, comparison table, system requirements, FAQ |
| 3 | https://www.masteringthemix.com/blogs/learn/automatic-phase-fixing-in-mixing | **Yes** | Aug 11, 2025 |
| 4 | https://www.masteringthemix.com/blogs/learn/what-is-phase-and-why-should-you-care | **Yes** | Apr 25, 2023. General theory; it names no FUSER control |
| 5 | https://www.masteringthemix.com/blogs/learn/the-fuser-delta-trick-sidechain-ducking-that-doesnt-pump | **Yes** | Jun 15, 2026 |
| 6 | https://www.masteringthemix.com/blogs/learn/how-to-fix-a-flabby-low-end | **Yes** | Dec 10, 2024 |
| 7 | https://www.masteringthemix.com/pages/how-to-stem-master-a-song | **Yes** | Undated guide |
| 8 | https://www.masteringthemix.com/blogs/learn/how-to-make-a-vocal-cut-through-without-pushing-the-fader | **Yes** | Sep 21, 2026 |
| 9 | https://www.masteringthemix.com/blogs/learn/how-to-use-fuser-to-soothe-your-mix | **Yes** | Mar 18, 2025 |
| 10 | https://juce.com/tutorials/tutorial_audio_bus_layouts/ | **Yes** | |
| 11 | https://juce.com/tutorials/tutorial_dsp_introduction/ | **Yes** | |
| 12 | https://docs.juce.com/master/classjuce_1_1dsp_1_1FFT.html | **Yes** | |
| 13 | https://github.com/juce-framework/JUCE/blob/master/docs/CMake%20API.md | **Yes** | Read in the first pass |

No statement in this revision rests on search snippets. Where snippets from the first pass were wrong, the
correction is noted in §6.

---

## 1. FUSER at a glance: public positioning [A]

* "FUSER takes on the challenge of conflicting channels from multiple angles, including volume balance, phase
  optimization, and side chain ducking. With FUSER's smart conflict-detection and groundbreaking 'Resolve Conflicts'
  feature, you'll effortlessly find a great starting point to fix those audio clashes without overdoing it." (source
  1 § Overview)
* "It finds where two tracks clash and turns down only those frequencies dynamically, only while they overlap. It
  analyses both tracks, shows you the clashes in the mid and the sides, and sets dynamic EQ cuts in one click […] It
  also lines up the phase of layered sounds, and it runs with zero latency." (source 2, product description)
* Comparison table, row "FUSER": "places sidechain-triggered dynamic EQ cuts in one click with Resolve Conflicts.
  Phase Analyze sets the best phase rotation for layered sounds." Controls: "Every node's frequency, depth, Q,
  attack, release and mid/side setting. Delta listening. Volume balance suggestions." Note: "Zero latency." (source 2
  § FUSER compared with other unmasking plugins)
* "FUSER isn't a sidechain compressor. It's a multi-band, mid/side dynamic processor that uses sidechain
  triggering." (source 5 § 2 What FUSER Actually Does)
* Formats: see §2.20.

[C] Not publicly known: the analysis algorithms, filter designs and orders, FFT sizes, detector design, the conflict
metric, how Resolve Conflicts picks frequency, Q, depth and threshold, the Phase Match filter design, and any latency
figure for the Linear Phase FIR mode.

---

## 2. Manual walk-through [B] → equivalent DSP [D] → PHASEFORGE [E] → tests [F]

### 2.1 Routing, dominant / submissive, external sidechain

* **[B]** "Identify two conflicting channels and add FUSER as the final plugin on the submissive channel. Set the
  plugin wrapper's side chain to the dominant channel. For example if the kick and bass are clashing in the mix, place
  FUSER on the bass and side chain the kick." (source 1 § FUSER Quickstart)
* **[B]** "Disengage Side Chain to use FUSER as a simple dynamic EQ" (source 1 § Settings).
* **[A]** "Can I use FUSER without a sidechain? Yes. On a single track, FUSER can work from the track's own signal
  using the threshold, with no sidechain routing needed." "Your DAW needs to be able to route a sidechain into a
  plugin to use FUSER between two tracks." (source 2 § FAQ)
* **[A]** In stem mastering FUSER goes on individual stems, not the master bus: "Load FUSER on the submissive stem,
  above the CARBON Q agent, and side chain the dominant stem." (source 7 § Set up FUSER). "FUSER is designed for
  track-to-track unmasking." (source 2 § FAQ "Can I use FUSER on the master bus?")
* **[C]** The sidechain channel layouts FUSER accepts.
* **[D]** JUCE models the sidechain as a second input bus. "the first four input channels could be used as main
  channels and the last two input channels could be used as a sidechain" (source 10 § Introduction).
  "AudioChannelSet::disabled() […] is used to indicate that a particular bus is not used at the moment, for instance
  when a sidechain is not connected in a DAW." "A DAW may request a different AudioChannelSet for a particular bus at
  any time, for example when the DAW user switches the sidechain source from mono to stereo." (source 10 §
  Introduction). Buses are declared with `BusesProperties().withInput(name, set, enabled)` and accepted or rejected in
  `isBusesLayoutSupported`; "the plugin is passive […] It can only reject or accept requested AudioChannelSet
  configurations." (source 10 § Configuring the BusesLayout). The JUCE example `NoiseGatePluginDemo.h` reads the
  buses with `getBusBuffer(buffer, true, 0)` and `getBusBuffer(buffer, true, 1)`.
* **[E]** Plugin on **main = submissive**, **sidechain = dominant** (`docs/ARCHITECTURE.md`).
  * Main bus: mono or stereo, in == out, never disabled.
  * Sidechain: mono, stereo or disabled.
  * Parameter `Sidechain On`. With no sidechain, conflict detection returns C ≡ 0 and Resolve produces no nodes.
  * Self-keyed dynamic EQ (the documented "simple dynamic EQ") is **not yet designed**; see §4.
* **[F]** `testConflict` (present): "no sidechain → no conflict, no nodes". A bus-layout test is still needed: mono
  and stereo sidechain accepted, a disabled sidechain accepted, main in ≠ out rejected.

### 2.2 Frequency display

* **[B]** "The frequency display shows you the channel you're working on (grey) and the side chain channel (white
  line)." "The left hand scale is the input peak and helps you set the node threshold as it relates to the side chain
  signal. You'll see the 'delta' or frequency and time specific processing of your audio displayed by the white fill
  dropping from the top of the frequency display. The scale on the right shows the decibel reduction of the audio."
  (source 1 § Frequency Display)
* **[C]** FFT size, window, averaging and smoothing.
* **[D]** STFT magnitude, log-frequency resampling, fractional-octave smoothing and ballistics.
  * JUCE `dsp::FFT`: "The number of points the FFT will operate on will be 2 ^ order."
  * For `performRealOnlyForwardTransform`, "The size of the array passed in must be 2 * getSize(), and the first half
    should contain your raw input sample data."; with `onlyCalculateNonNegativeFrequencies` "the array will contain
    at least (size / 2) + 1 complex numbers".
  * The inverse "will only use the first ((size / 2) + 1) complex numbers, [but] the size of the array passed in
    must still be 2 * getSize()".
  * `performFrequencyOnlyForwardTransform` returns magnitudes "for things like frequency displays or analysis".
  * (All from source 12.) The page states no scaling convention, so PHASEFORGE checks it with a round-trip test.
* **[E]** `Source/DSP/FFTAnalyzer.*`:
  * STFT, N = 4096 at 48 kHz and 8192 at 96 kHz (range 1024–8192), hop N/4.
  * 400 log points from 20 Hz to 20 kHz; Mid and Side for both signals; calibrated so a −12 dBFS sine reads −12 dB.
  * Same colour roles as the manual: main grey, sidechain white.
  * The gain-reduction fill ("white fill dropping from the top") and its right-hand dB scale are UI work not yet
    done (§4).
* **[F]** `testSpectrum` (present): peak frequency error; 40 off-bin sines read −12 dB within 0.5 dB; L=R gives
  Side ≈ −∞; L=−R gives Mid ≈ −∞; checks of the default N and hop and of the display grid.

### 2.3 Phase Rotate

* **[B]** "You can adjust the phase rotation of your audio by ±180°. This can help reduce phase cancellation where
  frequencies overlap, especially when layering samples or similar sounds." (source 1 § Phase)
* **[A]** "Phase rotate doesn't audibly change the sonic character of your track, so it's the more transparent
  approach to phase fixing." (source 3 § Phase Rotate: Fine-Tuning Your Tracks). FAQ: "Phase rotate adjusts a
  track's phase across the full range and is transparent […] making it the safer option for aligning layered kicks
  and basses." (source 3 § FAQ)
* **[C]** The rotator's realisation and band edges.
* **[D]** Constant rotation y = x·cosθ − H{x}·sinθ (analytic-signal identity). It can be realised as an FIR Hilbert
  pair (linear phase), or as an IIR polyphase allpass quadrature pair (Valenzuela–Constantinides; de Soras HIIR).
  The JUCE DSP tutorial lists the same filter families: FIR "can be linear phase […] but less efficient than IIR", and
  among IIR designs "Half-Band Polyphase Allpass" (source 11 § Finite/Infinite Impulse Response or FIR/IIR).
* **[E] (our design)** `Source/DSP/PhaseRotator.*`. Convention θ ∈ [−180°, 180°], θ = 0 → y = x.
  * **FIR mode:** y = D(x) − BP(x) + cosθ·BP(x) − sinθ·H{BP}(x), with BP and H{BP} of length 2·Hs+1 (Kaiser β = 4)
    and Hs = round(25 ms·fs).
    * Computed as D + (cosθ−1)·BP − sinθ·H{BP}, so θ = 0 is bit-exact.
    * Latency Hs + 128.
    * Design edges are moved 0.6× the transition width outward, so the user band is rotated within about 0.3°.
  * **IIR mode:** allpass quadrature (I, Q ≈ H{I}), with the 90° difference held to ≤ 0.05°. LR4 band-limiting.
    At θ = 0 it crossfades to the exact dry signal over 20 ms.
  * Angle ramps along the shortest arc in 20 ms.
* **[F]** Required (`Tests/phase_tests.cpp`, referenced by the headers but **not in the repository**):
  1. θ = 0 in FIR mode is bit-exact.
  2. A sine in band comes out as cos(ωt+θ) within 0.3° and 0.07 dB.
  3. Out of band: unchanged in FIR mode, magnitude-flat in IIR mode.
  4. Measured latency equals the reported latency.
  5. A 170° → −170° ramp passes through 180°.
  6. `process()` does not allocate.

### 2.4 Phase Analyze

* **[B]** "The innovative Phase Analyze feature listens to the combined signal of the original and side chained
  channels and analyses every phase position between -180 and +180°. It automatically identifies and sets the optimal
  phase rotation ensuring minimal phase cancellation when layering similar sounds such as kicks and basses." (source 1
  § Phase)
* **[A]** "Upon activation, FUSER swiftly analyzes the audio signal in real time, focusing on the phase interactions
  between frequencies. This analysis typically completes in just 2 to 5 seconds" (source 3 § Layering Kicks with
  FUSER, step 3). FAQ: it "tests every phase rotation between -180 and +180 degrees, and sets the one with the least
  cancellation" (source 2 § FAQ). The low-end article says to click "FUSER's phase optimization button to ensure that
  your kick and bass are in phase" (source 6, step 5).
* **[C]** Metric, resolution, gating, and what FUSER does with silent or unrelated input. The documented criterion is
  "minimal phase cancellation" of the combined signal, which is equivalent to maximising the energy of d + r_θ.
* **[D]** Maximise the energy of the sum, or the normalised correlation between d and r_θ. Both are trigonometric in
  θ and can be evaluated in closed form from a few sums. Circular statistics test consistency over time.
* **[E] (our design)** `Source/DSP/PhaseAnalyzer.*`, background thread.
  1. Capture 2–5 s of d (sidechain) and s (main). This duration was chosen before reading source 3 and happens to
     match its stated 2–5 s.
  2. Band-limit both to the phase range and form the analytic signal by frequency-domain decimation.
  3. Use 150 ms windows with a 75 ms hop. **A window counts only if both signals pass the gate:** band RMS ≥ loudest
     window − 30 dB and ≥ −70 dBFS. Require ≥ 4 active windows covering ≥ 0.5 s.
  4. Score J(θ) = Σd·r_θ / √(Σd²·Σr_θ²), r_θ = s·cosθ − H{s}·sinθ. Scan at 1°, then refine ±1° in 0.1° steps.
  5. Per window, v_w = Σd·s + j·Σd·H{s}. Coherence = Σ|v_w| / √(ΣEd·Σ½(Es+Eh)), resultant R = |Σv_w| / Σ|v_w|.
     Coherence < 0.35 → Unrelated; R < 0.70 → Inconsistent.
  6. **Refusal:** every status except Ok returns angle 0 and a warning.
  7. The result also reports the predicted sum gain, 10·log10(E(d + r_best) / E(d + s)). This is the "least
     cancellation" quantity in the documented wording.
  8. Gain Stage Fix scales s before the analysis (§2.17).
* **[F]** Required (not yet present):
  1. A known rotation θ₀ (with noise) is recovered within 0.1°.
  2. The closed form θ* = atan2(−Σd·H{s}, Σd·s) agrees with the grid search.
  3. Silence → Silent, angle 0.
  4. Independent noise → Unrelated, angle 0.
  5. The relation flips mid-capture → Inconsistent, angle 0.
  6. The result does not depend on input level.
  7. The sum energy at θ* is ≥ the energy at every other grid angle (the documented "minimal cancellation"
     criterion).

### 2.5 Phase Match

* **[B]** "You can switch from Phase Rotate to Phase Match by clicking on the 'ROTATE' knob label. Phase Match matches
  the phase components of the submissive and dominant tracks, thus completely removing phase cancellation. It can
  cause some audio artefacts so use with caution." (source 1 § Phase)
* **[A]** "Phase Match can be quite destructive to the overall sonic quality of the sound […] The adjustments are
  frequency-specific, which is why it can alter the overall sound of the audio. It's particularly useful when dealing
  with layered backing vocals." "Setting the knob to 100% will completely match the phase of the two channels,
  however, this can be quite destructive to the sound. Lower the percentage and fine-tune if necessary" (source 3 §
  Phase Match: Automatic Alignment). FAQ: "Phase match works frequency by frequency and can sound more destructive,
  so it is reserved for trickier cases like clashing layered backing vocals" (source 3 § FAQ).
* So FUSER documents a **percentage control for Match (0–100 %)**. The statement that it "completely remov[es] phase
  cancellation" is a manufacturer claim, and §5 explains why no static filter can guarantee it.
* **[C]** Estimator, smoothing, filter type and length, and Match latency.
* **[D]** Cross-spectrum G = E[D·S*], magnitude-squared coherence, fractional-octave complex smoothing,
  regularisation, frequency-sampling FIR with a window, and a group-delay limit.
* **[E] (our design)** `Source/DSP/PhaseMatcher.*`.
  * Coherence-weighted STFT cross-spectrum over frames where both signals are active.
  * 1/6-octave **complex** smoothing; φ = arg G.
  * Regularised with coherence and energy weighting, careful unwrapping, a magnitude limit, and a group-delay slope
    limit tightened until |H| is within ±0.5 dB.
  * **Unity-magnitude FIR** by frequency sampling, length 2·Hs+1, with the same latency as FIR Rotate.
  * **Blend 0–100 %** scales the correction phase. This matches the documented percentage knob in function, though
    FUSER's law for it is unknown.
  * **Aggressive warning** when any of these holds: group-delay spread > 3 ms; a narrow-band correction > 90° whose
    > 45° region is < 1 octave wide; or pre-ringing > −15 dB more than 2 ms before the main tap.
  * Unrelated input → no correction.
  * Kernel swaps lock-free with a 20 ms crossfade. FIR only.
* **[F]** Required (not yet present):
  1. A known allpass is undone within tolerance, with |H| within ±0.5 dB.
  2. Unrelated signals → no kernel.
  3. Blend 0 is identity (pure delay).
  4. A steep phase feature trips the aggressive flag.
  5. Latency equals FIR Rotate.
  6. Click-free kernel swap.

### 2.6 Phase filters

* **[B]** "You can use the phase filters to focus the phase adjustments to only process a specific range. The filter
  visual shows the most significant areas with phase conflicts as a red glow to help you set the range more
  efficiently." (source 1 § Phase). Source 3 repeats this (§ Layering Kicks with FUSER, step 4).
* **[C]** Filter type, slope and limits. No numeric range is published in any of the sources read.
* **[E]** `Phase Low Cut` 20 Hz–10 kHz (default 20), `Phase High Cut` 40 Hz–20 kHz (default 200), presets
  Low/Mid/High/Custom. The band is shared by Rotate, Analyze and Match.
  * The **phase-conflict glow** (which frequencies cancel) is not yet designed. A natural source is the cross-spectrum
    from §2.5: highlight where coherence is high and cos(arg G) < 0 (§4).
* **[F]** Rotator band tests (§2.3, item 3), plus: an out-of-band interferer does not move Analyze's θ.

### 2.7 Conflict detection and colours

* **[B]** "The frequency display shows areas in conflict in the mid channel as a red glow. Conflicts in the side
  channel are displayed in yellow." (source 1 § Frequency Display). Sensitivity "affects the conflict display"
  (source 1 § Settings, see §2.12).
* **[A]** Masking examples: "kick and bass around 50 to 120 Hz, bass and guitars around 150 to 300 Hz, snare and
  vocal around 1 to 3 kHz, and vocals against pads or guitars around 1 to 4 kHz" (source 2 § FAQ). Matching levels
  first "makes the clash analysis honest. The display reads conflict, not just whichever channel is louder." (source
  5 § 3, step 2). "If the submissive stem is louder than the dominant one, masking will always occur." (source 7 §
  Set up FUSER)
* **[C]** FUSER's masking metric.
* **[D]** Masking models (spreading across critical bands), level-ratio tests, temporal integration.
* **[E] (our design)** `ConflictDetector`, per point and separately for Mid and Side:
  * Sidechain spread ±1/3 octave at 36 dB/oct.
  * Adaptive floors; presence of **both** signals; relative-level term R = smoothstep((ŝ − (m − g) + 12)/12).
  * C = P_main·P_sc·R, accumulated over frames for temporal persistence.
  * Mid conflict red, Side conflict yellow, the convention documented by FUSER.
  * **Gap:** our R uses a fixed 12 dB span, while FUSER documents that sensitivity sets "the level at which conflict
    is detected" (§2.12 and §4).
* **[F]** `testConflict` (present): C(55) > 0.5, C(300) < 0.1, C(1 k) < 0.05; mono material C_side < 0.01; maximum
  within ½ octave of 55 Hz; a side-only 2 kHz conflict → Side node; a main-only tone → no node.

### 2.8 Resolve Conflicts

* **[B]** "Click the 'Resolve Conflicts' button to automatically initiate processing that transparently resolves
  channel conflict and frequency masking without overdoing it." (source 1 § FUSER Quickstart). "When you use the
  Resolve Conflicts feature, nodes automatically inititate the appropriate mid-side setting." (source 1 § Mid Side).
  The Resolve depth target is set by Conflict Sensitivity (§2.12).
* **[A]** "Allow a few seconds for FUSER to analyze the audio, then click the Resolve Conflicts button" (source 6,
  step 3). "Play the chorus. Click Resolve Conflicts. FUSER places dynamic nodes at the conflict points. […] Adjust
  the depth on each node if FUSER overdid it." (source 8 § 4 Step Three)
* **[C]** Node count, and how frequency, Q, threshold and times are chosen.
* **[E] (our design)** `resolveConflicts()`:
  * Candidates are local maxima of max(C_mid, C_side) ≥ 0.2, scored by conflict × relative main level.
  * Greedy selection of **≤ 8 nodes**, merged within **1/3 octave**.
  * Q from region width (Q = √(2^BW)/(2^BW−1), clamped 0.5–8).
  * Range ≈ sens + 3 dB at full conflict, capped at 12 dB and at "main 6 dB under the sidechain".
  * Threshold = sidechain band level − 6 dB.
  * Attack/release 10/150 ms at ≤ 50 Hz down to 2/60 ms at ≥ 2 kHz.
  * Channel Mid, Side or Stereo chosen automatically, which agrees with the documented automatic mid/side setting.
  * **Gap:** the depth target should follow the documented sensitivity rule (§2.12 and §4).
* **[F]** `testConflict` (present): node count 1–8; top node within ¼ octave of 55 Hz on Mid; range in
  (0.5, sens+3]; Q in [0.5, 8]; low-frequency times ≥ 8/130 ms and 2 kHz times < 2.5/70 ms; threshold between
  −40 and −3 dB; separation ≥ 1/3 octave; sensitivity 0 → no nodes; sensitivity 0.5 → ≤ 2 dB; sensitivity 9 → ≤ 12 dB.

### 2.9 Nodes: threshold, depth, Q, attack, release, editing

* **[B]** "Double-click anywhere within the frequency display to create a node and initiate dynamic frequency
  reduction. The node's vertical position determines the threshold. Position the node at the peak level of the side
  chain signal where you want the dynamic ducking to trigger." "Hover over a node and scroll to adjust the Q, or use
  the knob in the control panel." "On hover over, you'll find solo, bypass, and delete buttons for each node." "Click
  and drag to select and adjust multiple nodes." (source 1 § Nodes)
* **[B]** "To manually create a node, double-click the frequency display. Drag the node down to increase the
  processing amount. Adjust mid/side, Q, attack, and release individually." (source 1 § FUSER Quickstart)
* **[B]** Attack: "Sets how fast the gain reduction reacts after the side chained signal level surpasses a nodes
  threshold." (source 1 § Attack). Release: "Sets how fast the gain reduction returns to zero after the side chained
  audio no longer exceeds a nodes threshold." (source 1 § Release). Pro tip: "Engage delta (Δ) and solo the two
  conflicting channels. Then set the attack and release so the delta signal is heard in unison with the side chain
  signal." (source 1 § Release)
* **Release is per node (resolved).** The manual says "Adjust mid/side, Q, attack, and release individually" (§
  Quickstart). Source 8 says "The conflict bands have individual mid/side, Q, attack, and release controls" (§ 4).
  Source 5 says "attack and release tuned per node" (§ 2). The sentence "Affects the overall dynamic processing of
  all nodes" belongs to **MIX** (source 1 § MIX), not Release.
* **[A]** Typical values (source 5 § 3–4):
  * Kick → bass: "Keep the Q tight, around 4–6"; release on a 120 BPM track "roughly 80–150 ms"; "2–3 dB is plenty
    for most kick and bass relationships".
  * Vocal → music: "Slightly wider Q, around 2–4"; "Aim for 2–3 dB of ducking at most".
  * Most relationships need "a single FUSER node around 80 Hz, mid position, 2–3 dB" and, for vocal/music, "one node
    around 1.5–2 kHz".
* **[A]** In self-keyed use the vertical position is both a depth and a threshold: "Drag the node downward to
  determine how much gain reduction should be applied. Unlike a static EQ cut, this will only activate when the
  frequency exceeds the node's vertical position—effectively setting a threshold." (source 9 § Step 3)
* **[C]** How the single vertical position maps to threshold and to depth, detector type and knee, and parameter
  ranges. None are published.
* **[D]** Dynamic EQ: a band detector on the key signal, a gain computer, log-domain ballistics (Giannoulis,
  Massberg & Reiss 2012), and a dynamic bell.
* **[E] (our design)**
  * Per node: `BandEnvelope` (4th-order TPT-SVF with a quadrature envelope, 0 dBFS sine at f0 → 0 dB), then a
    dB-domain follower with separate attack and release.
  * 8 nodes, each with On, Freq 20 Hz–20 kHz, Reduction 0–18 dB, Threshold −80…0 dB, Q 0.1–20, Attack
    0.1–200 ms, Release 5–1000 ms, Channel, Bypass, Solo.
  * Release per node, consistent with the manual.
  * Threshold and Reduction are separate parameters. The UI must define how a vertical drag maps onto them (§4).
  * Delete, multi-select and scroll-Q are UI work (§4).
* **[F]** Required:
  1. A 0 dBFS sine at f0 reads 0 dB.
  2. The 63 % step times equal the attack and release settings within 5 %.
  3. No reduction below threshold.
  4. Out-of-band key content does not trigger.
  5. The bell's reduction at f0 equals the computed reduction.

### 2.10 Dynamic gain: Side Chain / Difference

* **[B]** "Use 'Side Chain' dynamic gain in most scenarios. 'Difference' dynamic gain adjusts the difference between
  the submissive and dominant channels to never be less than the node gain settings. In some scenarios this means that
  unnecessary gain reduction isn't applied to the submissive channel resulting in a fuller combined sound." (source 1
  § Settings)
* **[C]** The exact gain law.
* **[E] (our design)** `Dynamic Mode` = {Sidechain, Difference}.
  * Sidechain: reduction from the sidechain detector's excess over threshold, limited to range.
  * Difference: a second detector measures the main signal at the node; reduction = clamp(range − (L_sc − L_main),
    0, range) while the key is over threshold. The main is ducked only until it sits `range` dB below the sidechain.
  * This is our reading of the documented outcome, not FUSER's formula.
* **[F]** Required:
  1. Main already ≥ range below the sidechain → 0 dB reduction in Difference mode, full range in Sidechain mode.
  2. Equal levels → full range in both modes.
  3. Difference reduction never exceeds range.

### 2.11 Mid/Side

* **[B]** "Each node can process audio anywhere within the mid-side spectrum or the full stereo field adjustable using
  the knob in the control panel. Nodes that are mid focussed will display an 'M', whereas side-focussed nodes will
  display an 'S'." "By isolating a node's processing to either the mid or side channel, you can resolve conflicts
  more efficiently without needlessly affecting parts of the signal that are not in conflict." (source 1 § Mid Side)
* This documents a **continuous knob** ("anywhere within the mid-side spectrum"), not a 3-way switch.
* **[A]** "only in the mid channel (great for vocals) or only in the sides (ideal for cymbals and wide synths)"
  (source 9 § Step 4).
* **[C]** The law of the continuous control (crossfade between M, stereo and S).
* **[E]** M = (L+R)/2, S = (L−R)/2, L = M+S, R = M−S (`MidSide.h`). Per-node Channel is Stereo, Mid or Side, a
  **3-way choice**. The continuous control is a gap (§4).
* **[F]** Encode → decode round trip is exact; `testSpectrum` L=R / L=−R cases (present); a Mid-only node leaves L−R
  unchanged.

### 2.12 Conflict Sensitivity (resolved)

* **[B]** "Conflict sensitivity sets the level at which conflict is detected. This figure affects the conflict
  display, and the 'Resolve Conflicts' button results. For example, if set to 3dB, 'Resolve Conflicts' would initiate
  ducking that would keep the submissive channel at least 3dB quieter than the side chain loudness. The Conflict
  Sensitivity range is 0dB to 9dB." (source 1 § Settings)
* So the documented meaning is a **level-difference target**: "submissive ≥ X dB under the sidechain". It controls
  (1) when a region counts as in conflict and (2) how deep Resolve ducks.
* **[E] (current)** `Conflict Sensitivity` 0–9 dB, default 4.5. The range matches the manual. The meaning **differs**:
  * Our sensitivity scales node depth (≈ sens + 3 dB at full conflict).
  * The conflict display's relative-level ramp is fixed (−12…0 dB).
  * The depth cap uses a fixed "main 6 dB under the sidechain".
  * Sensitivity 0 gives no nodes. Under the documented meaning, 0 dB should still duck the submissive down to the
    sidechain's level.
  * The redesign is listed in §4.
* **[F]** The current sensitivity cases in `testConflict` (§2.8). A redesign needs new tests: after Resolve at
  sensitivity X, the processed main's band level at each node is ≤ sidechain band level − X (±1 dB) during hits; and
  the conflict display at sensitivity X flags a region only where main > sidechain − X.

### 2.13 MIX, input/output gain, level-match pointer, meters

* **[B]** MIX: "Affects the overall dynamic processing of all nodes. Mix does not affect the input gain, output gain,
  or the phase adjustments." (source 1 § MIX)
* **[B]** "The input gain level match pointer shows the gain adjustments needed to match the perceived volume of your
  submissive channel to the side chained audio. This simple target helps you set a great relative volume balance,
  whether you want the submissive channel to be equally loud or slightly quieter than the dominant channel." (source
  1 § FUSER Quickstart)
* **[B]** "The input and output meters display momentary, short-term, and integrated LUFS of the signal. Click on the
  meters to select the numerical readout you wish to view. Once the side chain is enabled, you can see the input
  loudness of both the channel you're working on and your side chained channel relative to each other. The side chain
  loudness is represented by a thin grey line on the input meter." "Adjust the input and output gain to optimize the
  volume balance." (source 1 § Input / Output Meters)
* **[C]** The loudness measure behind the pointer (the manual says only "perceived volume").
* **[E]** Input and output gain ±24 dB. Mix 0–100 % blends only the dynamic EQ, leaving phase and gains unchanged,
  as documented.
  * Level-match pointer = integrated LUFS(sidechain) − LUFS(main) after Gain Stage Fix.
  * Meters per §2.18.
  * The selectable M/S/I readout and the grey sidechain line on the input meter are UI work (§4).
* **[F]** (1) Mix = 0 means no EQ, with phase and gains still active. (2) The pointer equals the injected level
  difference within 0.1 LU.

### 2.14 Filter mode (Zero Latency IIR vs Linear Phase FIR) and latency (resolved as far as the sources allow)

* **[B]** "Use Zero Latency IIR filters when you don't want to affect the transients of your audio, (or if your DAW
  does not compensate for side chain latency)". "Use Linear Phase FIR filters when you don't want to affect the phase
  relationships of your audio" (source 1 § Settings).
* **[B]** "The bypass button will let you preview the before and after results of the processing with the latency
  adjusted." (source 1 § Bypass)
* **[A]** "Does FUSER add latency? No. FUSER runs with zero latency." (source 2 § FAQ); also "Zero latency." (source
  2 comparison table).
* **The 41 ms figure is not about FUSER (resolved).** Source 7 says "The filters are linear phase, so they change the
  tone without smearing your transients, at 41 ms of latency." That sentence is in the **CARBON Q** section of the
  stem-mastering guide, not the FUSER section. FUSER publishes **no** FIR latency figure.
* **Interpretation:** the product FAQ's "zero latency" agrees with the Zero Latency IIR mode. The manual's advice to
  use IIR when the DAW does not compensate sidechain latency implies the Linear Phase FIR mode has non-zero latency.
  Its amount, and which mode is the default, are [C].
* **[E]** `Filter Mode` = {Zero Latency IIR, Linear Phase FIR}, currently default **FIR**.
  * FIR: Hs + 128 samples (≈ 27.7 ms at 48 kHz) plus the EQ stage, reported to the host.
  * IIR: 0 samples.
  * Phase Match is FIR only.
  * Our bypass must keep a latency-aligned dry path ("latency adjusted").
  * The default mode is a product decision (§4).
* **[F]** An impulse peaks at the reported latency in each mode; a mode switch updates `setLatencySamples`; in bypass
  the output equals the input delayed by the reported latency.

### 2.15 Delta Δ

* **[B]** "Clicking the Delta button allows you to solo the elements FUSER is removing from your mix. […] engaging
  delta and soloing your side chained signal allows you to set an attack and release time that perfectly aligns with
  the side chain signal." (source 1 § Delta Δ). "Click the small triangle button (Δ) in the top right to listen to the
  Delta signal." (source 1 § FUSER Quickstart)
* **[A]** "if Delta sounds like the bass ducking, you're pumping. If Delta sounds like a tight tap on the trigger
  frequency only, you've got transparent ducking." (source 5 § 3). "Now tweak the attack and release so that the
  reduction perfectly aligns with the kick attack and tail. […] Don't forget to turn off delta." (source 6, step 4)
* **[C]** Whether FUSER's Delta includes the phase stage. The manual's wording ("elements FUSER is removing") and its
  use for timing suggest the dynamic reduction, but this is not stated.
* **[E]** Delta = latency-aligned dry (after input gain and phase, before the EQ) − wet. Combined, or per node via
  node Solo. Phase rotation does not leak into Delta.
* **[F]** (1) Idle nodes → Delta ≡ 0. (2) dry − Delta == wet exactly. (3) Per-node Solo Delta equals the single-node
  difference.

### 2.16 A/B and Bypass (resolved)

* **[B]** "The A/B button allows you to quickly switch between two different states of the plug-in. […] The arrow
  above the A/B button copies the active state to the inactive state. This allows you to keep the current settings of
  the plugin in the inactive state and make a few adjustments in the active state" (source 1 § A/B). Bypass: "preview
  the before and after results of the processing with the latency adjusted." (source 1 § Bypass)
* **[E]** Two full parameter-state slots, a click-free switch (20 ms), and a separate latency-compensated Bypass.
  The copy direction must be **active → inactive**, as documented (the first draft of this note said "A→B").
* **[F]** Switching restores every parameter exactly; copy writes the active slot into the inactive one and leaves
  the active slot untouched; bypass output equals the delayed input.

### 2.17 Gain Stage Fix

* **[B]** "Plugins cannot detect the fader levels of DAWs. The fader levels can significantly affect the loudness
  relationship between two channels. FUSER's default analysis assumes that the two conflicting channel faders are set
  to 0dB. Where this is not the case, and you cannot insert FUSER as a 'post fader' plugin, you can open Gain Stage
  Fix, enter the fader amounts, and FUSER will adjust the analysis calculation accordingly." (source 1 § Gain Stage
  Fix). It is "located to the left of A/B" (source 1 § FUSER Quickstart).
* **[E]** `Gain Fix Main Fader` and `Gain Fix Sidechain Fader` (−60…+12 dB), used **only in analysis**: the conflict
  offset g, Phase Analyze scaling and sum-gain prediction, and the level-match pointer. The audio path is never
  changed.
* **[F]** (1) Output is bit-identical for any Gain Fix value. (2) C with the main 6 dB hotter and Gain Fix −6 equals C
  with no offset. (3) The Analyze angle is invariant to Gain Fix.

### 2.18 LUFS metering

* **[B]** Momentary, short-term and integrated LUFS, with a selectable readout and a sidechain line (§2.13; source 1
  § Input / Output Meters).
* **[D]** ITU-R BS.1770-4 / EBU R128 / EBU Tech 3341.
* **[E]** `LoudnessMeter`:
  * K-weighting at any sample rate (bilinear transform).
  * M = 400 ms and S = 3 s, both updated every 100 ms.
  * Integrated with an absolute gate at −70 LUFS and a relative gate at −10 LU (400 ms blocks, 75 % overlap), held
    in a histogram with ≤ 0.01 LU error.
  * Sample peak.
* **[F]** Present: `testKWeighting` (BS.1770-4 table within 1e-8; +0.691 dB at 997 Hz), `testLufsLevels`,
  `testLufsGating`, `testLufsTiming`.

### 2.19 Real-time plumbing (no FUSER counterpart)

* **[D]** The JUCE DSP API uses `prepare(ProcessSpec)` before processing, `process(context)` and `reset()` (source 11
  § ProcessorChain).
* **[E]** The analysis runs off the audio thread through a lock-free FIFO. Kernels and node sets are handed over by
  double-buffering with an atomic index. No allocation or locks in `process…`.
* **[F]** `testFifoMapping`, `testFifoStress` (present).
* Build (source 13): `juce_add_plugin` with `FORMATS` and an explicit `PLUGIN_MANUFACTURER_CODE` and `PLUGIN_CODE`
  (otherwise randomly generated on every configure). The recommended-flags targets are linked PUBLIC.

### 2.20 Formats and system requirements (for reference)

* **[B]** Manual: "FUSER is available in VST, VST3, Audio Unit, and AAX formats." macOS "OS X 10.10 or higher. 64-bit
  AU, VST ⅔, or AAX host." Windows "Windows 8 or higher." (source 1 § Help)
* **[A]** The product page is newer and differs: "FUSER runs as VST3, AU and AAX on macOS 10.15 or higher (Apple
  Silicon native), and as VST3 and AAX on Windows 10 or higher." (source 2 § FAQ). The two pages disagree; the
  product page appears to be the current one.

---

## 3. Feature table

"Publicly documented" now cites the page that was read. "Internal implementation known": FUSER's algorithm is not
public in any row.

| Feature | Publicly documented (FUSER) | Internal implementation known | Our implementation (PHASEFORGE) |
|---|---|---|---|
| Sidechain routing, submissive/dominant | Yes, manual § Quickstart | No | JUCE main + sidechain bus; plugin on the submissive track |
| Self-keyed "simple dynamic EQ" (side chain off) | Yes, manual § Settings; product FAQ | No | **Not yet** (§4) |
| Frequency display (grey main, white sidechain, delta fill, GR scale) | Yes, manual § Frequency Display | No | Spectrum done; delta fill and GR scale **not yet** |
| Phase Rotate ±180° | Yes, manual § Phase | No | FIR complementary rotation (25 ms + 128) / IIR allpass (0) |
| Phase Analyze (−180…+180, 2–5 s) | Yes, manual § Phase; blog (2–5 s) | No | Gated two-signal capture, J(θ) 1° → 0.1°, confidence + refusal |
| Phase Match + % knob | Yes, manual § Phase; blog (100 % = full match) | No | Coherence-weighted cross-spectrum FIR, blend 0–100 %, aggressive warning |
| Phase filters + phase-conflict glow | Yes, manual § Phase | No | Range done; phase-conflict glow **not yet** |
| Conflict colours (Mid red / Side yellow) | Yes, manual § Frequency Display | No | Same convention; our masking metric |
| Resolve Conflicts (auto mid/side) | Yes, manual § Quickstart, § Mid Side | No | ≤ 8 nodes, 1/3-oct dedup, Q from width, threshold from sidechain, f-dependent times, auto channel |
| Conflict Sensitivity 0–9 dB = "keep submissive ≥ X dB under sidechain" | Yes, manual § Settings | No | Range matches; **meaning differs** (§4) |
| Nodes: threshold, depth, Q, per-node attack/release, solo/bypass/delete, multi-select | Yes, manual § Nodes, § Attack, § Release | No (mapping of vertical drag unknown) | DSP parameters done; delete / multi-select / drag mapping **UI pending** |
| Mid/Side per node (continuous knob, M/S badge) | Yes, manual § Mid Side | No | 3-way Stereo/Mid/Side; **continuous not yet** |
| Dynamic gain Side Chain / Difference | Yes, manual § Settings | No | Sidechain: range × excess; Difference: clamp(range − (L_sc − L_main), 0, range) |
| Zero Latency IIR / Linear Phase FIR | Yes, manual § Settings | No; FIR latency unpublished | IIR 0; FIR Hs + 128 (+ EQ), reported |
| "Zero latency" | Product FAQ | — | True only in our IIR mode |
| Delta Δ | Yes, manual § Delta Δ | No (phase stage inclusion not stated) | Aligned dry (pre-EQ) − wet, combined or per node |
| Bypass, latency-adjusted | Yes, manual § Bypass | No | Latency-aligned dry path |
| A/B with copy active → inactive | Yes, manual § A/B | No | Two slots; copy direction to match the manual |
| MIX (dynamic only) | Yes, manual § MIX | No | Same scope |
| Input/output gain, level-match pointer | Yes, manual § Quickstart, § Meters | No ("perceived volume") | ±24 dB; pointer = ΔLUFS |
| LUFS meters (M/S/I, selectable, sidechain line) | Yes, manual § Input / Output Meters | No | BS.1770-4 meter done; selectable readout + sidechain line UI pending |
| Gain Stage Fix | Yes, manual § Gain Stage Fix | No | Analysis-only fader offsets |

---

## 4. Implications for PHASEFORGE (documented behaviour our design does not yet cover)

Ordered by how much each item changes behaviour. Each line names the source sentence that motivates it. How we
implement each one stays our own design.

1. **Conflict Sensitivity semantics** (source 1 § Settings: "keep the submissive channel at least 3dB quieter than the
   side chain loudness").
   * Redefine sensitivity X as a target level gap. The conflict display flags a region when the gain-staged main is
     above sidechain − X.
   * Resolve sets the node depth so the main's band level during hits ends ≤ sidechain − X.
   * Replace the fixed "6 dB under" cap and the "sens + 3" depth rule.
   * Sensitivity 0 should still duck to level parity, instead of producing no nodes.
   * Update `ConflictDetector` and the tests in `testConflict` that encode the current meaning (sens 0 → no nodes;
     range ≤ sens + 3).
2. **Self-keyed mode** (source 1 § Settings: "Disengage Side Chain to use FUSER as a simple dynamic EQ"; source 2
   FAQ). With `Sidechain On` off or the bus disabled, node detectors must key from the main signal, and the conflict
   display and Resolve are disabled.
3. **Continuous Mid/Side per node** (source 1 § Mid Side: "anywhere within the mid-side spectrum […] adjustable using
   the knob"). Replace the 3-way Channel choice with a continuous M↔Stereo↔S control (our law, e.g. separate M and S
   gain weights), keep Resolve's automatic setting, and show an M/S badge.
4. **Latency-adjusted Bypass** (source 1 § Bypass). Bypass must output the dry signal delayed by the reported latency,
   not undelayed. In JUCE, expose it as the host bypass parameter so host bypass behaves the same.
5. **A/B copy direction** (source 1 § A/B): copy **active → inactive**.
6. **Node editing UI** (source 1 § Nodes, § Quickstart):
   * Double-click to create; per-node solo, bypass and delete on hover; drag-select multiple nodes; scroll over a node
     for Q.
   * Decide and document how vertical drag maps to our separate Threshold and Reduction parameters. The manual uses
     both "vertical position determines the threshold" and "Drag the node down to increase the processing amount";
     FUSER's exact mapping is [C].
7. **Display overlays** (source 1 § Frequency Display): a left-hand input-peak scale for setting the threshold, the
   delta/gain-reduction fill "dropping from the top", and a right-hand reduction scale.
8. **Phase-conflict glow on the phase filter** (source 1 § Phase: "shows the most significant areas with phase
   conflicts as a red glow"). Proposed (ours): from the PhaseMatcher cross-spectrum, highlight bins with high
   coherence and cos(arg G) < 0 (destructive summation), weighted by level.
9. **Meter UI** (source 1 § Input / Output Meters): click to choose the M/S/I readout; a thin grey sidechain-loudness
   line on the input meter.
10. **Default filter mode.** FUSER is marketed as "zero latency" (source 2 FAQ); our default is Linear Phase FIR
    (≈ 27.7 ms at 48 kHz). Decide whether to default to IIR. If FIR stays the default, the UI should state the
    latency plainly and not claim "zero latency".
11. **Missing tests** (repository state): `Tests/phase_tests.cpp` (Rotate/Analyze/Match), dynamic-EQ tests (detector,
    ballistics, Sidechain/Difference, self-keyed), Delta/Bypass/A-B/Gain-Fix invariance, latency reporting, and the
    bus-layout test. No phase or dynamics behaviour should be called proven until these pass.

Already consistent with the documentation, no change needed: per-node attack and release; MIX scope (dynamic only);
Phase Match percentage (our Blend); Phase Analyze range −180…+180 and the 2–5 s capture; automatic mid/side on
Resolve; analysis-only Gain Stage Fix; Mid red / Side yellow; Sensitivity range 0–9 dB.

---

## 5. Honest limitations

1. **No phase correction removes all cancellation.**
   * FUSER's manual says Phase Match is "completely removing phase cancellation" (source 1 § Phase), while also
     warning of artefacts. The vendor's own blog calls Match "quite destructive" at 100 % (source 3). We do not make
     the "complete" claim.
   * Independent sources have no stable phase relation, so PHASEFORGE reports *Unrelated* and applies nothing.
   * Even for coherent material, cancellation remains where the magnitude spectra differ, where the relation changes
     between hits (*Inconsistent*), and below about 40 Hz (resolution limited by the 170 ms frames and the ±25 ms
     kernel).
2. **Frequency-dependent matching can smear transients.** A non-constant group delay spreads a hit in time, and a
   linear-phase kernel pre-rings. We limit the group-delay slope, flag aggressive corrections and offer Blend; the
   trade-off remains. This agrees with the manufacturer's "The adjustments are frequency-specific, which is why it can
   alter the overall sound" (source 3).
3. **One broadband angle is a compromise.** Rotate applies a single θ. Where the relative phase varies across the
   band, the best θ maximises the total sum but can worsen individual frequencies.
4. **Band-edge artefacts.** The complementary split mixes dry and rotated signal in the ~50 Hz transition skirts,
   which becomes a notch near |θ| = 180°. IIR LR4 edges rotate only part of the band.
5. **IIR mode is not a pure rotation.** The output carries the allpass network's frequency-dependent phase, so an angle
   measured as a pure rotation (FIR) does not reproduce exactly in IIR mode.
6. **Latency.** FIR mode adds Hs + 128 samples plus the EQ stage. Hosts that do not compensate sidechain latency
   misalign the detector. Use IIR there, which is also the manufacturer's advice for FUSER (source 1 § Settings).
7. **Analysis is a snapshot.** 2–5 s of audio. Arrangement changes invalidate it, and nothing re-analyses
   automatically.
8. **Fader levels** must be entered by hand. "Plugins cannot detect the fader levels of DAWs" (source 1 § Gain Stage
   Fix).
9. **The conflict metric is a heuristic,** not a listening-test-calibrated masking model.
10. **"Same behaviour" means same documented outcome,** not the same algorithm. Every [E] item is our own design. The
    sources above describe what FUSER does, never how.

---

## 6. Corrections to the snippet-based first draft

| First draft said | Pages actually say |
|---|---|
| Release "affects the overall dynamic processing of all nodes" (global?) | That sentence is **MIX** (source 1 § MIX). Release is per node (§ Quickstart "individually"; sources 5 and 8) |
| A control named "Phase" sets how fast gain reduction returns | That is **Release** (source 1 § Release); the search snippet mislabelled it |
| Conflict Sensitivity 0–9 dB "not confirmed" | Confirmed: "The Conflict Sensitivity range is 0dB to 9dB", with the level-gap meaning (source 1 § Settings) |
| Linear-phase latency "41 ms" possibly FUSER | That sentence is about **CARBON Q** (source 7); FUSER publishes no FIR latency figure |
| A/B function unknown | Two states, arrow copies active → inactive (source 1 § A/B) |
| Phase Match strength unknown | Percentage knob; 100 % = full match (source 3) |
| Mid/Side possibly a switch | Continuous knob with an M/S badge; Resolve sets it automatically (source 1 § Mid Side) |
| Formats VST/VST3/AU/AAX | Manual says so; the current product page lists VST3/AU/AAX (macOS 10.15+, Apple Silicon) and VST3/AAX (Windows 10+) |
