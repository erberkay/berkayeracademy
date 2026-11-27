# Ableton Live testleri — kontrol listesi (kullanıcının bilgisayarında)

Bu testleri ben (Claude) yapamıyorum: Ableton yalnız senin bilgisayarında var. Sonuçları bu dosyanın en altına yaz (ya da bana söyle, ben işlerim).

**Hazırlık**
- Eklenti: Mac'te AU/VST3 için `mac-kontrol-listesi.md` ile derle; Windows'ta VST3 derlemesi için aynı CMake komutları (Visual Studio 2022).
- Test dosyaları: `tools/kb-align/test-dosyalari/` (48 kHz, 125 BPM, Warp KAPALI). Set'i 48 kHz'e ayarla.
- Live sürümü: ______  · İşletim sistemi: ______  · Ses kartı tampon boyutu: ______

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| 1 | İki audio kanalı: "Kick" ← `01_kick_125bpm.wav`, "Bas" ← `03_bas_kimlik_3ms_gec_90derece.wav`. Bas kanalına KB-Align. Cihaz başlığında sidechain'i aç, kaynak: Kick. | Arayüzde "Sidechain yok" uyarısı kaybolur, osiloskopta kick izi görünür. | |
| 2 | Sidechain kaynağında **Pre FX / Post FX / Post Mixer** seçeneklerini sırayla dene. | Üçünde de kick izi aynı yerde (kick kanalında efekt yokken). Kick kanalına gecikmeli bir efekt (ör. lookahead'li Limiter) koyup tekrarla, farkı not et. | |
| 3 | **PDC / sidechain hizası:** Kick'e `06_impuls_1s.wav`, Bas'a da `06_impuls_1s.wav` koy. KB-Align: Mod = Elle, pre-delay 0, crossover kapalı. Osiloskop tetik = Kick, zaman 2 ms, alt bant görünümü kapalı. | Kick ve bas impulsları **aynı örnekte** (imleç A–B farkı 0,00 ± 0,02 ms). Fark varsa sidechain ofseti = o fark; değeri yaz. | |
| 4 | Aynı set: bypass aç/kapa. Master'a bir kayıt kanalı ekleyip iki durumda bas impulsunun konumunu karşılaştır. | Bypass ile aktif arasında konum farkı yok (gecikme telafisi doğru). | |
| 5 | **Negatif kayma:** pre-delay −20 ms. | Bas impulsu kick'ten 20,00 ms **önce** gelir. Ableton'ın kanal "Track Delay" −20 ms ile aynı sonuç. | |
| 6 | Bas'ı `03_…` dosyasına geri al. Mod = Learn, Learn'e bas, döngüyü çal. | 8 vuruş sonra uygulanan d ≈ −3,00 ms, θ ≈ 270° (= −90°). Korelasyon ölçeri belirgin artar. | |
| 7 | `02_bas_kimlik_hizali.wav` ve `04_…_2.5ms_erken.wav` ile tekrarla. | 02: d ≈ 0, θ ≈ 0 · 04: d ≈ +2,50 ms, θ ≈ 0. | |
| 8 | Bas = `05_bas_nota_degisen_A1_A1_C2_G1.wav`, Mod = Nota başına. 2–3 kez döngü. | Nota tablosunda A1, C2, G1 satırları; korelasyon her notada Learn'den yüksek. | |
| 9 | Mod = Her vuruşta, Gecikme modu = Tam + lookahead. | Gecikme değişince Live tıklamadan devam eder; vuruşlar arasında uygulanan değer değişir. | |
| 10 | **Tempo:** osiloskop tetik = Tempo, 1/4. Tempoyu 125 → 140 → 125 değiştir, Loop aç. Ducking: aç, "Tempoya kilitli". | İz vuruş ızgarasına oturur; döngü başında atlama/kayma yok. Ducking her vuruşta başlar. Kayma varsa yaklaşık ms değerini yaz (ppq VARSAYIM'ı). | |
| 11 | Parametre otomasyonu: pre-delay ve faz için otomasyon çiz; preset kaydet/aç; Set'i kaydet, Live'ı kapat-aç. | Otomasyon akıcı; Learn sonucu, nota tablosu, ducking eğrisi geri gelir. | |
| 12 | **Freeze/Flatten ve dışa aktarım:** Bas kanalını freeze et; ayrıca "Export Audio/Video" ile render al; aynı bölümü gerçek zamanlı kaydet. | Üç sonuç örnek düzeyinde aynı (ters fazla toplayınca sessizlik). | |
| 13 | CPU: Live'ın CPU göstergesi, 64 ve 512 tampon, 44,1/48/96 kHz. | Tek örnekte belirgin artış yok (test makinesinde %1,3 / 48 kHz ölçüldü). | |
| 14 | Arayüz: ölçek %75–200, Retina ekran, klavye ile Tab gezinme. | Metinler net, kesilme yok, odak görünür. | |
| 15 | **Öneriler:** Bas = `05_…`, 16 vuruş çal. Öneriler panelini oku. Sonra kick'i (Simpler) panelin önerdiği kadar akort et (Transp/Detune), "Yeniden ölç". | Panel kick frekansını, bas notasını, akort önerisini gösterir. Akorttan sonra "Toplam alt bant" önerinin söylediği kadar artar. **Kulakla:** akortlu kick sana hâlâ iyi geliyor mu? (±2 yarım ses sınırı burada doğrulanır.) | |
| 16 | **Retrigger:** Operator'da bir bas çal (osilatör R kapalı), sonra R açık. | Kapalıyken "serbest çalışıyor" + "Her vuruşta (Tam+LA)" düğmesi; açıkken "aynı fazdan başlıyor". | |
| 17 | **Alt bant ducking:** crossover kapalı, Ducking aç (hedef: Alt bant), derinlik %100. "Alt bant solo" ile ve normal dinle. | Kick vurduğunda yalnız sub kısılır, basın üstü (tını) kesilmez; tıkırtı yok. | |
| 18 | **Dil:** üst çubukta EN → TR → EN. | Bütün metinler değişir, ayarlar ve ses kesilmeden devam eder. Ableton'ın otomasyon listesindeki parametre adları İngilizce kalır. | |

## Sonuçlar

(Buraya yaz: tarih, Live sürümü, her maddenin sonucu, sidechain ofseti değeri, gözlenen sorunlar.)
