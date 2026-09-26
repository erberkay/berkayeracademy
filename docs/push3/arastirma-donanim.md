# KONU 1: Push 3 Donanım Anatomisi (emülatör referansı)

## 0. Kaynak kısaltmaları
- **[M]**: Ableton Push 3 Reference Manual, PDF sürümü 2025-09-17. Temel dayanak Bölüm 17 "Push Control Reference" (s.147–151); ayrıca Bölüm 2, 4, 6, 7, 8, 14 ve 15 kullanıldı. Web sürümü ableton.com/en/push/manual/. Not: 1.2.1 "Controls" bölümü PDF'te yalnızca görsel olarak var, metni yok. Konumlar Bölüm 17'deki sıradan, metindeki konum ifadelerinden ve Figma çiziminden türetildi.
- **[TS]**: ableton.com/en/push/tech-specs
- **[P2]**: Ableton'un resmi GitHub belgesi push-interface. **Yalnızca Push 2 için** resmidir.
- **[PH]**: federico-pepe/ableton-push-hack. Push 3 Standalone için topluluk tarafından tersine mühendislikle çıkarılmış bir harita; **resmi değildir**.
- **[SOS]**: Sound On Sound Push 3 incelemesi. **[MSL]**: mslinn.com'daki Push 3 Standalone yazısı. **[L12P2]**: Live 12 kılavuzundaki "Using Push 2" bölümü (Push 2 için geçerli).
- **[FIG]**: /Users/berkayer/site/assets/img/push3-device.svg (Greg Hadala, CC BY 4.0). Görsel inceleme ve geometri hesabıyla doğrulandı.

---
## 1. Fiziksel yerleşim (üstten bakış)
Bu sıra [M] Bölüm 17'deki kontrol sırasıyla, [M]'deki konum ifadeleriyle ("Add button at the right of the display", "Session button above the jog wheel", "Session button under the Session D-pad") ve [FIG] ile tutarlı. [SOS] de aynı mantığı doğruluyor: kayıt işlevleri solda, düzenleme işlevleri sağda gruplanmış.
```
               (E1)(E2)(E3)(E4)(E5)(E6)(E7)(E8)            <- 8 dokunmatik encoder
[Sets][Setup][Learn][User]  [U1]..[U8] üst ekran düğmeleri   [Device][Mix][Clip][Session]
 (VOLUME enc.)  [Undo]  +------ DISPLAY 960x160 ------+  [Add]      (   JOG   )
                [Save]  +-----------------------------+  [Swap]     (  WHEEL  )
[Lock][Stop Clip][M][S]     [L1]..[L8] alt ekran düğmeleri   [Main]  [Session D-pad ^ < o > v]
 (SWING&TEMPO enc.) |T|  +------ 8x8 MPE PAD ------+ [1/32t]  [Note ][Session]
 [Tap Tempo]        |o|  |                         | [1/32 ]  [Scale][Layout ]
 [Metronome]        |u|  |                         | [1/16t]  [Repeat][Accent]
 [Quantize]         |c|  |                         | [1/16 ]  [Double Loop][Duplicate]
 [Fixed Length]     |h|  |                         | [1/8t ]  [Convert    ][Delete   ]
 [Automate]         | |  |                         | [1/8  ]  [Octave^ / Page< Page> / Octave v]
 [New]              |S|  |                         | [1/4t ]    (X ile 4'e bölünmüş kare)
 [Capture]          |t|  |                         | [1/4  ]  [Shift][Select]
 [Record]           |r|  +-------------------------+
 [Play]
Arka panel: Power (sarı), 2x Out, 2x In, ADAT In/Out, MIDI In/Out (3.5 mm TRS), USB-A, USB-C, DC 20V 3A, Pedal 1/2 (dinamik: pedal veya CV), Headphones
```

---
## 2. Kontrol referans tablosu ([M] Bölüm 17 ve ilgili bölümler)
Tabloda "Shift+" ile "basılı tut" kombinasyonları ayrı sütunda. LED sütununda [M] işaretli olanlar kılavuzdan birebir; diğerleri kaynağıyla belirtildi.

### 2a. Sol taraf
| Resmi ad | Konum | Birincil işlev | Shift / basılı tut / kombinasyon | LED |
|---|---|---|---|---|
| **Sets** | Sol üst dörtlü grup, 1. düğme | Set Library'yi gösterir; "+ New Set" buradan | Session (pad) düğmesini basılı tut + New = yeni Set | Dokümante değil |
| **Setup** | Sol üst, 2. (dişli ikonu [MSL]) | Setup menüsü: Status, Expression, Sensitivity, Audio, MIDI, Pedals & CV, Preferences, Software sekmeleri | Wi-Fi ekranında Shift basılıyken Connect düğmesi Forget'e dönüşür | Dokümante değil |
| **Learn** | Sol üst, 3. (ampul ikonu [MSL]) | Push'un özelliklerini anlatan dersleri açar; QR kodla video ve kılavuza bağlantı verir | yok | Dokümante değil |
| **User** | Sol üst, 4. | User Mode: Push'un yerleşik işlevlerini kapatır, özel MIDI eşlemesi sağlar (Control Mode'da) | User düğmesinin kendisi eşlenemez | Dokümante değil |
| **Volume Encoder** | Ekranın solunda, büyük düğme | Main output, headphone output, Main track volume ve Cue volume ayarı. Döndürme 1 dB adım | Dokunma (tap): hangi seçeneğin aktif olduğunu gösterir. Basma: seçenekler arasında geçiş. **Shift+döndür: 0.1 dB** | LED yok |
| **Undo** | Ekranın solunda, üstteki kare düğme | Son işlemi geri alır; Control Mode'da Live'daki işlemler de geri alınır | **Shift+Undo = Redo** | Dokümante değil |
| **Save** | Undo'nun altında | Set'i kaydeder | yok | Dokümante değil |
| **Lock** | Alt ekran düğmeleri sırasının solundaki dörtlü grup, 1. | Lock basılıyken Stop Clip, Mute veya Solo'ya basılırsa o eylem alt ekran düğmelerine kilitlenir | Kilidi açmak için Lock'a ya da kilitli düğmeye tekrar bas | **Kilitliyken Lock ve kilitli düğme yanıp söner** [M] |
| **Stop Clip** | Aynı grup, 2. (kare ikon) | Seçili clip'i durdurur. Basılı tut + bir track'in alt ekran düğmesi = o track'i durdurur | **Shift+Stop Clip = tüm clip'leri durdurur** | Stop Clip basılıyken durmuş clip'i olan track'lerin alt ekran düğmeleri söner [M] |
| **Mute** | Aynı grup, 3. ("M") | Seçili track'i susturur | Basılı tut + alt ekran düğmesi = o track. + Drum pad = pad mute. + step = step'i devre dışı bırakır. + üst ekran düğmesi = device'ı kapatır | Seçili track susturulmuşsa Mute yanar; o track'in alt ekran düğmesi söner [M]. Kilitliyken kırmızı yanıp söner [MSL] |
| **Solo** | Aynı grup, 4. ("S") | Seçili track'i solo yapar | + alt ekran düğmesi = o track. + Drum pad = pad solo | Seçili track solodaysa Solo yanar; diğer track'lerin alt ekran düğmeleri söner [M]. Kilitliyken mavi yanıp söner [MSL] |
| **Swing and Tempo Encoder** | Sol sütunun üstü, orta boy düğme | Tempo modunda 1 BPM adım; Swing modunda %1 adım, aralık %0–100 | Dokunma: Tempo mu Swing mi seçili, gösterir. Basma: Tempo ile Swing arasında geçiş. **Shift+döndür: 0.1 BPM** | LED yok |
| **Tap Tempo** | Sol sütun, uzun düğme | Art arda basarak tempo ayarlanır. 4/4'te dördüncü vuruşta çalma başlar | yok | Dokümante değil |
| **Metronome** | Tap Tempo'nun altında (ikonu: içi boş ve dolu iki daire) | Metronomu açar/kapatır | **Basılı tut**: metronom ve ölçü ayarları. Count-in uzunluğu, ses tipi (Classic/Click/Wood), Rhythm (varsayılan Auto), ölçü için iki encoder | **Açıkken nabız gibi atar (pulse)** [M] |
| **Quantize** | Metronome'un altında | Seçili notaları quantize eder; seçim yoksa klipteki tüm notaları. Audio clip'te transient'lere etki eder | **Basılı tut**: Swing Amount, Quantize To, Quantize Amount, Rec. Quantize. Basılı tut + Drum pad = sadece o pad'in notaları | Dokümante değil |
| **Fixed Length** | Sol sütun, 2'li grubun üstü | Açık/kapalı geçişi. Açıkken yeni clip'ler sabit bar sayısında kaydedilir | **Basılı tut**: kayıt uzunluğu ve Phrase Sync. Kayıt sırasında açılırsa kaydı durdurur ve son barları loop'a alır | Açıkken yanması beklenir (**çıkarım**) |
| **Automate** | Fixed Length'in altında | Otomasyon kaydını açar/kapatır | **Shift+Automate**: override edilmiş otomasyonu geri etkinleştirir. **Delete+Automate**: clip'teki tüm otomasyonu siler | **Açık = kırmızı, kapalı = beyaz** [M] |
| **New** | Sol sütun, 3'lü grubun üstü | Seçili clip'i durdurur ve boş clip slot hazırlar. Scene Workflow'da (varsayılan) diğer track'lerin çalan clip'leriyle yeni bir scene oluşturur | Session basılıyken + New = yeni Set | Dokümante değil |
| **Capture** | New'in altında (köşe parantezi ikonu) | Kayıt yapmadan çalınan MIDI'yi yeni bir clip'e yakalar. Track arm'lı olmalı. Tempoyu algılar ve loop sınırlarını ayarlar | yok | Dokümante değil ([FIG]'de sönük çizilmiş) |
| **Record** | Capture'ın altında (daire ikon) | 1. basış kayıt, 2. basış kaydı durdurup çalmaya devam, 3. basış overdub; sonraki basışlar playback ile overdub arasında geçiş yapar | **Basılı tut + alt ekran düğmesi = track'i arm'la**. **Shift+Record**: Control Mode'da Session focus'tayken Arrangement kaydını, Arrangement focus'tayken Session kaydını açıp kapatır | **Count-in sırasında yanıp söner, kayıt başlayınca sabit kırmızı** [M] |
| **Play** | Sol sütunun en altı (üçgen ikon) | Çalmayı başlatır/durdurur | yok | Çalarken yeşil, dururken beyaz [MSL, ikincil] |
| **Touch Strip** | Sol sütun ile pad grid arasında, dikey şerit | MIDI track'te pitch bend (varsayılan) veya mod wheel. Step sequencing sırasında nota aralığını kaydırır. Drum Rack'te bank seçer (16 pad) | **Select basılıyken touch strip'e dokun**: pitch bend ile mod wheel arasında geçiş. **Shift+kaydır**: Drum Rack'te tek sıra kayar; Melodic Sequencer ve 32 Notes'ta oktav değiştirir (Shift'siz kaydırma skaladaki notalar arasında gezer). Melodic Sequencer'da pitch bend ve mod yok | Push 3 için dokümante değil. [FIG]'de tek bir beyaz nokta var. Push 2'de 31 LED vardı [P2] |

### 2b. Orta alan
| Resmi ad | İşlev | Kombinasyon | LED |
|---|---|---|---|
| **Encoders (8)** | Moda göre parametre, seçim, clip ve nota düzenleme. Ekranda gösterilen öğeyi genelde tam üstündeki encoder kontrol eder | **Shift+döndür = daha ince çözünürlük**. **Delete+dokun**: o parametrenin otomasyonunu siler; otomasyon yoksa parametreyi varsayılan değere döndürür. Dokunmatiktir; [M] "tap/touch the encoder" ifadesini kullanıyor | LED yok |
| **Upper Display Buttons (8)** | Moda göre track seçimi, parametre bankaları ve düzenleme seçenekleri. Device View'da device adının üstündeki düğme parametre sekmelerini açar | Delete+üst = device'ı siler. Mute+üst = device'ı kapatır. Üst düğmeyi basılı tut + encoder = efektin zincirdeki yerini değiştirir. Shift+üst (Rack) = Ungroup | **RGB**. Session Screen'de arm'lı track'in boş slotu seçiliyse kırmızı yanar. Kuyruktaki clip yeşil pulse yapar [M] |
| **Lower Display Buttons (8)** | Genelde track seçimi. Hızlı çift basış track'i arm'lar (Session Pad Mode) | Shift+alt = Track Options (Rename, Group, Freeze, Flatten, renk). Record/Mute/Solo/Stop Clip/Delete/Duplicate basılıyken + alt = ilgili eylem o track'e uygulanır | **RGB, track rengi** ([FIG]). Durumlar: muted track sönük, solo varken diğerleri sönük, Stop Clip basılıyken durmuş track'ler sönük [M] |
| **Display** | O an odakta olan içeriği gösterir | | |
| **Pad Grid (8x8)** | Tamamen MPE. Her pad'de parmak hareketini algılayan XY sensörü ve RGB arka ışık var [TS] | Moda göre değişir; bkz. §5 | RGB |

### 2c. Sağ taraf
| Resmi ad | Konum | İşlev | Kombinasyon | LED |
|---|---|---|---|---|
| **Scenes & Repeat Intervals (8)** | Pad grid'in sağında dikey sütun | Note Mode'da step sequencer'ın ve grid'in adım boyu; Repeat açıkken tekrar hızı. Session Mode'da scene'leri tetikler. Session Overview'da her biri 64 scene'lik bir blok | | Seçili repeat interval **yeşil** [M]. Figma'daki yeşil: #46DD43 |
| **Main Track** | Alt ekran düğmeleri sırasının sağ ucu (**çıkarım**, bkz. §9) | Main track'i ekranda gösterir; tekrar basınca önceki görünüme döner | | Dokümante değil ([FIG]'de ekran düğmesi gibi LED çubuğu var) |
| **Swap** | Ekranın sağında, ortadaki kare düğme | Hot-Swap Mode; tekrar basınca çıkar. Load Next ve Load Previous düğmeleri var | | Dokümante değil |
| **Add** | Ekranın sağında, üstteki kare düğme ("+") | Browse Mode: Device, MIDI Track, Audio Track, Return Track; ayrıca Packs, User Library, Collections. Push 2'deki Browse ile Add Device/Add Track düğmelerinin yerini aldı [SOS] | Browse'dan çıkmak için X'in üstündeki ekran düğmesi. Soldan 2. üst düğme Preview'u açar | Dokümante değil |
| **Device** | Sağ üst dörtlü grup, 1. | Device View | | Dokümante değil |
| **Mix** | Sağ üst, 2. | 1. basış Global Mix (Volume/Pan/Sends; seçim üst düğmelerle), 2. basış Track Mix (Mix veya Input & Output) | Shift+encoder = ince ayar | Dokümante değil |
| **Clip** | Sağ üst, 3. | Clip View: loop ayarları, nota düzenleme, 1. encoder'da Zoom | Shift+Start/Loop/Length = 16'lık nota adımı; Shift+Transpose = cent | Dokümante değil |
| **Session (Session Screen Mode)** | Sağ üst, 4.; jog wheel'in üstünde | Clip ve scene'leri ekranda gösterir | Jog'a veya D-pad merkezine basış: Scene Workflow'da scene, Clip Workflow'da clip tetikler; **Shift ile tersi** | Dokümante değil |
| **Jog Wheel** | Sağ üst, en büyük düğme | Döndür: gezin. Bas: seç (Session Screen'de scene tetikler). **Sola it (nudge)**: bir üst menüye dön. **Sağa it**: rename veya bağlam menüsü. Metin girişinde sola/sağa it imleci taşır. Dokunma: Session Screen'de scene adlarını gösterir | Shift+bas: bkz. Session | LED yok |
| **Session D-pad** | Jog'un altında; 4 ok ve merkez düğme | Oklarla gezinme, merkezle seçim. Session'da sol/sağ track, yukarı/aşağı scene | Shift+merkez: clip ile scene tetikleme rolleri yer değiştirir | Dokümante değil |
| **Note** | D-pad'in altında, sol (pad ızgarası ikonu) | Note Mode | Session Pad Mode'dayken Note'u basılı tutmak geçici Note Mode verir | Dokümante değil |
| **Session (Session Pad Mode)** | D-pad'in altında, sağ (sütun ikonu) | Clip'leri pad'lere yerleştirir (sütun = track, pad = clip) | Note Mode'dayken basılı tutmak geçici Session Pad verir. Basılı tut + New = yeni Set | Dokümante değil |
| **Scale** | Note'un altı | Key ve scale menüsü; bkz. §5.1 | | Dokümante değil |
| **Layout** | Session'ın altı | Melodik track: 64 Notes → Melodic Sequencer → Melodic Sequencer + 32 Notes. Drum Rack: Loop Selector → 16 Velocities → 64 Pads | **Basılı tut** = geçici alternatif görünüm (16 Velocities, loop length pad'leri; Session Pad'de Session Overview). **Shift+Layout** = o görünümü kilitle; kilidi Layout'a tekrar basarak aç | Dokümante değil |
| **Repeat** | Sağ blok | Repeat Intervals düğmelerini etkinleştirir; pad basılı tutulunca nota tekrarlanır. Basınç tekrarlanan notaların şiddetini değiştirir. Durumu track başına saklanır | Hızlı bas-bırak = kilitli (latch). Basılı tut = geçici (bırakınca kapanır) | **Aktifken pulse** [M] |
| **Accent** | Repeat'in sağı | Tüm notalar tam velocity'yle (**127**) çalınır; 16 Velocities pad'lerini de geçersiz kılar | Latch veya momentary; Repeat ile aynı mantık | Açıkken yanar (**çıkarım**) |
| **Double Loop** | Sol üst | Loop içindeki materyali ve loop uzunluğunu ikiye katlar | | Dokümante değil |
| **Duplicate** | Sağ üst | Scene Workflow'da çalan clip'lerle yeni scene. Clip Workflow'da seçili clip'i sonraki slota kopyalar | Clip Workflow'da Shift+Duplicate = yeni scene. Basılı tut + pad, alt ekran düğmesi, clip, loop length pad'i veya step = kopyala/yapıştır | Dokümante değil |
| **Convert** | Sol alt | Simpler (Classic/One-Shot) → Drum Rack. Simpler Slicing → dilimlerin pad'lere dağıtıldığı Drum Rack. Drum pad → Simpler/Sampler. Audio → Simpler, Drum Pad veya Audio-to-MIDI (Harmony/Melody/Drums) | | Dokümante değil |
| **Delete** | Sağ alt | Note Mode'da seçili clip'i siler | + pad: o pad'in notaları (not yoksa pad'in kendisi). + clip. + üst/alt ekran düğmesi: device veya track. + encoder'a dokun: otomasyon silinir ya da varsayılan değere dönülür. + loop length pad'i: sayfa içeriği. + Automate: tüm otomasyon | Dokümante değil |
| **Octave Up / Down** | X ile bölünmüş karenin üst ve alt üçgenleri | Melodik: ±1 oktav. Drum: ±16 pad. Session: ±8 scene | **Shift**: melodik sequencer ve 32 Notes'ta skalada 1 nota; Drum'da 1 sıra | **Daha fazla oktav yoksa söner** [M] |
| **Page Left / Right** | Aynı karenin sol ve sağ üçgenleri | Step sequencer'da önceki/sonraki sayfa. Session'da ±8 track | İkisinden birini basılı tutmak auto-follow'u geri açar | Kullanılamıyorsa sönük olması beklenir ([FIG]'de "Page" sönük; **çıkarım**) |
| **Shift** | En alt sol | Diğer kontrollerin ek işlevlerini açan modifier; encoder'larda ince ayar | | |
| **Select** | En alt sağ | Session Pad'de basılı tut + clip = launch etmeden seç. Note Mode'da + pad = tetiklemeden seç | Select + touch strip'e dokun = Pitch Bend ile Mod geçişi | |

### 2d. Arka panel
Power düğmesi arkada, sarı: kısa basış açar; **3 s** basılı tutmak kapatır; **10 s** zorla kapatır. Diğer bağlantılar: 2 dengeli çıkış, 2 giriş (Line/Instrument/High), ADAT, MIDI (3.5 mm, Type A), USB-A, USB-C, DC 20V 3A, iki dinamik pedal/CV girişi (0–10 V, 12 bit), kulaklık [M].

---
## 3. Encoder, jog wheel, D-pad ve touch strip teknik davranışı
- **Döner kontrol sayısı: 11.** 8 ekran encoder'ı, Volume, Swing&Tempo ve Jog Wheel. [M] ve [FIG]'deki Knob..Knob_11 bununla birebir örtüşüyor.
- **Dokunma**: 8 encoder, Volume, Tempo ve Jog dokunmaya duyarlı. User Mode'da dokunma bir MIDI note, döndürme bir CC gönderir [M §16]. [PH]'ye göre touch note numaraları: encoder 1–8 için 0–7, Volume 8, Tempo 10, Jog 11, touch strip 12, D-pad merkezi 13.
- **Değer kodlaması** ([PH]): göreli (relative) two's complement. 1..63 saat yönü, 65..127 ters yön (127 = −1). CC numaraları: encoder'lar 71–78, Volume 79, Tempo 14, Jog 70. [M] de Live eşlemesi için "Relative (lin. 2's comp.)" modunu öneriyor.
- **Çözünürlük**: Push 3 için yayımlanmamış. Push 2 için resmi değer [P2]: 360° turda yaklaşık **210 adım**; Tempo encoder'ı **18 adım/tur**. Emülatör önerisi: 8 encoder için yaklaşık 210 adım/tur (sürükleme başına ~1 px = 1 adım); Shift'te adım 1/10.
- **Resmi adım değerleri**: Volume 1 dB (Shift ile 0.1 dB); Tempo 1 BPM (Shift ile 0.1 BPM); Swing %1, aralık 0–100; Transpose 1 yarım ses (Shift ile cent); clip pozisyonlarında Shift ile 16'lık nota adımı.
- **Jog Wheel**: döndürme, basma, **sola ve sağa itme** ve dokunma. [PH] MIDI: press CC94, click-left CC93, click-right CC95, dönüş CC70. **Yukarı/aşağı eğme dokümante değil.** Dört yönlü navigasyon ayrı Session D-pad'dedir: Up CC46, Right CC45, Down CC47, Left CC44, Center CC91 [PH]. Görevde geçen "4 yöne eğme" ifadesi resmi kaynakla desteklenmiyor.
- **Touch Strip**: User Mode'da pitch bend gönderir [M]. Push 3'te LED'i olup olmadığı dokümante değil.

## 4. Ekran
- **960 x 160 piksel**, 16 bit renk. Push 2 formatı resmi olarak BGR565 (bit 15-11 blue, 10-5 green, 4-0 red) [P2].
- Push 3'ün geometrisi Push 2 ile aynı: 960x160, stride 1024 [PH, ölçümle doğrulanmış; resmi değil]. [MusicRadar] ve pushpatterns da ekranın Push 2 ile yaklaşık aynı boyutta olduğunu söylüyor.
- Fiziksel boyut **resmi olarak doğrulanamadı.** Push 2 ekranı için forumda Sharp LQ092B5DW02, 9.2" (6:1 → yaklaşık 230 x 38 mm) önerilmiş [kullanıcı kaynağı]. [FIG]'deki ekran dikdörtgeni 1222 x 220 birim; gövde 2000 birim = 380 mm alınırsa yaklaşık 232 x 42 mm eder, yani öneriyle tutarlı.
- Ekran öğeleri track veya clip rengini alır [M §9].

## 5. Pad ve düğme renk durumları ([M], katman başına)

### 5.1 Melodik çalma: 64 Notes
- **Varsayılan**: C major. Sol alt pad **C1** (Live adlandırması; C1 = MIDI 36). Yukarı her pad bir dörtlü (4th) yukarı; sağa her pad skaladaki bir sonraki nota.
- **Scale menüsü**: tonik üst ve alt ekran düğmeleriyle seçilir. Scale encoder'lar veya D-pad ile seçilir. En soldaki encoder dizilimi belirler: **4ths / 3rds / Sequential**. En soldaki alt ekran düğmesi **In Key / Chromatic**, en sağdaki alt ekran düğmesi **Fixed On/Off**. Fixed açıkken sol alt pad hep C'dir; kapalıyken tonik olur. Ayar Set ile birlikte kaydedilir.
- **Renkler**: Push 3'ün 64 Notes için ayrı bir listesi yok. Push 3'ün 32 Notes listesiyle [M] ve Push 2'nin 64 Notes listesiyle [L12P2] birleştirilince şu kural çıkıyor (**çıkarım**):

| Durum | Renk |
|---|---|
| Kök nota | track rengi |
| Skala içi, kök değil | beyaz |
| Çalınan nota | yeşil |
| Kayıt sırasında çalınan nota | kırmızı (Push 2) |
| Chromatic modda skala dışı nota | sönük (unlit) |

### 5.2 Drum Rack pad'leri: Loop Selector'ın sol alt 4x4 bölümü
| Durum | Renk |
|---|---|
| Ses içeren pad | track rengi |
| Boş pad | gri |
| Çalan pad | yeşil |
| Seçili pad | beyaz |
| Solo'daki pad | koyu mavi |
| Mute'taki pad | track renginin koyusu |

### 5.3 Step sequencer adımları (drum)
| Durum | Renk |
|---|---|
| Boş adım | gri |
| Nota içeren adım | clip rengi; velocity yükseldikçe daha parlak |
| Muted nota | clip renginin açığı |
| Triplet seçiliyken sağdaki 2 sütun | sönük (etkin değil) |
| Playhead | çalarken yeşil, kayıtta kırmızı |

### 5.4 Loop length sırası
| Durum | Renk |
|---|---|
| Sayfa loop dışında | sönük |
| Sayfa loop içinde ama görünmüyor | gri |
| Sayfa görünüyor ama çalmıyor | beyaz |
| Sayfa çalıyor | yeşil |
| Sayfa kayıtta | kırmızı |

Varsayılan 16'lık çözünürlükte 2 sayfa = 2 bar; Melodic Sequencer'da bir sayfa 8 adım = 2 vuruş.

### 5.5 Melodic Sequencer + 32 Notes
- **Alt yarı (32 Notes)**: kök = track rengi; seçili = track renginin açığı; çalan = yeşil; skala içi = beyaz.
- **Üst yarı (sequencer)**:

| Durum | Renk |
|---|---|
| Nota içeren adım | clip rengi |
| Çalan adım | yeşil |
| Seçili adım | beyaz |
| Muted adım | açık gri |
| Boş adım | gri |
| Triplet seçiliyken 2 sütun | sönük |

### 5.6 Session Pad Mode
- Clip içeren slot: clip rengi. Shift + pad ile rengi değiştirilir; yeni renk dış halkadaki pad'lerden seçilir.
- Launch sırasındaki clip: **yeşil yanıp söner**.
- Boş slot: sönük. Boş pad'e basmak o track'i durdurur.
- Push 2'de ayrıca çalan clip kendi renginde pulse yapıyordu; kayıttaki clip kırmızı ile clip rengi arasında pulse yapıyordu [L12P2, yalnız Push 2].

### 5.7 Session Overview (Layout basılı tut)
Her pad 8x8 clip'lik bir blok; toplam 64 x 64.
| Durum | Renk |
|---|---|
| Seçili blok | beyaz |
| Blokta çalan clip var | yeşil |
| Blokta track veya scene yok | renksiz |

### 5.8 LED seviyeleri ve renk paleti (emülatör önerisi)
Durumlar: `off`, `dim`, `on`, `blink` ("flash") ve `pulse`.
- "dim = kullanılabilir, on = aktif" kuralı Push 3 için **dokümante değil (çıkarım)**. [FIG] bu kurala uygun çizilmiş: kullanılamayan Page sönük, Octave parlak.
- Push 2'de animasyonlar MIDI clock'a senkrondu; süre 24'lük notadan (4 clock) yarım notaya (48 clock) kadardı [P2].
- Öneri: `pulse` için 1/4 nota periyodunda sinüs, `blink` için 1/8 nota periyodunda kare dalga.

[FIG] renkleri:
| Kullanım | Hex |
|---|---|
| Etiket/ikon yanık | #D4E2E4 |
| Etiket/ikon sönük | #383E43 |
| LED çubuğu kapalı | #414548 |
| LED çubuğu beyaz | #CEDEEB / #DBEAEB |
| Track renkleri | yeşil #168A31, turuncu #D87635, mavi #0088DE, mor #9C62CA |
| Automate kırmızısı | #E12020 (glow #D9395C, opacity 0.4) |
| Record | #FA325E |
| Play | #0BC049 |
| Seçili repeat rate | #46DD43 |
| Kök pad | #0E8CD3 |
| Düğme gövdesi | #272124 |

## 6. Push 2 ve Push 3 farkları (karıştırmamak için)

| Konu | Push 2 | Push 3 |
|---|---|---|
| Tarama | Browse düğmesi (ayrıca Add Device ve Add Track) | **Add + Swap** [SOS] |
| Tempo/Swing | Encoder sırasının en solunda iki ayrı encoder | Tek **Swing and Tempo encoder** aşağıda. Ayrıca **Volume encoder** ekranın solunda. [SOS]: "iki soldaki encoder yerine aşağıda daha büyük düğmeler" |
| Navigasyon | 4 ok düğmesi | **Jog wheel + Session D-pad** (merkez düğmeli) |
| Ana kanal düğmesi | Master | **Main** |
| Yeni düğmeler | yok | Sets, Learn, Save, Lock, Capture, Session Screen Mode |
| Pad'ler | Siyah zemin, MPE yok | Beyaz zemin, MPE (XY + basınç) [SOS, TS] |
| Ekran | 960x160 | Aynı (bkz. §4) |

## 7. Push 3 MIDI haritası (topluluk: [PH], resmi değil; klavye/MIDI emülasyonu için)

| Grup | Kontrol ve numara |
|---|---|
| Ekran düğmeleri | Üst CC102–109, alt CC20–27 |
| Sol üst | Sets CC80, Setup CC30, Learn CC81, User CC59 |
| Sağ üst | Device CC110, Mix CC112, Clip CC113, Session Screen CC34 |
| Modifier'lar | Shift CC49, Select CC48 |
| Düzenleme | Undo CC119, Save CC82, Add CC32, Swap CC33 |
| Track kontrolleri | Lock CC83, Stop Clip CC29, Mute CC60, Solo CC61, Main CC28 |
| Sol sütun | Tap Tempo CC3, Metronome CC9, Quantize CC116, Fixed Length CC90, Automate CC89, New CC92, Capture CC65, Record CC86, Play CC85 |
| Scene düğmeleri | CC36=1/4, 37=1/4t, 38=1/8, 39=1/8t, 40=1/16, 41=1/16t, 42=1/32, 43=1/32t. Push 2'de Scene 1 (**en üst**) = CC43 [P2]. Buna göre yukarıdan aşağıya sıra: **1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4** |
| Mod düğmeleri | Repeat CC56, Accent CC57, Scale CC58, Layout CC31, Note CC50, Session Pad CC51 |
| Loop/clip | Double Loop CC117, Duplicate CC88, Convert CC35, Delete CC118 |
| Navigasyon | Octave Up CC55, Octave Down CC54, Page Left CC62, Page Right CC63 |
| Encoder basışları | Volume press CC111, Tempo press CC15 |
| Pad'ler | Note 36–99: **note = 36 + satır·8 + sütun** (satır ve sütun 0-tabanlı, sol alttan). Pad LED rengi velocity ile 128 girişlik paletten seçilir. CC düğmelerinde değer parlaklık olarak kullanılır ("lit white" = 122) |

## 8. SVG id → Push 3 kontrol eşleme tablosu ([FIG] doğrudan geometriyle; koordinatlar viewBox biriminde, x1,y1–x2,y2)

**Önemli uyarı:** `TransparentButton*` ve `mute`, `solo`, `lock` gibi ikon id'lerinin kendi dikdörtgeni yok. getBBox bunlarda sadece ikonu (yaklaşık 10–25 birim) döndürür. Hotspot için aşağıdaki **bölge** koordinatlarını kullanın; bunlar separator'lardan hesaplandı.

### 8.1 Sol üst: SessionSettings (236,360–534,426)
Separator x değerleri: 308.25 / 383.5 / 458.75.
| id (ikon) | Bölge x | Push 3 | Güven |
|---|---|---|---|
| `TransparentButton` / `file` (belge ikonu) | 236–309.75 | **Sets** | orta-yüksek |
| `TransparentButton_2` / `settings` (dişli) | 309.75–385 | **Setup** | yüksek |
| `TransparentButton_3` / `tutorial` (ampul) | 385–460.25 | **Learn** | yüksek |
| `TransparentButton_4` / `stamp` (kişi silueti) | 460.25–534 | **User** | orta |

### 8.2 Sağ üst: SessionSettings_2 (1852,360–2150,426)
Separator'lar: 1924.25 / 1999.5 / 2074.75.
| id (ikon) | Bölge x | Push 3 | Güven |
|---|---|---|---|
| `TransparentButton_5` / `track` (açık daire, knob ikonu) | 1852–1925.75 | **Device** | orta |
| `TransparentButton_6` / `mixer` (seviye çubukları) | 1925.75–2001 | **Mix** | yüksek |
| `TransparentButton_7` / `player` (play'li dikdörtgen) | 2001–2076.25 | **Clip** | yüksek |
| `TransparentButton_8` / `layout` (3 dikey çubuk) | 2076.25–2150 | **Session (Session Screen Mode)**; jog'un üstünde | yüksek |

### 8.3 Sol alt dörtlü: SessionSettings_3 (236,757–534,823)
Separator'lar: 308.25 / 383.5 / 458.75.
| id (ikon) | Bölge x | Push 3 |
|---|---|---|
| `TransparentButton_9` / `lock` | 236–309.75 | **Lock** |
| `TransparentButton_10` / `sqaure` (yazım hatası; kare ikon) | 309.75–385 | **Stop Clip** |
| `TransparentButton_11` / `mute` ("M") | 385–460.25 | **Mute** |
| `TransparentButton_12` / `solo` ("S") | 460.25–534 | **Solo** |

### 8.4 Ekran çevresi
| id | BBox | Push 3 | Not |
|---|---|---|---|
| `MainTopButtons` / `SelectionButton`..`SelectionButton_8` | y 360–426; x = 590 + 153·(i−1), genişlik 136 | **Upper Display Buttons 1–8** | LED katmanları `light`..`light_8` |
| `MainTopButtons_2` / `SelectionButton_9`..`_16` | y 757–823; aynı x formülü | **Lower Display Buttons 1–8** | `light_9`..`light_16`. [FIG] renkleri: 1 kapalı, 2 beyaz, 3 yeşil, 4 turuncu, 5 mavi, 6 mor, 7–8 kapalı |
| `TextButton_2` (iç yazısının id'si `Save_2`, ekranda "**Undo**" yazıyor) | 468,482–534,548 | **Undo** | **id yanıltıcı** |
| `TextButton` (iç yazısının id'si `Save`) | 468,636–534,702 | **Save** | |
| `LCD Display` | 553,447–1831,736; ekran dikdörtgeni 581,482 1222x220 | **Display** | İçindeki Wavetable cihaz ekranı Figma yer tutucusu (Oscillator, Table, Position, Filter Type, Frequency, Resonance, Mod Time vb.) |
| `IconButton` / `add` ("+") | 1852,481–1918,547 | **Add** | |
| `IconButton_2` / `replace` (dönen oklar) | 1852,636–1918,702 | **Swap** | |
| `MiscButton` (+`light_17`) | 1852,757–1914,823 | **Main Track** | orta güven: Push 2'deki Master'ın yeri ve LED çubuğu bunu destekliyor, [M] metninde konum yok |

### 8.5 Encoder'lar ve döner kontroller
Merkezler bbox'tan hesaplandı.
| id | BBox | Push 3 |
|---|---|---|
| `Knob`..`Knob_8` (TopKnobs 613,240–1765,317) | merkez x ≈ 651, 805, 958, 1113, 1265, 1420, 1574, 1727; y ≈ 278 | **Encoders 1–8**; ekran sütunlarıyla hizalı |
| `Knob_9` | 236,525–374,652 | **Volume Encoder** (Undo/Save'in solunda) |
| `Knob_10` | 256,865–347,949 | **Swing and Tempo Encoder** (Tap Tempo'nun üstünde) |
| `Knob_11` | 1937,481–2176,698 | **Jog Wheel** |

### 8.6 Sol sütun
| id | Bölge (y aralığı; x 236–381) | Push 3 |
|---|---|---|
| `Tempo` → `TextTransparentButton` ("Tap Tempo") | 980–1077.5 | **Tap Tempo** |
| `Tempo` → `IconTransparentButton` (id `icon/quantize`, ama ikon "içi boş + dolu daire") | 1077.5–1137 | **Metronome**; id yanıltıcı |
| `Tempo` → `TextTransparentButton_2` ("Quantize") | 1137–1194 | **Quantize** |
| `NoteSettings` → `TextTransparentButton_3` | 1257–1315.5 | **Fixed Length** |
| `NoteSettings` → `TextTransparentButton_4` (kırmızı yazı + `Ellipse 1_12`) | 1315.5–1374 | **Automate** |
| `RecordControls` → `TextTransparentButton_13` | 1437–1496.5 | **New** |
| `RecordControls` → `TransparentBigButton_3` / `icon-big-focus` | 1496.5–1561.5 | **Capture** |
| `RecordControls` → `TransparentBigButton_4` / `record` | 1561.5–1653 | **Record** |
| `ButtonBigPlay` / `play` | 1668–1767 | **Play** |
| `TouchSlider` | 426,865–533,1772; iz `Frame 32` x511 w8; nokta `Group 8` (526.5,1315.5, r 6.5) | **Touch Strip** |

### 8.7 Pad'ler
- `Pads` bbox: 578,858–1811,1779.
- `PadButton` (N=1) ve `PadButton_2`..`PadButton_64` satır satır dizilmiş, **sol üstten** başlıyor. `PadButton` = sol üst, `PadButton_8` = sağ üst, `PadButton_57` = sol alt, `PadButton_64` = sağ alt.
- İndeks formülü: satır = floor((N−1)/8) (üstten), sütun = (N−1) % 8. **Pad MIDI notu = 36 + (7−satır)·8 + sütun.**
- `Rectangle 12`..`Rectangle 12_8` mavi (#0E8CD3) kök pad'ler: N = 1, 11, 21, 31, 34, 44, 54, 64. Bu desen 3rds dizilimine benziyor; dekoratif, varsayılan 4ths düzenini yansıtmıyor.

### 8.8 Sağ sütun
| id | Bölge | Push 3 |
|---|---|---|
| `SideButton`..`SideButton_8` (1852–1914; SideButton y 869–967 … SideButton_8 y 1674–1772) | yukarıdan aşağı | **Scenes & Repeat Intervals 1–8**. Doğru etiketler: 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 |
| `Frame 35` / `SimpleButton_18` | 1952,757–2161,965; merkez (2056.5, 860.5) | **Session D-pad**. Merkez düğme `Rectangle 38 (Stroke)` 2021,825–2092,896. Oklar: `Vector 1_4` yukarı, `Vector 2_2` aşağı, `Vector 1_5` sağ, `Vector 2_3` sol. Yönler için ayrı düğme id'si yok; köşegen kuralı kullanın: merkez dışında \|dy\|>\|dx\| ise yukarı/aşağı, değilse sol/sağ |
| `LayoutScale` (1953,980–2161,1147); dikey separator x 2057.5, yatay y 1084.5 | 4 düğme | Sol üst `TransparentBigButton`/`icon-big-pads` = **Note**. Sağ üst `TransparentBigButton_2`/`icon-big-tracks` = **Session (Session Pad Mode)**. Sol alt `TextTransparentButton_11` = **Scale**. Sağ alt `TextTransparentButton_12` = **Layout** |
| `RepeatAccent` (1953,1209–2161,1311); x 2057.5'te bölünür | 2 düğme | `TextTransparentButton_5` = **Repeat**, `_6` = **Accent** |
| `LoopingSection` (1953,1324–2161,1484); x 2057.5 ve y 1405.5'te bölünür | 4 düğme | `_7` = **Double Loop** (sol üst), `_9` = **Duplicate** (sağ üst), `_8` = **Convert** (sol alt), `_10` = **Delete** (sağ alt) |
| `Frame 34` (1953,1499–2161,1707; merkez 2057,1603); X şeklinde bölünmüş | 4 üçgen | `JogControls` = **Octave Up** (üst), `JogControls_2` = **Octave Down** (alt), `JogControls_3` = **Page Left** (sol), `JogControls_4` = **Page Right** (sağ). Bu id'lerin bbox'ı yalnızca etiket ve ok; hotspot için köşegen kuralı |
| `NoteSelection` (1953,1725–2161,1771); x 2057.5'te bölünür | 2 düğme | `_14` = **Shift**, `_15` = **Select** |

### 8.9 Eşleşmeyen ve sorunlu öğeler
1. **SideButton etiketleri Figma'da hatalı.** `SideButton_2` "1/32t" yazıyor, "1/32" olmalı. `SideButton_7` "1/4" ve `SideButton_8` "1/4t" yazıyor; doğru sıra 1/4t ve 1/4. Katman adı `1/32t_*` her butonda aynı, yani sadece bir etiket. Emülatörde etiketleri HTML ile üstüne yazın.
2. **Yanıltıcı id'ler**: `TextButton_2` aslında Undo (`Save_2`); `icon/quantize` aslında Metronome ikonu; `track` aslında Device; `layout` aslında Session Screen; `stamp` aslında User; `sqaure` aslında Stop Clip.
3. **SVG'de bulunmayan kontroller**: Power düğmesi (arkada), arka panel girişleri, Jog'un itme yönleri için ayrı bölge, touch strip LED dizisi.
4. **Bilgi taşımayan katmanlar**: `NoIda` yalnızca SideButton'ların kapsayıcısı. `Group 10` boş. `Rectangle 39` sayfa çerçevesi.

## 9. Mevcut /Users/berkayer/site/ders-push3.html hotspot ve metin hataları

### 9.1 Hotspot bölmeleri
| Satır | Mevcut | Olması gereken |
|---|---|---|
| 238–239 | `Tempo` iki parçaya bölünmüş | 3 düğme var: Tap Tempo 980–1077.5, Metronome 1077.5–1137, Quantize 1137–1194. Metronome eksik |
| 237 | `NoteSettings` tümüyle Fixed Length | 1257–1315.5 Fixed Length, 1315.5–1374 **Automate** |
| 235–236 | `RecordControls` ikiye bölünmüş | 3 düğme: New, **Capture**, Record. Sınırlar 1496.5 ve 1561.5 |
| 242–243 | `LayoutScale` sadece x'te bölünmüş | Sol yarı hem Note'u hem Scale'i kapsıyor. Dörde bölünmeli: Note, Session, Scale, Layout |
| 240–241 | `mute`/`solo` svgId'leri | Yalnızca ikon bbox'ı (~10x13 birim); §8.3'teki bölgeler kullanılmalı |
| 250–253 | JogControls | Köşegen üçgen bölgeler kullanılmalı |

### 9.2 Açıklama metinleri
| Kontrol | Mevcut ifade | Doğrusu [M] |
|---|---|---|
| Layout | "4ths/3rds/Sequential arasında geçiş" | Pad layout'ları arasında geçer. 4ths/3rds/Sequential **Scale menüsünde, en soldaki encoder'la** seçilir |
| Double Loop | "sayfa uzunluğunu ikiye katlar" | Loop'taki materyali **ve** loop uzunluğunu ikiye katlar |
| Convert | "cihazları Rack'e gruplar" | Simpler/Drum Rack/audio dönüşümleri (bkz. §2c). Gruplama Shift + alt ekran düğmesi → Group ile yapılır |
| Quantize | "açıkken notalar hizalanır" | Basınca seçili notaları quantize eder. Otomatik quantize, Quantize basılı tutularak açılan **Rec. Quantize** seçeneğidir |
| New | "yeni clip veya scene oluşturur" | Seçili clip'i durdurur ve boş slot hazırlar; Scene Workflow'da yeni scene de oluşturur |
| Touch Slider | ad | Resmi adı **Touch Strip** |
| Encoder'lar | "dokunmak değer gösterir" | Dokunmaya duyarlı oldukları [M]'de var; dokununca ekranda değer gösterip göstermedikleri kılavuz metninde **doğrulanamadı** |

## 10. Setup menüsü varsayılanları ([M] §2; emülatörde Setup düğmesi için)
- **Status**: Display Light %100, LED Brightness %100 (varsayılan ve önerilen); Wi-Fi; Link (en sağdaki encoder) ve Play Sync.
- **Expression**: MPE (varsayılan), Poly Aftertouch, Mono Aftertouch. Note Pitch Bend (otomatik/On/Off); In Tune Location Finger/Pad; In Tune Width 0–20 mm; Slide Height 10–16 mm.
- **Sensitivity**: Threshold, Drive, Compand, Range; Reset düğmesi.
- **Audio**: 44.1–96 kHz; buffer 128–2048, varsayılan 128. Giriş tipleri: Line (+4 dBu, 0 dB kazanç), Instrument (−2 dBu, +6 dB), High (−22 dBu, +26 dB).
- **Preferences**: Workflow Scene (varsayılan) veya Clip; Exclusive Arm On; Exclusive Solo On; Select on Launch.
- Batarya yaklaşık 2.5 saat; %7'nin altında ekranda batarya ikonu belirir.

## 11. Emülatör için somut öneriler
1. Her kontrol için bir state tutun: `{id, pressed, touched, led: 'off'|'dim'|'on'|'blink'|'pulse', color}`. Encoder'lar için ayrıca `{value, touched}`.
2. Pulse ve blink animasyonlarını transport BPM'ine senkronlayın: pulse = 1/4 nota, blink = 1/8 nota (Push 2 senkron mantığından türetilmiş öneri).
3. Latch/momentary kuralını Repeat, Accent, Layout ve Note/Session için ortak bir helper'la uygulayın: basış süresi kısa (öneri: < ~300 ms, **çıkarım**) ise latch, uzun basılı tutulursa momentary.
4. Shift ince ayar çarpanı 0.1: Volume 1 → 0.1 dB, Tempo 1 → 0.1 BPM; encoder'larda adımın 1/10'u (öneri).
5. Klavye eşlemesi için §7'deki CC numaraları, Web MIDI ile gerçek Push'a bağlanma ihtimaline karşı referans olarak saklanabilir.


## BULGULAR
- [resmi/yuksek] Push 3'ün resmi kontrol listesi ve işlevleri (Sets, Setup, Learn, User, Volume Encoder, Undo, Save, Lock, Stop Clip, Mute, Solo, Swing and Tempo Encoder, Tap Tempo, Metronome, Quantize, Fixed Length, Automate, New, Capture, Record, Play, Touch Strip, Encoders, Upper/Lower Display Buttons, Display, Pad Grid, Scenes & Repeat Intervals, Main Track, Swap, Add, Device, Mix, Clip, Session Screen Mode, Jog Wheel, Session D-pad, Note, Session Pad Mode, Scale, Layout, Repeat, Accent, Double Loop, Duplicate, Convert, Delete, Octave Up/Down, Page Left/Right, Shift, Select) kılavuzun 17. bölümü 'Push Control Reference'ta (s.147-151) tanımlı. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Volume Encoder main output, headphone, Main track ve Cue volume'u ayarlar. Dokunma aktif seçeneği gösterir, basma seçenekler arasında geçer. Döndürme 1 dB adım, Shift ile 0.1 dB. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Swing and Tempo Encoder: dokunma Tempo mu Swing mi seçili gösterir, basma ikisi arasında geçer. Tempo 1 BPM (Shift ile 0.1 BPM), Swing %1 adım, aralık %0-100. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Shift basılıyken encoder'lar daha ince çözünürlükle çalışır. Delete basılıyken encoder'a dokunmak otomasyonu siler; otomasyon yoksa parametreyi varsayılan değere döndürür. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Jog Wheel'de döndürme gezinir, basma seçer. Sola itmek bir önceki menüye döner, sağa itmek rename veya bağlam menüsünü açar. Metin girişinde sola/sağa itmek imleci taşır. Session Screen'de dokunmak scene adlarını gösterir. Kılavuzda yukarı/aşağı itmeden söz edilmiyor. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [kod/orta] Push 3 MIDI haritası (topluluk): Jog dönüşü CC70, basma CC94, sola tıklama CC93, sağa tıklama CC95, dokunma note 11. D-pad: Up 46, Right 45, Down 47, Left 44, Center CC91, merkez dokunma note 13. Encoder'lar CC71-78, Volume CC79, Tempo CC14. Touch note'lar: encoder 0-7, Volume 8, Tempo 10, touch strip 12. Pad'ler note 36-99, sol alt 36. (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/buttons.go)
- [kod/orta] Push 3 düğme CC'leri (topluluk): Sets 80, Setup 30, Learn 81, User 59, Device 110, Mix 112, Clip 113, Session 34, Shift 49, Select 48, Undo 119, Save 82, Add 32, Swap 33, Lock 83, Stop 29, Mute 60, Solo 61, Main 28, Tap Tempo 3, Metronome 9, Quantize 116, Fixed Length 90, Automate 89, New 92, Capture 65, Record 86, Play 85, Scene 36-43 (1/4…1/32t), Repeat 56, Accent 57, Scale 58, Layout 31, Note 50, Session Pad 51, Double Loop 117, Duplicate 88, Convert 35, Delete 118, Octave Up/Down 55/54, Page Left/Right 62/63. (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/buttons.go)
- [kod/orta] Push 3'te encoder değerleri göreli two's complement olarak kodlanır: 1..63 pozitif, 65..127 negatif (127 = -1). (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/push3/encoder.go)
- [resmi/yuksek] Push 2 ekranı 960x160 piksel, 16 bit (bit 15-11 blue, 10-5 green, 4-0 red). Encoder'lar 360°'de yaklaşık 210 adım gönderir, tempo encoder'ı 18 adım. Touch strip'te 31 LED var. Scene 1 (en üst) CC43, Scene 8 CC36. Bu bilgiler yalnızca Push 2 için resmidir. (https://github.com/Ableton/push-interface/blob/master/doc/AbletonPush2MIDIDisplayInterface.asc)
- [kod/orta] Push 3 ekran geometrisi Push 2 ile aynı: 960x160 görünür piksel, satır stride 1024; ölçümle doğrulandığı belirtiliyor. (https://raw.githubusercontent.com/federico-pepe/ableton-push-hack/main/core/display/geometry.go)
- [kullanici/dusuk] Push 2 ekranının 9.2 inç Sharp LQ092B5DW02 (960x160) olduğu forumda öne sürülmüş; Ableton bu bilgiyi paylaşmamış. (https://forum.ableton.com/viewtopic.php?t=226313)
- [resmi/yuksek] Push 3 teknik özellikleri: XY sensörlü ve RGB arka ışıklı 64 MPE pad; boyutlar 380x318x29 mm (encoder'larla 44.5 mm); ağırlık 3.95 kg (standalone) / 3.1 kg; i3-1115G4, 8 GB RAM, 256 GB SSD; batarya 2-2.5 saat. (https://www.ableton.com/en/push/tech-specs/)
- [ikincil/yuksek] Push 2'deki Browse düğmesinin yerini Push 3'te Add ve Swap aldı. En soldaki iki encoder kaldırıldı, yerine aşağıda daha büyük düğmeler geldi. Jog wheel sağda. Kayıt işlevleri solda, düzenleme işlevleri sağda gruplanmış. (https://www.soundonsound.com/reviews/ableton-push-3)
- [resmi/yuksek] Record count-in sırasında yanıp söner, kayıt başlayınca sabit kırmızıya döner. Metronome açıkken pulse yapar. Repeat aktifken pulse yapar ve seçili repeat interval düğmesi yeşil yanar. Automate açıkken kırmızı, kapalıyken beyazdır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Lock basılıyken Stop Clip, Mute veya Solo'ya basılınca Lock ve seçilen düğme yanıp söner; eylem alt ekran düğmelerine kilitlenir. Seçili track mute'daysa Mute, solodaysa Solo yanar; ilgili alt ekran düğmeleri söner. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Session Screen Mode'da arm'lı track'in boş slotu seçiliyse üst ekran düğmesi kırmızı yanar. Kuyruktaki clip yeşil pulse yapar. Octave düğmeleri daha fazla oktav yoksa söner. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Drum Rack pad renkleri: ses içeren = track rengi, boş = gri, çalan = yeşil, seçili = beyaz, solo = koyu mavi, mute = track renginin koyusu. Step renkleri: boş = gri, nota = clip rengi (velocity arttıkça parlak), muted = daha açık renk, triplet'te sağdaki 2 sütun söner. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Loop length pad renkleri: loop dışı sönük, görünmeyen gri, görünen beyaz, çalan yeşil, kaydeden kırmızı. 32 Notes: kök = track rengi, seçili = açık ton, çalan = yeşil, skala içi = beyaz. Session Pad: clip rengi, kuyruk = yeşil yanıp söner, boş = sönük. Session Overview: seçili blok beyaz, çalan blok yeşil. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Push 2'de 64 Notes renkleri: kök nota track rengi, skala içi beyaz, çalan yeşil, kayıtta çalan kırmızı. Çalan clip kendi renginde pulse yapar, kayıttaki clip kırmızı ile clip rengi arasında pulse yapar. Yalnızca Push 2 için geçerli. (https://www.ableton.com/en/manual/using-push-2/)
- [ikincil/orta] Push 3'te Play çalmıyorken beyaz, çalarken yeşildir. Mute kilitliyken kırmızı, Solo kilitliyken mavi yanıp söner. Learn düğmesinde ampul, Setup'ta dişli ikonu var ve ikisi de sol üstte. (https://www.mslinn.com/av_studio/ableton-push-standalone.html)
- [resmi/yuksek] Varsayılan 64 Notes: C major, sol alt pad C1; yukarı her pad bir dörtlü yukarı, sağa her pad skalada bir sonraki nota. Scale menüsü: tonik üst ve alt ekran düğmeleriyle, scale encoder'lar veya D-pad ile seçilir. En soldaki encoder 4ths/3rds/Sequential, en soldaki alt düğme In Key/Chromatic, en sağdaki alt düğme Fixed. Chromatic'te skala dışı pad'ler söner. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Layout düğmesi melodik track'te 64 Notes, Melodic Sequencer ve Melodic Sequencer + 32 Notes; Drum Rack'te Loop Selector, 16 Velocities ve 64 Pads arasında geçiş yapar. Basılı tutmak geçici görünüm verir, Shift+Layout kilitler. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Konum ifadeleri: Add ekranın sağında; Session Screen Mode düğmesi jog wheel'in üstünde; Session Pad Mode düğmesi Session D-pad'in altında. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Accent tüm notaları velocity 127 ile çaldırır. Hızlı basış kalıcı açar, basılı tutmak geçici etkiler. Repeat de aynı latch/momentary mantığıyla çalışır ve durumu track başına saklanır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] Setup varsayılanları: Display Light ve LED Brightness %100. Expression varsayılanı MPE; In Tune Width 0-20 mm, Slide Height 10-16 mm. Buffer 128 (128-2048), 44.1-96 kHz. Exclusive Arm ve Solo On, Workflow Scene. Power: 3 sn basılı tut kapatır, 10 sn zorla kapatır. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [resmi/yuksek] User Mode'da encoder'a (jog, tempo ve volume dahil) dokunmak MIDI note, döndürmek CC gönderir. Tüm düğmeler CC gönderir. Touch strip pitch bend göndermeye devam eder. (https://cdn-resources.ableton.com/resources/pdfs/push-manual/3/2025-09-17/push3-manual-en.pdf)
- [kod/yuksek] push3-device.svg'deki kontrol yerleşimi, kılavuzun kontrol sırasıyla birebir örtüşüyor. Knob_9 = Volume, Knob_10 = Swing&Tempo, Knob_11 = Jog. TextButton_2 = Undo, TextButton = Save. icon/quantize aslında Metronome ikonu. Sağ üst sıra track/mixer/player/layout = Device/Mix/Clip/Session. MiscButton = Main (çıkarım). (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [cikarim/orta] SVG'deki SideButton etiketleri yukarıdan aşağı 1/32t, 1/32t, 1/16t, 1/16, 1/8t, 1/8, 1/4, 1/4t olarak çizilmiş; ikinci ve son iki etiket hatalı. Doğru sıra 1/32t, 1/32, 1/16t, 1/16, 1/8t, 1/8, 1/4t, 1/4 (Push 2 resmi CC43 = üst ile Push 3 topluluk CC haritasından çıkarım). (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] SVG'de PadButton..PadButton_64 sol üstten satır satır dizili. Pad MIDI notu = 36 + (7 - floor((N-1)/8))*8 + (N-1)%8. TransparentButton* ve mute/solo/lock id'lerinin kendi dikdörtgeni yok, bbox'ları yalnızca ikonu kapsıyor. (file:///Users/berkayer/site/assets/img/push3-device.svg)
- [kod/yuksek] Mevcut ders-push3.html'de Tempo, NoteSettings, RecordControls ve LayoutScale bölmeleri eksik veya yanlış (Metronome, Automate, Capture, Note ve Session hotspot'u yok). Layout, Convert, Double Loop, Quantize ve New açıklamaları kılavuzla çelişiyor. (file:///Users/berkayer/site/ders-push3.html)

## BELIRSIZ
- Push 3 ekranının fiziksel boyutu resmi olarak doğrulanamadı. 960x160 çözünürlük Push 2 için resmi; Push 3 için topluluk ölçümüne dayanıyor. 9.2 inç bilgisi Push 2 için bir forum iddiası.
- Push 3 encoder çözünürlüğü (adım/tur) yayımlanmamış. Push 2'de yaklaşık 210 adım (tempo encoder'da 18) resmi, ancak Push 3'e taşınıp taşınmadığı doğrulanamadı.
- Jog wheel'in yukarı/aşağı eğilebildiği doğrulanamadı. Kılavuz ve topluluk MIDI haritası yalnızca sola/sağa itme, basma, dokunma ve dönüşü gösteriyor. Görevdeki '4 yöne eğme' ifadesi desteklenmiyor; 4 yön ayrı Session D-pad'de.
- Hangi Push 3 düğmelerinin RGB, hangilerinin yalnız beyaz LED'li olduğu resmi kaynakta listelenmemiş. Kırmızı/beyaz Automate, kırmızı Record, yeşil repeat seçimi ve RGB ekran düğmeleri resmi. Play'in yeşil/beyaz olması ile Mute ve Solo'nun kilitliyken renkli yanıp sönmesi ikincil kaynaktan. Topluluk kodu CC düğmelerinin beyaz olduğunu söylüyor; bu, resmi bilgiyle kısmen çelişiyor.
- 'Dim = kullanılabilir, parlak = aktif' LED kuralı Push 3 için dokümante değil; Figma ve önceki Push sürümlerinden çıkarım.
- Push 3 touch strip'inde LED olup olmadığı veya kaç LED bulunduğu doğrulanamadı (Push 2'de 31 LED).
- Encoder'a dokununca ekranda değer gösterilip gösterilmediği Push 3 kılavuz metninde açıkça yazmıyor.
- Main Track düğmesinin fiziksel konumu (alt ekran düğmeleri sırasının sağ ucu) kılavuz metninde yok. Figma, Push 2'deki Master konumu ve CC28 kimliğinden çıkarıldı.
- Sets (belge) ve User (kişi) ikonları yalnızca Figma'dan geliyor. Learn için ampul ve Setup için dişli ikincil kaynakla doğrulandı. Device ikonu (açık daire) da Figma'dan geliyor.
- Push 3'te 64 Notes pad renk listesi kılavuzda ayrıca verilmemiş; 32 Notes listesi ve Push 2 davranışından çıkarıldı.
- Stop Clip, Capture, Fixed Length, Accent, Note/Session, Device/Mix/Clip ve Add/Swap düğmelerinin LED renkleri ve durumları dokümante değil.
- Topluluk MIDI haritası tersine mühendisliğe dayanıyor; firmware güncellemeleriyle değişebilir.
- Figma'daki LCD içeriği (Wavetable parametreleri, track adları) yer tutucu; gerçek Push 3 Wavetable ekranını temsil ettiği doğrulanmadı. Bu konu ayrı bir araştırma gerektiriyor.
- Latch ve momentary ayrımındaki basış süresi eşiği resmi olarak belirtilmemiş.