## Mobil görünümler (aynı SVG, farklı viewBox)
```js
var VIEWS = { full:'161 135 2116 1725', pads:'583 860 1222 918', padsStrip:'420 860 1385 918', controls:'575 240 1234 590' };
```
Pad ve encoder boyutları ölçekle birlikte değişir: s = min(genişlik/vbW, yükseklik/vbH), pad = 146·s × 108·s px.

| Cihaz / alan | Görünüm | Pad boyutu | Karar |
|---|---|---|---|
| Masaüstü ve iPad | full | 57–64 × 42–48 | tam kullanım |
| Telefon yatay | padsStrip (F1), Bölünmüş (F2: pads + controls) | 54×40 | çalma görünümü |
| Telefon dikey | Yığın: üstte controls (≈186 px), altta pads | 47×34 | kullanılabilir; `Yan çevir` çipi |
| Telefonda full görünüm | — | ≈20 px yükseklik | yalnız Seviye 1 (WCAG 2.5.8'in 24 px sınırının altında, çalma için değil) |

- **Otomatik seçim:** `prefs.view='auto'` ise ≤600px'te `padsStrip` ya da yığın. Taskbar'da görünüm anahtarı: `.seg` (Tam, Pad, Kontrol).
- **Geçiş:** viewBox rAF içinde 200 ms'de interpolasyonla değişir; `prefers-reduced-motion` açıksa anlık.
- **Hizalama:** Hotspot ve canvas hizası getScreenCTM ile hesaplandığı için değişmez. `ResizeObserver` ve `visualViewport.resize` iOS'ta toolbar açılıp kapandığında da tetiklenir.
- **Bölünmüş görünüm (F2):** SVG iki kez enjekte edilmez. İkinci panel `<svg viewBox><use href="#p3-art"/></svg>` ile çizilir. Zayıf cihazda `<use>` pahalı gelirse kontrol paneli sade HTML ile yeniden çizilir (LCD + 8 encoder + 16 düğme).
- **Yükseklik ve kenarlar:** `height:100dvh` (mevcut), `viewport-fit=cover` (mevcut), `padding: env(safe-area-inset-*)`. Kırılımlar 600 / 900 / 1024.
- **Android:** isteğe bağlı `Tam ekran` düğmesi → `requestFullscreen()` + `screen.orientation.lock('landscape')`; hata sessizce yutulur. iOS'ta lock yok, yalnız ipucu gösterilir.
- **Titreşim:** `navigator.vibrate(8)` yalnız Android'de, varsayılan kapalı.

## Dokunma ve girdi
- **Enstrüman yüzeyleri** (pad, encoder, strip, jog): `touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent`. Sayfanın geri kalanında pinch-zoom açık kalır; `user-scalable=no` kullanılmaz.
- **Pad yüzeyi:** Tek yakalama div'i. `pointerdown`'da **her zaman** `setPointerCapture` çağrılır. Pad indeksi `padAt(toSvg(x,y))` ile koordinattan bulunur: `PAD={x0:589,y0:866,px:152,py:114}`, aradaki 6 birimlik boşluk en yakın pada verilir.
  - Glissando (NotePB kapalıyken) koordinat değişince yeniden tetikleme ile yapılır.
  - Voice `pointerup`, `pointercancel` ve `lostpointercapture` ile kapanır; `endVoice` idempotent olmalı.
  - `contextmenu` engellenir.
  - `getCoalescedEvents` özellik tespitiyle kullanılır.
- **Panic:** `blur`, `visibilitychange` (hidden: master 20 ms'de 0'a rampalanır), `contextmenu`, Escape.
- **Mevcut Seviye 2 sürüklemesi:** `window` pointermove kaldırılır, `setPointerCapture` deseni kullanılır.
- **Encoder:** dikey sürükleme; hız ivmesi `1+min(3, hız/1.5)` (Shift basılıyken ivme yok). Wheel `{passive:false}`; `ctrlKey` (pinch) geldiğinde yok sayılır. Çift tık = varsayılana dön. Hit alanı en az 44 px (`::after`).

## Erişilebilirlik
| Bileşen | Rol ve öznitelikler | Klavye |
|---|---|---|
| Pad ızgarası | `role="grid"`, 8 `row`, 64 `gridcell`, roving tabindex (tek tab durağı). `aria-label="C3, kök nota, satır 1 sütun 1"`; scale değişince güncellenir | Oklar hücre değiştirir. Enter/Space keydown = noteOn, keyup = noteOff. Home/End, Ctrl+Home |
| Encoder'lar | `role="slider"`, `aria-orientation="vertical"`, `aria-valuemin/max/now`, `aria-valuetext` (ör. `Frequency 4.0 kHz`) | ↑/→ +1, ↓/← −1, PgUp/PgDn ±10, Home/End, Shift+ok ince ayar, Enter = bas, Delete = varsayılan |
| Düğmeler | `role="button"`. Toggle'larda (Accent, Repeat, Mute, Solo, Metronome, Fixed Length) `aria-pressed`. `aria-keyshortcuts` | Enter/Space. Basılı tutma keydown→keyup süresiyle ölçülür |
| Klavyeyle çal | `role="switch"`, `aria-checked` | Space. Tek tuş kısayolları yalnız sahne odaktayken çalışır (2.1.4) |
| LCD | `#p3LcdLive` (`sr-only`, `aria-live="polite"`): sayfa ve bank değişiminde özet, en sık 500 ms'de bir | — |
| Öğretici | Talimat metni `#p3TaskText` (polite), sonuç `#p3Feedback` (assertive). Adım değişince odak başlığa taşınır | Devam, Geri, Atla düğmeleri |

- **Rengi tek gösterge yapmama (1.4.1):** `Nota adlarını göster` seçeneği pad canvas'ına nota adı yazar. Kök pad'lerde ek olarak 2 birimlik iç çerçeve deseni bulunur.
- **Odak:** `outline:2px solid var(--accent); outline-offset:2px`.
- **Reduced motion:** `prefers-reduced-motion` açıksa pad flash'ları, `p3TargetPulse` ve viewBox geçişi kapanır; yalnız renk değişir.
- **Ekran okuyucu duyuruları:** Her nota duyurulmaz; yalnız öğretici sonuçları duyurulur.
- **Kontrast:** Cihaz içi renkler sabit hex'tir. LCD metinleri siyah zemin üzerinde en az 4.5:1 olmalı; bu yüzden ad rengi `#8A8F93` seçildi. Tema değişince kabuk tokenları uyum sağlar, cihaz koyu kalır.
- **Dil:** `lang` özniteliği i18n `apply()` ile güncellenir. Kontrol adları İngilizce kalır; `aria-label`'lar TR/EN.