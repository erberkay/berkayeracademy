DUYURU ANİMASYONU — "ÇOK YAKINDA" TEASER
========================================

Berkay Er Academy etkinlik duyurusu için sessiz, 14 sn'lik, sonsuz döngülü marka animasyonu.
Kaynak tek dosya: tools/duyuru/scene.html. Hareketin tamamı zamanın saf fonksiyonudur
(Web Animations API + window.seek(t)); render.mjs her kareyi seek(t) ile çizip PNG alır,
ffmpeg GIF / MP4 / JPG'ye çevirir. Döngü kusursuzdur: t=0 ile t=14 sn karesi piksel piksel aynıdır.


YENİDEN ÜRETME
--------------
  node tools/duyuru/render.mjs            hepsi (poster, gif, web, dikey)
  node tools/duyuru/render.mjs gif        yalnız mail GIF'i
  node tools/duyuru/render.mjs web        yalnız 16:9 video
  node tools/duyuru/render.mjs dikey      yalnız 9:16 video
  node tools/duyuru/render.mjs poster     yalnız poster JPG

Gerekenler: Node 22+ (paket bağımlılığı yok), Google Chrome, ffmpeg ve internet (yazı tipleri
Google Fonts'tan gelir; Instrument Serif yüklenemezse render hata verip durur). Yollar farklıysa
CHROME_BIN, FFMPEG_BIN, FFPROBE_BIN ortam değişkenleri kullanılır. Geçici dosyalar TMPDIR'e
yazılır ve iş bitince silinir.

Geliştirme yardımcıları:
  node tools/duyuru/render.mjs still  --w 1920 --h 1080 --t 0,3.6,8.4 --out KLASÖR    tek kare PNG
  node tools/duyuru/render.mjs frames --w 600 --h 338 --dsf 2 --fps 10 --out KLASÖR   tüm döngü PNG
  Sahne ?w=1920&h=1080 (yatay) veya ?w=1080&h=1920 (dikey) parametresiyle açılır.
  ?gif=1 -> GIF modu: film greni yok, büyük arka plan ışığı kıpırdamaz (GIF çok daha küçük sıkışır).


NEREDEN DEĞİŞTİRİLİR (hepsi scene.html içinde)
----------------------------------------------
  Metinler  : <body> içindeki bölümler: #topbar (marka + sahne etiketi), #title, #items (dört madde + açıklama), #why (3·2·1), #closing.
              Dikey düzende başlığın satır sonları <br class="p"> ile verilir.
  Süreler   : <script> başındaki LOOP ve T tablosu (saniye). Tüm hareket bu tablodan türer.
  Renk/yazı : <style> başındaki :root değişkenleri (ui.css paletiyle aynı).
  Boyutlar  : 1rem = 1 tasarım pikseli (yatay 1920x1080, dikey 1080x1920 üzerinden ölçülür).
              GIF'te en küçük yazı ~13 px kalsın diye hiçbir yazı 42 tasarım pikselinden küçük olmamalı.


ÇIKTILAR (tools/duyuru/cikti/ — git'e ve siteye GİRMEZ; Instagram için)
-------------------------------
  etkinlik-duyuru-mail.gif     600x338, 10 fps, sonsuz döngü. Toplu e-posta kahramanı.
                               Outlook yalnız ilk kareyi gösterir: kare 0 tam okunur bir posterdir.
  etkinlik-duyuru-web.mp4      1920x1080, 30 fps, H.264 High, sessiz. Site / YouTube / LinkedIn / yatay paylaşım.
  etkinlik-duyuru-dikey.mp4    1080x1920, 30 fps, H.264 High, sessiz. Story / Reels / WhatsApp durumu.
  etkinlik-duyuru-poster.jpg   1200x675 JPEG (kare 0). Sosyal paylaşım önizlemesi ve GIF/video yedeği.

Bu animasyon Instagram içindir, SİTEYE KONMAZ. cikti/ klasörü .gitignore'dadır, tools/** hosting'e
yüklenmez. Duyuru e-postasına yalnız afiş (poster.jpg) gömülü olarak gider: functions/assets/
etkinlik-duyuru-hero.jpg (gitignore'da; e-postanın içinde taşınır, herhangi bir adreste barınmaz).
