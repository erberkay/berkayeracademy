# PHASEFORGE — handing the work over to the Mac (prompt for the new session)

You are a Claude session running on **Berkay's MacBook Pro** (Apple Silicon). Until now this work was done in a
cloud session (Linux container), which cannot reach the Mac, Ableton or the user's ears. Your job is to carry out on
the Mac the part that could not be done in the cloud, and to report back.

Talk to the user **in Turkish, plainly, briefly**. They are a music producer and teacher (BE Akademi), not a
software developer. Explain technical terms in one sentence. Before a long step, say in one sentence what you are
about to do.

---

## 1. What the project is

**PHASEFORGE**: a phase and frequency-conflict plugin for two sounds that fight over the same range (kick + bass
and so on). Our own C++20 / JUCE 9.0.6 code, AGPLv3, company "BE Akademi". VST3 + AU + Standalone.

- Repo: `https://github.com/erberkay/berkayeracademy`, branch **`claude/nice-goodall-ygxn6x`**
- Folder: `tools/phaseforge/`
- Read first: `tools/phaseforge/README.md`, `TEST_REPORT.md`, `RESEARCH/DSP_DESIGN.md`, `docs/ARCHITECTURE.md`,
  `RESEARCH/FUSER_TECHNICAL_ANALYSIS.md` (§3 feature table, §4 gaps)
- The site in the repo (HTML / Firebase) is **out of scope**: do not touch it, do not run `firebase deploy`.

**What works (measured in the cloud, Linux):**
- Phase Rotate (FIR/IIR)
- ANALYZE PHASE: angle, confidence and refusal
- Phase Match
- Conflict display (Mid red, Side yellow)
- RESOLVE CONFLICTS (up to 8 nodes)
- 12-node dynamic EQ, in Sidechain or Difference mode, self-keyed when the sidechain is off
- Delta, Mix, A/B + copy
- Bypass with the latency compensated
- Gain Stage Fix
- BS.1770 LUFS
- Presets
- EN/TR interface, scalable

Tests: 536 DSP, 82 plugin and 28 UI tests all pass; pluginval at strictness 10 passed 3 times (including the
editor).

**What has never been tested (this is your job):**
- Compilation and auval on macOS / Apple Silicon.
- Inside Ableton Live: sidechain routing, automation, and whether the device delay compensation is correct.
- Real music. All tests so far are synthetic.
- Performance on Apple Silicon. In the cloud, single FIR callbacks occasionally overran the 1.33 ms budget (up to
  3.8 ms); this was never investigated.

**Background:**
- The user used our earlier plugin, KB-Align (`tools/kb-align/`), in Ableton and said "it works very badly, it
  ruins the sound, there's too much detail, it's not as easy as ShaperBox".
- PHASEFORGE was built in response, and refuses rather than guessing when it is unsure.
- The user's goal: **"a plugin that works like FUSER"**.
- Known differences from FUSER:
  1. The default is Linear Phase with 118 ms latency, while FUSER is sold as "zero latency". **The user has not
     decided yet** which default they want; ask them.
  2. Mid/Side per node is a 3-way choice rather than continuous.
  3. No red glow for phase conflicts.
  4. No threshold line on the display.
  5. No sidechain line on the input meter.

---

## 2. Rules (must)

- **Honesty.** Never claim anything you have not measured or seen. Write "not tested" for what you have not tested.
  Never say a test passed unless you actually ran it.
- **Ask first.** Get the user's approval for anything that costs money, Apple signing/notarisation, or any publication
  (store, site, a public GitHub release). Do not open a PR unless asked.
- **Git.**
  - Work on `claude/nice-goodall-ygxn6x` only; never force-push.
  - Run `git pull` before you start.
  - Commit messages end with these two lines:
    ```
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01NNPHgq2tVvEZSabUYPKBYd
    ```
  - Never write a model name or ID anywhere else in commits or files.
- **Independence.** Do not take any code, graphics, name or preset from FUSER or any other product.
- **Privacy.** Do not commit the user's personal information (e-mail address and so on) or music files. Real audio
  files belong in `tools/phaseforge/test-audio/`; add that folder to `.gitignore`.
- **Code rules.** No allocation or blocking lock on the audio thread. Never rename a parameter ID (saved projects
  depend on them). When the DSP changes, all tests must pass again.

---

## 3. Steps

### Step 0 — Remove the old plugin (KB-Align) from the Mac (the user asked for this)
Remove **only from the computer**. The `tools/kb-align/` source code in the repo stays; do not delete it without
asking the user.

1. Close Ableton first.
2. Run:
   ```bash
   rm -rf ~/Library/Audio/Plug-Ins/Components/KB-Align.component \
          ~/Library/Audio/Plug-Ins/VST3/KB-Align.vst3 \
          ~/Library/Audio/Plug-Ins/CLAP/KB-Align.clap \
          "$HOME/Library/Application Support/KB-Align" \
          ~/be-akademi/tools/kb-align/plugin/build-mac-kur
   killall -9 AudioComponentRegistrar 2>/dev/null || true
   ```
3. Also check the system-wide folders: `/Library/Audio/Plug-Ins/{Components,VST3,CLAP}/KB-Align.*`. If anything
   is there, explain that removing it needs the administrator password, and only then remove it with `sudo rm -rf`.
4. Check with `auval -a | grep -i kbal`; the output should be empty. Tell the user to rescan the plugins in
   Ableton.
5. `~/kbdeps` (JUCE) is shared with PHASEFORGE; **do not delete it**.

### Step 1 — Build, install, check (do it yourself)
```bash
cd ~/be-akademi && git pull
bash tools/phaseforge/scripts/mac-kur.sh
```
The script:
- installs Xcode CLT, cmake and ninja if they are missing;
- downloads JUCE 9.0.6 into `~/kbdeps`;
- builds AU and VST3 and runs `pf_plugin_tests`;
- installs to `~/Library/Audio/Plug-Ins`, signs ad-hoc and runs `auval`.

If something fails, read the log, fix it, and run it again. Logs:
- `/tmp/phaseforge-kurulum.log`
- `/tmp/phaseforge-testler.txt`
- `/tmp/phaseforge-auval.txt`

Then:
- Build and run `pf_ui_tests` on macOS (no xvfb needed): `ninja -C tools/phaseforge/build-mac-kur pf_ui_tests`.
- Download pluginval for macOS from the Tracktion/pluginval GitHub releases (free) and run it at
  `--strictness-level 10` on both the VST3 and the AU.

### Step 2 — Performance on Apple Silicon
Measure CPU at 48 kHz in Linear Phase and Zero Latency modes, with 64- and 128-sample blocks and 4 active nodes:
mean, p99.9 and the slowest single callback.

The relevant code is in `Tests/plugin_tests.cpp`.

If a FIR callback goes over budget, find the cause. Candidates are the PartitionedConvolver, the kernel redesign
steps in DynamicEQ, and the Phase Match kernel swap. Fix it and measure again.

### Step 3 — Measure with real audio (offline, by you)
1. Ask the user to export, from Ableton, a **kick** and a **bass** stem of the same 8–16 bars of one song, at the
   same start point and the same length, as WAV. Have them put the files in `tools/phaseforge/test-audio/`.
   Explain how in one simple sentence.
2. Write `Tests/render_files.cpp` (a `pf_render` target in CMake):
   - the bass goes to the main input and the kick to the sidechain;
   - run it for both filter modes;
   - run RESOLVE and ANALYZE PHASE, apply the results, and write the processed WAV plus a report.
3. The report covers:
   - the 20–200 Hz energy of kick + bass before and after;
   - the change in peak and LUFS;
   - the phase status and confidence, and the nodes found;
   - the levels of distortion and artefacts: the transient smearing indicator, and how much the bass changes
     outside the hits.
4. Run the same thing on 2–3 different songs if possible.

### Step 4 — The user's check in Ableton
Guide them step by step:
1. Rescan the plugins.
2. Put PHASEFORGE on the bass track.
3. Choose the kick in the sidechain section of the device title bar.
4. Make sure the "SC: signal" chip is green.
5. RESOLVE → ANALYZE PHASE → APPLY.
6. Compare by ear with BYPASS.

If they have FUSER, ask them to try it on the same material and describe the difference. Ask for a screen
recording or a screenshot if needed.

Collect their feedback and turn it into concrete changes: what sounds bad, what is complicated, what is missing.

### Step 5 — Close the gaps (after the user's decision)
For the 5 FUSER differences in §1, ask the user which matter. Ask in particular which default latency they want.
Then make the changes, write tests, rebuild, and run Step 1 again.

---

## 4. Reporting back

After each step, put the results in **`tools/phaseforge/docs/test-logs/mac/`**:
- write a short Turkish summary to `RAPOR.md`;
- put the raw logs next to it as `.txt` files;
- commit and push.

The cloud session (the one that wrote this file) follows the work by running `git pull` on the same branch, so
whatever you push reaches it.

Your report to the user: what you did, what passed, what failed and why, and what you need from them — in a few
plain sentences.
