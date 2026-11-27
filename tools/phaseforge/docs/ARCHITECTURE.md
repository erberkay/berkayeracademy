# PHASEFORGE — architecture and module contracts

Plugin on the **main** (submissive, e.g. bass) track; the **sidechain** (dominant, e.g. kick) has priority.
All DSP lives in `Source/DSP/` as plain C++20 without JUCE (namespace `pf`), built into the static library `pfcore`
and unit-tested by standalone executables in `Tests/`. The JUCE layer (`PluginProcessor`, `PluginEditor`, `UI/`) only
wires parameters, threads and drawing.

## Real-time rules (every `process…` function)
No allocation, no locks, no file/network I/O, no exceptions, denormals flushed by the caller (`juce::ScopedNoDenormals`).
Everything that allocates happens in `prepare(...)` or on a background/message thread and is handed over lock-free
(double buffer + atomic index, with a short crossfade on the audio thread).

## Signal flow (per block)
```
in → input gain → PHASE (Rotate | Match) → [M/S encode per node] → Dynamic EQ nodes (mix) → output gain → out
                 └─ dry copy (latency-aligned) ─────────────────────────────┘ Delta = dry(before EQ) − wet
sidechain ────────────────────────────────→ node detectors (band-limited envelopes)
both (main + sidechain) → lock-free FIFO → analysis thread: FFTAnalyzer / ConflictDetector / PhaseAnalyzer / PhaseMatcher
```

## Rotation convention
`y = x·cos θ − H{x}·sin θ` (H = Hilbert transform). θ = 0 → y = x. All analyzers use the same convention.

## Latency
* FIR mode (Linear Phase): phase stage latency `Lp = Hs + B` (Hs = round(25 ms·fs), B = 128 partition block) for both
  Rotate and Match; dynamic EQ adds `Ld` (its linear-phase band filters). Reported latency = Lp + Ld, fixed per mode.
* IIR mode (Zero Latency): phase rotation by an IIR quadrature (allpass) network, dynamic EQ by IIR bells; latency 0.
  Phase Match needs an arbitrary phase response and is FIR only (selecting it uses the FIR phase stage).
