# KB-Align: competitor research (A)

Research date: 2026-11-27.

## How this was gathered (read this first)

- **WebFetch could not reach any outside site from this session.** Every host tried failed DNS resolution in the sandbox: soundradix.com, www.soundradix.com, assets.soundradix.com, www.voxengo.com, fullcompass.com and www.soundonsound.com. So **no page was opened directly.** Every fact below comes from **WebSearch result summaries** (standard mode) of the pages listed. Treat it as second-hand: before quoting any number publicly, confirm it on the page itself.
- **ULAŞILAMADI (direct read):** Sound Radix product pages, the Auto-Align 2.2.2 manual PDF (assets.soundradix.com), the Auto-Align Post 2 manual PDF (fullcompass.com), the Voxengo PHA-979 page and user guide, the SOS article "Aligning kick & bass parts", and the "Introducing Auto-Align 2" page. The Soundbridge PHA-979 article was only seen through search summaries.
- **Screenshots:** none could be viewed. The "UI" sections below are built only from how reviews and manuals describe the interface. Where no description was found, it says "bulunamadı".
- Tags used: **[M]** = manufacturer claim (vendor page, manual, press release, vendor staff). **[I]** = independent (review, forum, user). **[R]** = retailer listing.
- Formula used for the per-note question: φ = 360·f·Δt. A fixed time offset Δt means a different phase in degrees at each bass fundamental f.

---

## 1. Sound Radix Auto-Align 2 (current version 2.2.x)

**What it does / method**
- Automatic time and phase alignment of multi-mic recordings. There is a time-offset stage, plus a "Spectral Phase Optimization" stage that uses all-pass filters to shift problematic frequencies on one track to match the corresponding frequencies on another. [I] SOS review (Aug 2023, Neil Rogers) https://soundonsound.com/node/4930697 ; [I] Mix review https://www.mixonline.com/technology/reviews/plug-ins/sound-radix-auto-align-2-a-mix-real-world-review
- Spectral phase is applied only where needed ("frequency-targeted phase shifts"). [I] Mix review (above)
- **One-shot, static analysis.** Sound Radix staff on the official forum say AA2 finds *one* time offset (which can make the signal "delayed or ahead") and *one* set of spectral phase adjustments, kept "for the entire track". Another staff post calls the alignment "static ... one fixed correction for the entire track". [M] https://forum.soundradix.com/t/how-does-auto-align-2-work/2366
- Version 2.1 added track-based spectral phase optimization that works independently of time alignment. [M] KVR news https://www.kvraudio.com/news/sound-radix-releases-auto-align-2-1-59894 ; [I] SOS news https://www.soundonsound.com/news/auto-align-21-sound-radix
- Version 2.2 (June 2024) added ARA2 support (Pro Tools AAX ARA, plus VST3-ARA2 in Nuendo, Studio One and others): "zero latency", "capture-free" track-based processing. 2.2.1 fixed M4 Macs. 2.2.2 (dated 2026-03-03 in the release notes) avoids crashes caused by corrupted ARA data. [M] https://www.soundradix.com/products/auto-align/release-notes/ ; [M] https://www.soundradix.com/articles/AA2-AAP2-ARA-ProTools/ ; [M] Avid https://www.avid.com/resource-center/sound-radix-ara ; [I] KVR https://www.kvraudio.com/news/sound-radix-updates-auto-align-to-v2-2-61066
- Earlier AA1 contrast: an older MusicRadar review said AA1 was "strictly a time delay process", with no phase rotation. [I] https://www.musicradar.com/reviews/tech/sound-radix-auto-align-281811

**User flow**
- Insert it on every track, press **Align** on any one instance, play (whole-song playback recommended), press stop. The alignment is then calculated, displayed and applied. Reference and grouping are detected automatically. [I] Tape Op https://tapeop.com/reviews/gear/156/auto-align-2-plug-in ; [I] SOS https://soundonsound.com/node/4930697 ; [M] SOS news https://www.soundonsound.com/news/sound-radix-release-auto-align-2
- Roughly: 1 click plus one playback pass (in non-ARA mode).

**Latency / PDC / negative delay / precision / range**
- Negative shift: staff say the offset can make the signal "delayed or ahead". [M] forum link above. The Mix review says the readout shows positive values = moved forward, negative = moved backward. [I] Mix
- ARA2 mode is described as zero latency. [M] Avid / release notes
- Non-ARA plugin latency figure: **bulunamadı**.
- Sub-sample precision: **bulunamadı** (not stated in any snippet).
- Max range for AA2: **bulunamadı**. For comparison, AA1 was ±881 samples (~20 ms @44.1k) per the MusicRadar AA1 review, and Post 2 is ±100 ms (see §2).

**Reference signal**
- No user sidechain routing ("eliminating the need for manual routing"). Instances group automatically. The exact mechanism (private inter-instance link vs ARA) is **not documented** in what was found. [M] SOS news ; [I] SOS review
- AA1 used DAW sidechain send/receive channels. [I] Computer Music via PressReader https://www.pressreader.com/australia/computer-music/20190123/282286731442719
- An older developer post (about AA1/Pi) mentions C/C++ globals shared between instances and a preference for sidechain or ARA. [M] https://forum.soundradix.com/t/programming-brilliance/446

**Formats / OS / price**
- AAX, AU, VST3, ARA2. CLAP: no evidence found. macOS and Windows. [M] https://soundradix.com/products/auto-align ; [R] Sonovente https://www.sonovente.com/en-gb/sound-radix-auto-align-2-p108076.html
- **US$199** new, US$99 upgrade from AA1, 14-day trial (prices seen in 2024–2026 coverage; current price not verified on the vendor site). [I] Sonicstate https://sonicstate.com/amped/2024/06/21/auto-align-updated/ ; [R] Vintage King https://vintageking.com/products/sound-radix-auto-align-2

**Visualisation**
- Colour-coded **Phase Meter** next to the timing data: solid green = no change needed, solid red = 180° polarity flip, multicoloured = spectral phase applied. The visualiser can switch to a Spectral Phase Optimization view with bar-graph lines (described as "like a stereo correlation meter"). [I] Mix verdict https://www.mixonline.com/?p=140544 ; [I] Mix review
- No oscilloscope or waveform overlay was mentioned in any source.

**UI (from text descriptions only; no screenshot seen)**
- A large **Align** button. The applied delay is shown top-right in samples, ms, cm and inches. The colour-coded phase meter sits to the right of the timing data. The display can be toggled to the spectral view. [I] Mix

**Complaints / weaknesses** (official forum thread titles [I]; resolutions not checked)
- "Auto-Align 2 moving my tracks earlier than kick", "AA2 causing drums to flam", settings not saved in ARA/LUNA, old alignments showing up in new projects, slow ARA commit in Pro Tools 2024.6, "Initial release ... not so great" (2023). https://forum.soundradix.com/c/auto-align/5 ; https://forum.soundradix.com/latest ; https://forum.soundradix.com/t/autoallign-2-i-dont-get-any-useful-results/1806
- Feature request thread: "AutoAlign 2 – Lock Phase For A Single Reference Track". https://forum.soundradix.com/c/auto-align/5?page=1
- SoundFlow: alignment triggered remotely came out wrong, but ran correctly when done directly in AudioSuite (Dec 2025). https://forum.soundflow.org/-17430
- No electronic-music or synth kick/bass test was found. SOS frames the use case as rock drums aligned to the kick or snare close mic. [I]

**Bass note changes?**
- **No.** The vendor says it applies one static offset plus one static spectral-phase set for the whole track. [M] https://forum.soundradix.com/t/how-does-auto-align-2-work/2366
- A static all-pass can give frequency-dependent phase, but it cannot change between notes or between hits.

---

## 2. Sound Radix Auto-Align Post 2

**What it does / method**
- Dynamic time and phase alignment for post-production dialogue (boom + lav), with moving mics. It has a **dynamic mode** (delay and spectral filters change over time) and a **static mode**. [M] Avid https://www.avid.com/resource-center/sound-radix-ara ; [M] forum https://forum.soundradix.com/t/how-does-auto-align-2-work/2366
- Version 2 added a Spectral Phase Correction module to "detect and dynamically correct frequency-dependent phase shifts". [M] ProSoundWeb https://www.prosoundweb.com/?p=156614 ; KVR https://www.kvraudio.com/news/sound-radix-announces-auto-align-post-2-53170
- SOS: "doesn't operate in real time" (like its predecessor). [I] https://www.soundonsound.com/node/4927430

**User flow**
- Detailed steps **bulunamadı** (manual unreachable).

**Latency / range**
- Range: **±100 ms** (~34 m / 112 ft). [R/M] Vintage King https://vintageking.com/sounds-radix-auto-align-post-2-dynamic-time-alignment-plug-in ; Guitar Center https://www.guitarcenter.com/Sound-Radix/Auto-Align-Post-2-Download.gc
- Latency figure, sub-sample precision: **bulunamadı**.

**Reference signal**
- Uses sidechain or inter-instance routing? **Bulunamadı** for Post 2. ARA2 is supported.

**Formats / price**
- AAX, AudioSuite, VST3, ARA2. Later listings add AU and Adobe Premiere. [I] ProSoundWeb https://www.prosoundweb.com/?p=192784
- **US$399** new, US$99 upgrade (2024–2026 coverage). [I] Sonicstate ; KVR https://www.kvraudio.com/product/auto-align-post-2-by-sound-radix

**Visualisation / UI**
- **Bulunamadı.**

**Complaints**
- Forum user: used on music, **dynamic mode causes "harmonic clicks" and phase problems**. Same user: static Post and AA2 give the same results. [I, anecdotal] https://forum.soundradix.com/t/how-does-auto-align-2-work/2366
- ARA issue thread: "Auto-Align Post 2.3.1 (ARA) in Nuendo 14: Clip Gain Duplication". [I] https://forum.soundradix.com/c/auto-align-post/22?page=1

**Bass note changes?**
- **No direct evidence.** Its dynamic mode tracks changing geometry (moving mics), not a musical pitch change. Evidence for music use is negative (the clicks report above).

---

## 3. Sound Radix Pi (Phase Interactions Mixer)

**What it does / method**
- Continuous, **dynamic** phase rotation of each track to reduce phase cancellation across the whole mix, using sample-accurate internal inter-channel routing between instances. [I] MusicRadar https://musicradar.com/reviews/tech/sound-radix-pi-572435 ; [M/R] B&H https://www.bhphotovideo.com/c/product/971087-REG/sound_radix_pi_phase_interactions.html
- Vendor claim: phase interactions happen "randomly across varying frequencies and to different degrees", so they "cannot be remedied using a simple, fixed phase-rotator". [M] https://soundradix.com/products/pi/ (seen only in a search summary)
- Global modes: Full Range, or Low Frequency focus. [M] product page, B&H
- Groups (up to 64), each in one of three modes: INT & MIX, INT, or PL (Phase Lock: the group is kept locked internally and optimised as one against the mix). [M] Pi 1.0.11 manual https://assets.soundradix.com/downloads/Pi%201.0.11%20User%20Manual.pdf (summary only) ; [I] MusicRadar
- SOS (in its AA2 coverage): Pi "can dynamically manage phase rotation", while AA2 works after the initial alignment. [I] https://soundonsound.com/node/4930697

**User flow**
- "Just drop Pi into the last insert slot on each channel." Then optional groups and channel weight. [M] product page ; walkthrough https://www.soundradix.com/articles/fixing-phase-with-pi/
- About 1 step per track, with no analysis button.

**Latency**
- Support article: Pi "uses a lot of latency". Keep DAW delay compensation on. The manual has a latency-report toggle for hosts without PDC. [M] https://support.soundradix.com/support/solutions/articles/5000659915-pi-causing-track-to-be-out-of-sync
- Exact figure, negative delay, sub-sample: **bulunamadı**. Pi does not appear to be a time-delay aligner.

**Reference**
- Inter-plugin communication between Pi instances; no user sidechain. [I/M] MusicRadar, B&H

**Formats / OS / price / status**
- AAX, AU, VST, VST3. macOS and Windows. Native Apple Silicon AAX in 1.1.3 (2022-12-29). That is the last release-notes entry found, so the product looks unmaintained since then. [M] https://www.soundradix.com/products/pi/release-notes/ ; [R] Toolfarm https://www.toolfarm.com/buy/sound_radix-pi
- List **US$249** (Pi Day sale US$143, probably March 2025). Also in Radical Bundle 4 (US$599). B&H shows "No Longer Available"; other retailers list it as in stock. [I] KVR https://www.kvraudio.com/news/sound-radix-celebrates-pi-day-with-42-off-pi-phase-interactions-mixer-63256 ; [R] B&H ; Equipboard https://equipboard.com/items/soundradix-pi

**Visualisation**
- Multi-band phase-correlation meter (per band plus overall). Display views: GRP (within the group) and CHNL (against the mix). [M] manual ; B&H

**UI**
- Screenshot description **bulunamadı**. Only the meter and the group/mode controls above are described.

**Complaints**
- CPU load was addressed in v1.0.11 ("significantly improves CPU usage"). [M] KVR https://www.kvraudio.com/news/sound-radix-updates-pi-to-v1-0-11---significantly-improves-cpu-usage-29863
- Support article "Pi Causing Track to Be Out Of Sync" (latency/PDC). [M] link above
- Equipboard: "its necessity is debated among users". [I]
- No Reddit or Gearspace thread found.

**Bass note changes?**
- **Indirectly, maybe.** It is dynamic and frequency-dependent by design, so in principle it adapts as the content changes [M].
- But it optimises for the whole mix (or the LF range), not kick→bass per hit.
- **No evidence found** of a per-note kick/bass mode, or of tests on synth basslines.

---

## 4. MeldaProduction MAutoAlign

**What it does / method**
- Automatic per-track delays and polarity inversions. By default it does "only delay ... and possibly invert polarity", with no filtering. [M/R] Plugin Boutique https://www.pluginboutique.com/product/2-Effects/29-Phaser/68-MAutoAlign
- Since v11.02 there is optional **spectral phase compensation**: "estimates ... the ideal phase rotation" and can fix phase per frequency. It is off by default because it "induces latency (hence it cannot be used live) and it may not always work". [M] Plugin Boutique ; MeldaProduction intro https://develop.meldaproduction.com/download/documentation/MAutoAlign_intro.pdf (summary only)
- **One-shot analysis.**

**User flow**
- Insert it on all tracks, start playback, press **Analyze** in any one instance. Instances "find all other instances automatically". Results come "after just a few seconds". Groups can restrict which tracks are analysed together. [M] intro PDF ; Scribd copy https://www.scribd.com/document/508056971/MAutoAlign-intro
- Roughly 1 click plus a few seconds of playback.

**Latency / negative / range / precision**
- Spectral mode adds latency (figure **bulunamadı**).
- Keeping one track as a fixed reference: a forum tip says set the Latency parameter to that track's delay so the DAW compensates. In other words, "negative" relative shift is done via reported latency. [I] KVR https://www.kvraudio.com/forum/viewtopic.php?p=6269282
- Max delay range, sub-sample: **bulunamadı**.

**Reference**
- No sidechain; automatic inter-instance discovery. [M]

**Formats / OS / price**
- VST2, VST3, AU (mac), AAX. Windows and macOS incl. Apple Silicon. CLAP / Linux: no evidence found. [R] Pluginfox https://pluginfox.com/products/meldaproduction-mautoalign?aff=399 ; Woodbrass https://www.woodbrass.com/en-gb/plug-ins-melda-mautoalign-p427638.html
- Regular price about **US$54–59**, with frequent sales: US$27 in Feb 2026, US$22 at Plugin Boutique. [I] https://weraveyou.com/2026/02/melda-production-m-auto-align-50-percent-off/ ; [R] Adorama https://www.adorama.com/mpmautoalign.html

**Visualisation**
- Meters showing "frequency cancellations" (how much signal is lost when the tracks are summed). Readout of the delays. [M] Plugin Boutique ; [I] KVR review https://www.kvraudio.com/product/mautoalign-by-meldaproduction/reviews

**UI**
- Screenshot description **bulunamadı**. The standard Melda GUI with an Analyze button is implied.

**Complaints** [I]
- Different delay on each analysis (23-mic orchestra). https://www.kvraudio.com/forum/viewtopic.php?p=8618722
- "didn't work reliable on real projects". Jumped "between multiples of the actual delay". Spectral mode sounded "phasey". https://www.kvraudio.com/product/mautoalign-by-meldaproduction/reviews , https://www.kvraudio.com/product/mautoalign-by-meldaproduction/reviews/5286
- KVR rating 4.00 from only 3 reviews.
- Pro Tools error −9129 with the GUI open. https://www.kvraudio.com/forum/viewtopic.php?p=5844475
- 2025 KVR post: tools like MAutoAlign "only do time". https://www.kvraudio.com/forum/viewtopic.php?p=9105296
- Positive: the Sleep Freaks tutorial uses it on kick + sub-kick + bass (bass as reference) and reports more punch. That source is promotional. https://sleepfreaks-dtm.com/en/mixing-plugin/mautoalign

**Bass note changes?**
- **No evidence found.** Static one-shot analysis.

---

## 5. Waves InPhase (+ InPhase LT, Live components)

**What it does / method**
- **Manual** time alignment (delay) plus phase rotation: two phase-shift filters per channel, each Off / Shelf (1st-order all-pass) / Bell (2nd-order all-pass), with adjustable frequency and Q. Polarity flip. [M] manual (Vintage King mirror) https://vintageking.com/cdn/shop/files/waves_audio_inphase.pdf ; [I] SOS (Jon Burton, Jul 2012) https://www.soundonsound.com/reviews/waves-inphase
- No auto-align: the Sonic Scoop reviewer expected "some sort of auto-align feature" and did not find one. [I] https://sonicscoop.com/?p=28175

**User flow**
- Route the reference to the **sidechain** (mono: Alpha = track, SC = reference; stereo: Beta = CH2 or SC).
- Capture (Auto/Manual, up to 2 s @44.1/48k, 1 s @88.2/96k).
- Zoom into the waveforms, then drag the delay and phase filters until the correlation meter reads positive.
- About 5+ manual steps. Sonic Scoop did it "in less than five minutes". [M] manual ; [I] Sonic Scoop

**Latency / range**
- Delay **±20 ms** (Live components: forward only).
- Standard and LT components have **20 ms latency**. **Live components have 0 latency.** [M] manual excerpt ; [I] MusicRadar https://musicradar.com/reviews/tech/waves-inphase-545936 ; [R] Plugin Boutique LT https://www.pluginboutique.com/products/13734-InPhase-LT
- Negative delay is available in the non-Live components (inferred from the "±" range together with the 20 ms latency).
- The waveform zoom goes "up to sample resolution". Sub-sample delay: **bulunamadı**.

**Reference**
- External **sidechain** (full InPhase). Caveat: sidechain is "not fully supported" in Logic and in Pro Tools HD TDM. [M] manual
- Whether **LT** has sidechain: **bulunamadı**. LT is marketed as a simplified, "creative" version.

**Formats / OS / price**
- AAX, AU, VST2/VST3, AudioSuite, SoundGrid. macOS and Windows. [R] Sweetwater https://www.sweetwater.com/store/detail/InPhase--waves-inphase-plug-in ; Thomann https://thomann.ae/waves_inphase.htm
- Price: Sweetwater **US$39.99** (sale US$34.99), Best Service cites list US$175. Original launch MSRP: InPhase US$200, LT US$120. [R] ; [I] KVR https://www.kvraudio.com/news/18272
- LT: US$29.99 (regular US$99). [R] Pluginfox https://pluginfox.com/products/waves-inphase-lt

**Visualisation**
- Dual waveform displays (Alpha/Beta) that update live with processing.
- Correlation meter (−1…+1) with peak marker and value box. Monitor modes: Stereo / Mono Mix / Alpha / Beta-SC. [M] manual mirrors https://manuals.plus/waves/inphase-plugin-manual , https://manualmachine.com/wavesaudio/inphase/6496906-user-guide
- **Closest thing to an oscilloscope** among the competitors. But it shows a *captured static snapshot*, not a kick-triggered live scope.

**UI (text description)**
- Two stacked waveform panes (Alpha top, Beta/SC bottom) with X-zoom and a scroll bar.
- Below them, per-section controls: delay, two phase filters (type / freq / Q), polarity, gain.
- Correlation meter, capture buttons, monitor selector. [M] manual ; [I] SOS ("effective visual display")

**Complaints** [I]
- "controls ... a bit clunky and annoying at times". Wishes for a maintenance update. https://www.thomann.co.uk/waves_inphase_reviews.htm
- The manual's mono example omits a step, which can double-bus the DI. [I] Sonic Scoop
- No auto mode. Capture is limited to 2 s.

**Bass note changes?**
- **No.** The settings are static. Nothing in what was found adapts per note.

---

## 6. SSL X-Phase (SSL Native)

**What it does / method**
- **Manual** all-pass filter plus time-alignment tool: Frequency (where the phase wraps), Q (slope across the spectrum), a 1st/2nd-order switch, an all-pass "phase" button (180°), and a separate Delay section. [M] user guide https://support.solidstatelogic.com/hc/en-gb/articles/4408657722525-SSL-X-Phase-Plug-in-User-Guide ; PDF https://www.solidstatelogic.com/assets/uploads/downloads/Brochures/X-Phase%20User%20Guide.pdf
- Delay can be set in s / ms / samples / metres / feet, with fine-tune buttons. Stereo version: L, R or L&R. [M/R] Plugin Boutique https://www.pluginboutique.com/product/3-Studio-Tools/22-Sound-Editor/8666-SSL-Native-X-Phase ; SSL store https://store.solidstatelogic.com/plug-ins/ssl-native-x-phase
- No auto mode found.

**User flow**
- By ear: sweep frequency and Q, toggle the 180° button, adjust delay. Number of steps not defined.

**Latency / range**
- Delay range, latency, sub-sample, negative delay: **bulunamadı**.

**Reference**
- No sidechain; it processes one track. Comparison is by ear.

**Formats / price**
- VST3, AU (mac), AAX (official guide). Some retailers also list VST2. iLok account required. [M]
- **US$99** (Plugin Boutique, Sweetwater). An older MusicRadar review gave **£199**. [R] https://www.sweetwater.com/store/detail/SSLXPhase--solid-state-logic-ssl-by-phase-native-plug-in ; [I] https://www.musicradar.com/reviews/tech/ssl-duende-native-expansion-pack-2-603234

**Visualisation**
- A phase-curve display is likely, but how it is displayed is **bulunamadı**. No scope or correlation meter mentioned.

**UI**
- Screenshot description **bulunamadı**. Controls are as listed above.

**Complaints** [I]
- MusicRadar: "expensive", few presets, "best thought of as a problem solver rather than an 'effect'".
- Retailer review summaries mention a learning curve and a tricky initial interface. [R]

**Bass note changes?**
- **No.** Static manual filter.

---

## 7. Voxengo PHA-979

**What it does / method**
- Manual phase rotation (an arbitrary shift in degrees, applied equally to all frequencies) plus positive and negative time delay, set per channel (L/R), with L180/R180 flips. [M] product page https://www.voxengo.com/product/pha979/ (summary only) ; [I] Soundbridge https://www.soundbridge.io/bind-kick-bass-pha-979
- **Linear-phase design.** The guide says the phase response stays linear across the full range, with a power roll-off below 20 Hz and above 20 kHz that grows toward 90°. [M] user guide https://www.voxengo.com/files/userguides/VoxengoPHA979_en.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20en.pdf (summary)
- Forum users say it uses all-pass filters as well as delay lines, and warn about **pre-ringing**. [I] KVR https://www.kvraudio.com/forum/viewtopic.php?p=7545449 , https://www.kvraudio.com/forum/viewtopic.php?p=7860634

**User flow (Soundbridge psytrance article)**
- Force Mono on the bass.
- Time alignment first (Delay L/R in ms).
- Then phase (Left/Right knobs in degrees; the article's example is 90° then 270° = 360°).
- Judge by ear and with the correlometer. [I] Soundbridge

**Latency / negative / range**
- Negative shift works because of the delay module's constant latency. [M] German guide https://www.voxengo.com/files/userguides/VoxengoPHA979_de.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20de.pdf
- The older French guide (v2.2) gave 48 ms processing latency. The current figure was not confirmed. [M] https://www.voxengo.com/files/userguides/VoxengoPHA979_fr.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20fr.pdf
- Delay range (ms), sub-sample: **bulunamadı**.

**Reference**
- No sidechain is documented for alignment. You align against the other track by listening and with the correlometer. Whether its correlometer can take the kick via a sidechain: **bulunamadı**. (The Voxengo common guide mentions external sidechain "where applicable".)

**Formats / OS / price**
- VST, VST3, AU, AAX on Windows and macOS. CLAP: no evidence found. [M] product page ; [R] KVR https://kvraudio.com/product/pha-979-by-voxengo
- Price: EU reseller **€62** (catalog €79.95). Voxengo shows a "Summer 2026 20% off" banner. Historic prices: US$69.95 (2014), US$89.95 (2009). Current USD: **bulunamadı**. [R] Green Musicians https://www.greenmusicians.com/en/plug-ins/voxengo/2335-voxengo-pha979-3701701223848.html
- Version 2.7 press release exists. https://www.voxengo.com/press/voxengo-pha-979-2-7-phase-alignment-plugin-released-361/

**Visualisation**
- **Multi-band correlation meter** ("Correlometer"), intended for setting delay and phase precisely. No scope. [M] guide

**UI**
- Screenshot description **bulunamadı**. Controls described: Delay section (Enable, Left, Right ms), Phase section (Left, Right degrees, L180, R180), Force Mono, correlometer. [I] Soundbridge

**Complaints** [I]
- Pre-ringing. A product summary says linear phase can make the mix "softer".
- Skeptic on KVR: an EDM kick is a sine sweep, "good luck getting all that in phase".
- Users ask whether it beats a free sample-delay plugin. https://www.kvraudio.com/forum/viewtopic.php?p=7860634

**Bass note changes?**
- **No** in the product itself (manual, static).
- But the forum context recognises that kick-tail/bass overlap is where it matters. The FabFilter forum notes that saw basslines change phase from note to note. https://prod.fabfilter.com/forum/add-comment/1978

---

## EXTRA (found while searching, not on the assigned list): direct functional competitors

These are the closest functional overlap with KB-Align. Recommend a dedicated follow-up.

- **Fluctor Audio PhaseLock 2.5** (Max for Live, Ableton Live 12 + Max 9 only) [M]
  - "Realtime Auto-Align" measures **every kick and the bass that follows** before playback, then sets Rotation, Polarity and Delay for that kick "so the alignment follows your bassline when the notes change". **This is the per-hit / per-note claim.**
  - Also: 40–300 Hz ducking, Volume Shaper, stereo/mono/bass-mono modes, and a **dual oscilloscope with zoom/pan**.
  - Latency: **1 beat + ~150 ms** (Realtime on), ~120 ms with it off.
  - v1 used sidechain kick input and Hilbert-transform rotation over the full 360°.
  - Links: https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment ; https://www.maxforlive.com/library/device/15192/phaselock ; https://maxforlive.com/library/device/15591/phaselock-2
  - No independent review of 2.5 found.
- **Jelly Audio PhaseLock** (Tape Op review by Larry Crane): three kinds of automatic phase correction incl. a polarity flip; worked on kick and on multi-mic/DI bass. Whether it is the same product as Fluctor: not confirmed. https://tapeop.com/reviews/gear/176/phaselock-phase-alignment-plug-in
- Also mentioned in search results but not researched: Little Labs IBP (UAD), Melda MFreeformPhase / MTrackAlign, Nugen Aligner, Mastering The Mix FUSER, Bruce James DeepPerfection, bsaudiotools PhaseSmith.

---

## Cross-cutting findings

1. **Per-note question:**
   - None of the 7 assigned products has documented per-note or per-hit kick→bass alignment.
   - AA2 is static by vendor statement. MAutoAlign, InPhase, X-Phase and PHA-979 are static.
   - Pi is dynamic but mix-wide, not tied to the kick.
   - AAP2's dynamic mode is meant for moving dialogue mics, and a user reports clicks on music.
   - **Only Fluctor PhaseLock 2.5 (Ableton-only M4L) claims it.**
2. **Kick-triggered oscilloscope:**
   - No assigned product has one.
   - InPhase has captured-waveform displays (a static ≤2 s snapshot) plus a correlation meter.
   - PHA-979 and Pi have multi-band correlation meters. AA2 has a colour phase meter.
   - Fluctor PhaseLock 2.5 has a dual scope.
3. **Sidechain:**
   - Only InPhase uses a classic sidechain reference.
   - Sound Radix and Melda use automatic inter-instance linking (instances on both tracks).
   - X-Phase and PHA-979 are single-track tools aligned by ear.
4. **Negative delay:**
   - Possible via latency in AA2 ("ahead"), InPhase (±20 ms, 20 ms latency) and PHA-979 (constant latency).
   - MAutoAlign: via reported latency (forum tip).
5. **Not found anywhere:** sub-sample precision specs and CLAP support.

## All URLs used (all seen via WebSearch summaries; WebFetch was blocked)

- https://assets.soundradix.com/downloads/Pi%201.0.11%20User%20Manual.pdf
- https://cycling74.com/projects/fluctor-audio-phaselock-25-or-realtime-kick-and-bass-phase-alignment
- https://develop.meldaproduction.com/download/documentation/MAutoAlign_intro.pdf
- https://equipboard.com/items/soundradix-pi
- https://forum.soundflow.org/-17430
- https://forum.soundradix.com/c/auto-align-post/22?page=1
- https://forum.soundradix.com/c/auto-align/5
- https://forum.soundradix.com/c/auto-align/5?page=1
- https://forum.soundradix.com/latest
- https://forum.soundradix.com/t/autoallign-2-i-dont-get-any-useful-results/1806
- https://forum.soundradix.com/t/how-does-auto-align-2-work/2366
- https://forum.soundradix.com/t/programming-brilliance/446
- https://kvraudio.com/product/pha-979-by-voxengo
- https://manualmachine.com/wavesaudio/inphase/6496906-user-guide
- https://manuals.plus/waves/inphase-plugin-manual
- https://maxforlive.com/library/device/15591/phaselock-2
- https://musicradar.com/reviews/tech/sound-radix-pi-572435
- https://musicradar.com/reviews/tech/waves-inphase-545936
- https://pluginfox.com/products/meldaproduction-mautoalign?aff=399
- https://pluginfox.com/products/waves-inphase-lt
- https://prod.fabfilter.com/forum/add-comment/1978
- https://sleepfreaks-dtm.com/en/mixing-plugin/mautoalign
- https://sonicscoop.com/?p=28175
- https://sonicstate.com/amped/2024/06/21/auto-align-updated/
- https://soundonsound.com/node/4930697
- https://soundradix.com/products/auto-align
- https://soundradix.com/products/pi/
- https://store.solidstatelogic.com/plug-ins/ssl-native-x-phase
- https://support.solidstatelogic.com/hc/en-gb/articles/4408657722525-SSL-X-Phase-Plug-in-User-Guide
- https://support.soundradix.com/support/solutions/articles/5000659915-pi-causing-track-to-be-out-of-sync
- https://tapeop.com/reviews/gear/156/auto-align-2-plug-in
- https://tapeop.com/reviews/gear/176/phaselock-phase-alignment-plug-in
- https://thomann.ae/waves_inphase.htm
- https://vintageking.com/cdn/shop/files/waves_audio_inphase.pdf
- https://vintageking.com/products/sound-radix-auto-align-2
- https://vintageking.com/sounds-radix-auto-align-post-2-dynamic-time-alignment-plug-in
- https://weraveyou.com/2026/02/melda-production-m-auto-align-50-percent-off/
- https://www.adorama.com/mpmautoalign.html
- https://www.avid.com/resource-center/sound-radix-ara
- https://www.bhphotovideo.com/c/product/971087-REG/sound_radix_pi_phase_interactions.html
- https://www.greenmusicians.com/en/plug-ins/voxengo/2335-voxengo-pha979-3701701223848.html
- https://www.guitarcenter.com/Sound-Radix/Auto-Align-Post-2-Download.gc
- https://www.kvraudio.com/forum/viewtopic.php?p=5844475
- https://www.kvraudio.com/forum/viewtopic.php?p=6269282
- https://www.kvraudio.com/forum/viewtopic.php?p=7545449
- https://www.kvraudio.com/forum/viewtopic.php?p=7860634
- https://www.kvraudio.com/forum/viewtopic.php?p=8618722
- https://www.kvraudio.com/forum/viewtopic.php?p=9105296
- https://www.kvraudio.com/news/18272
- https://www.kvraudio.com/news/sound-radix-announces-auto-align-post-2-53170
- https://www.kvraudio.com/news/sound-radix-celebrates-pi-day-with-42-off-pi-phase-interactions-mixer-63256
- https://www.kvraudio.com/news/sound-radix-releases-auto-align-2-1-59894
- https://www.kvraudio.com/news/sound-radix-updates-auto-align-to-v2-2-61066
- https://www.kvraudio.com/news/sound-radix-updates-pi-to-v1-0-11---significantly-improves-cpu-usage-29863
- https://www.kvraudio.com/product/auto-align-post-2-by-sound-radix
- https://www.kvraudio.com/product/mautoalign-by-meldaproduction/reviews
- https://www.kvraudio.com/product/mautoalign-by-meldaproduction/reviews/5286
- https://www.maxforlive.com/library/device/15192/phaselock
- https://www.mixonline.com/?p=140544
- https://www.mixonline.com/technology/reviews/plug-ins/sound-radix-auto-align-2-a-mix-real-world-review
- https://www.musicradar.com/reviews/tech/sound-radix-auto-align-281811
- https://www.musicradar.com/reviews/tech/ssl-duende-native-expansion-pack-2-603234
- https://www.pluginboutique.com/product/2-Effects/29-Phaser/68-MAutoAlign
- https://www.pluginboutique.com/product/3-Studio-Tools/22-Sound-Editor/8666-SSL-Native-X-Phase
- https://www.pluginboutique.com/products/13734-InPhase-LT
- https://www.pressreader.com/australia/computer-music/20190123/282286731442719
- https://www.prosoundweb.com/?p=156614
- https://www.prosoundweb.com/?p=192784
- https://www.scribd.com/document/508056971/MAutoAlign-intro
- https://www.solidstatelogic.com/assets/uploads/downloads/Brochures/X-Phase%20User%20Guide.pdf
- https://www.sonovente.com/en-gb/sound-radix-auto-align-2-p108076.html
- https://www.soundbridge.io/bind-kick-bass-pha-979
- https://www.soundonsound.com/news/auto-align-21-sound-radix
- https://www.soundonsound.com/news/sound-radix-release-auto-align-2
- https://www.soundonsound.com/node/4927430
- https://www.soundonsound.com/reviews/waves-inphase
- https://www.soundradix.com/articles/AA2-AAP2-ARA-ProTools/
- https://www.soundradix.com/articles/fixing-phase-with-pi/
- https://www.soundradix.com/products/auto-align/release-notes/
- https://www.soundradix.com/products/pi/release-notes/
- https://www.sweetwater.com/store/detail/InPhase--waves-inphase-plug-in
- https://www.sweetwater.com/store/detail/SSLXPhase--solid-state-logic-ssl-by-phase-native-plug-in
- https://www.thomann.co.uk/waves_inphase_reviews.htm
- https://www.toolfarm.com/buy/sound_radix-pi
- https://www.voxengo.com/files/userguides/VoxengoPHA979_de.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20de.pdf
- https://www.voxengo.com/files/userguides/VoxengoPHA979_en.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20en.pdf
- https://www.voxengo.com/files/userguides/VoxengoPHA979_fr.pdf/getbyname/Voxengo%20PHA-979%20User%20Guide%20fr.pdf
- https://www.voxengo.com/press/voxengo-pha-979-2-7-phase-alignment-plugin-released-361/
- https://www.voxengo.com/product/pha979/
- https://www.woodbrass.com/en-gb/plug-ins-melda-mautoalign-p427638.html
