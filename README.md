# Recapp

AI destekli toplantı kaydedici/özetleyici — toplantı ses kaydını yükleyin, konuşmacı bazlı ve zaman damgalı transkripti alın, Claude ile otomatik olarak yapılandırılmış toplantı notları (gündem, görüşülen konular, kararlar, aksiyonlar) üretilsin.

## Özellikler

- **Ses yükleme:** Kaydedilmiş toplantı ses dosyalarını (mp3/m4a/wav) yükleyin.
- **Konuşmacı ayrımı + zaman damgası:** [Deepgram](https://deepgram.com/) ile kim ne zaman konuştu bilgisiyle transkript.
- **AI ile yapılandırılmış notlar:** Claude, transkripti gündem/görüşülen konular/kararlar/aksiyonlar/katılımcılar bölümlerine ayırır (bkz. [docs/meeting-template-example.md](docs/meeting-template-example.md)).
- **Çoklu format export:** Transkript ve notları `.txt`, `.srt`, `.vtt`, `.md` (ve ileride `.pdf`) olarak indirin.
- **Klip / Soundbite:** Transkript üzerinde bir zaman aralığı seçip o bölüm için kısa, çarpıcı bir başlık ve özet ("soundbite") üretin.
- **Aksiyon takibi:** Üretilen aksiyon maddelerini sorumlu/son tarih/durum ile listeleyip güncelleyin.
- **Davetli kullanıcı girişi:** Her kullanıcı sadece kendi toplantılarını görür. Hesap açma kendi kendine kayıtla değil, admin'in `/admin/users`'tan gönderdiği davetle olur; e-posta+şifre ile giriş yapılır.
- **Admin paneli:** `/admin/api-keys`'te sağlayıcı (Deepgram/Anthropic/Azure/OpenAI/Google) API anahtarları, `.env`'i geçersiz kılacak şekilde, şifrelenerek yönetilebilir.

## Mimari

```
Ses dosyası → Deepgram (STT + diarization) → Supabase (Postgres + Storage)
                                                     │
                                                     ▼
                                    Claude (Vercel AI SDK generateObject)
                                                     │
                                                     ▼
                              Yapılandırılmış notlar + aksiyon maddeleri (UI'da görüntülenir)
```

Backend, web arayüzü ve ileride eklenecek istemcilerin (mobil uygulama, toplantı botu entegrasyonu) aynı şekilde kullanabilmesi için REST API (`app/api/**`) olarak tasarlanır; web arayüzü bu API'nin bir istemcisidir.

| Katman | Teknoloji |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript, Vercel |
| UI | Tailwind CSS + shadcn/ui |
| Transkripsiyon | Deepgram API (diarization + zaman damgası) |
| AI özetleme | Claude (Anthropic API) + Vercel AI SDK |
| Veritabanı | Supabase (Postgres + Storage) |

## Yol Haritası

- **Faz 1 (mevcut):** Web uygulaması — ses yükleme, transkripsiyon, AI notları, export, klip üretimi.
- **Faz 2:** iOS ve Android mobil uygulamaları (React Native/Expo), aynı REST API üzerinden.
- **Faz 3:** Zoom/Teams/Meet gibi toplantı platformlarına bot/eklenti olarak entegrasyon.

## Kurulum

```bash
npm install
cp .env.local.example .env.local   # API anahtarlarını doldurun
npm run dev
```

Gerekli ortam değişkenleri: `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `CREDENTIALS_ENCRYPTION_KEY` (bkz. `.env.local.example`).

Uygulama davetle çalışır — kendi kendine kayıt yok. İlk (admin) hesabı Supabase panelinden (Authentication → Users → Add user) veya `supabase.auth.admin.createUser({ email, email_confirm: true })` ile elle açıp e-postasını `ADMIN_EMAILS`'a ekleyin; sonraki kullanıcıları admin `/admin/users`'tan davet edebilir.

### Hesaplar

- **Supabase:** Apple/GitHub hesabıyla giriş yapıldı.
- **Deepgram:** Yahoo hesabıyla giriş yapıldı.
- **Anthropic:** API anahtarı console.anthropic.com üzerinden alındı.

## Deploy

Vercel'e bağlayıp yukarıdaki ortam değişkenlerini proje ayarlarında tanımlayın; `vercel deploy` veya Vercel Git entegrasyonu ile dağıtım yapılabilir.

## Yapılacaklar — UI/UX

### Kritik

- [x] **Ses oynatıcı ekle.** Toplantı detay sayfasında sticky bir `<audio controls>` player eklendi (`AudioPlayerProvider` / `src/components/audio-player.tsx`), `GET /api/meetings/[id]/audio` imzalı URL döndürüyor. Transkript zaman damgalarına ve klip kartlarındaki "Oynat" butonlarına tıklayınca ilgili zamana seek ediyor.
- [x] **Aksiyonlara geri bildirim (toast) ekle.** `sonner` kuruldu (`layout.tsx`'te global `<Toaster />`); konuşmacı eşleme, klip oluşturma ve aksiyon durumu değiştirme artık başarı/hata toast'ı gösteriyor.
- [x] **Global header/navigasyon ekle.** `src/components/site-header.tsx` eklendi ve `layout.tsx`'te tüm sayfalarda render ediliyor; "Recapp" logosu ve "Toplantılar" linki her ekranda ana sayfaya dönüş sağlıyor.

### Orta öncelik

- [x] **Toplantı detay sayfasını sekmelere (Tabs) böl.** `src/components/ui/tabs.tsx` (base-ui üzerinde) eklendi; Notlar / Aksiyonlar / Transkript / Klipler / Dışa Aktar artık sekmeli, `keepMounted` ile sekme değiştirince form taslakları (örn. konuşmacı isim girişleri) kaybolmuyor. Ses oynatıcı tüm sekmelerde sabit kalıyor.
- [x] **Konuşmacı eşleme arayüzünü ferahlat.** Transkript sekmesinde artık sadece rozet (Badge) olarak mevcut isimler gösteriliyor; düzenleme "Konuşmacıları Düzenle" butonuyla açılan bir Dialog'a (`ui/dialog.tsx`) taşındı.
- [x] **Klip oluşturmayı saniye girişinden kurtar.** Ses oynatıcı varken "Başlangıcı İşaretle" / "Bitişi İşaretle" butonları o anki oynatma pozisyonunu yakalıyor; manuel saniye girişi ses yokken (veya ince ayar için) hâlâ mevcut.
- [x] **Ana sayfaya arama/filtre/sayfalama ekle.** `src/app/page.tsx` artık `?q=` (başlık araması), `?status=` (durum filtresi) ve `?page=` (20'şer kayıtlık sayfalama) destekliyor; JS'siz de çalışan bir GET formu üzerinden.
- [x] **Form kontrollerini tutarlılaştır.** Aksiyon maddesi durum seçici artık yeni toplantı formuyla aynı shadcn `Select` bileşenini kullanıyor (native `<select>` kaldırıldı).

### Düşük öncelik

- [x] **Birincil marka rengi ekle.** `globals.css`'te `--primary` artık mavi bir marka rengi (light/dark için ayrı ton); birincil butonlar ve linkler gri skaladan ayrışıyor.
- [x] **Dosya yükleme alanını iyileştir.** Yeni toplantı formunda artık sürükle-bırak alanı var; seçilen dosyanın adı/boyutu gösteriliyor ve "Kaldır" ile değiştirilebiliyor.
- [x] **Dışa aktarma butonlarına ikon/açıklama ekle.** `src/components/ui/tooltip.tsx` eklendi; her export formatının (txt/srt/vtt/md) artık kendine özgü bir ikonu ve üzerine gelince açıklama tooltip'i var.
- [x] **Karanlık mod anahtarı ekle.** Header'a `ThemeToggle` eklendi; `localStorage` + sistem tercihine göre başlangıç teması `layout.tsx`'teki blocking script ile FOUC olmadan ayarlanıyor.

## Yapılacaklar — Ek geri bildirimler

- [x] **Kullanılan model kaydı görünür oldu.** `transcriptionModelLabel()` (`shared/schemas.ts`) eklendi; ana sayfa tablosunda "Model" sütunu ve toplantı detay sayfasında tarihin yanında gösteriliyor.
- [x] **Toplantı silme.** `DELETE /api/meetings/[id]` eklendi (DB cascade + Storage'daki ses dosyası dahil temizlik); ana sayfada satır başına ve detay sayfasında onaylı bir "Sil" butonu var (`DeleteMeetingButton`).
- [x] **Takılı "Bekliyor" durumu düzeltildi.** `MeetingStatusIndicator` artık `updated_at`'i izliyor; 10 dakikadan uzun süredir ilerlemeyen bir iş "stuck" (kırmızı rozet, spinner yok, "yeniden deneyin veya silin" mesajı) olarak işaretleniyor ve gereksiz polling durduruluyor. "Yeniden Dene" butonu artık "Bekliyor" durumunda da gösteriliyor ve hata durumunda sayfayı çökertmek yerine toast gösteriyor (`ReprocessMeetingButton`).
- [x] **Sekme geçişlerinde genişlik titremesi ve header hizalama bugı düzeltildi.** Kök neden: `<body>` `flex flex-col` olduğu için `<main>` genişliği içeriğe göre daralıp genişliyordu (shrink-to-fit), `max-w-5xl`'e rağmen. Her sayfanın `<main>`'ine `w-full` eklendi — Playwright ile Chromium + WebKit'te doğrulandı (artık her sekmede sabit 1024px, header ile piksel hizalı).
- [x] **Kullanıcı girişi + veri izolasyonu.** Supabase Auth eklendi; `src/proxy.ts` (Next 16'nın middleware'i) oturumu olmayan istekleri `/login`'e yönlendiriyor. Her toplantı `user_id`'ye göre izole — tüm sayfa/route'lar sahiplik kontrolünden geçiyor (`isMeetingOwner`), başka birinin toplantı ID'sine direkt girmeye çalışmak 404 döner. Header'da kullanıcı e-postası + "Çıkış Yap" var.
- [x] **Davetli, şifreli giriş modeli.** Hesap açma kendi kendine kayıtla değil, sadece admin'in `/admin/users`'tan gönderdiği davetle olur (`inviteUserAction`, `auth.admin.inviteUserByEmail`). Davet linki `/auth/set-password`'e düşer, kullanıcı ilk girişte şifresini belirler; sonraki girişler `/login`'de e-posta+şifre ile (`signInWithPassword`). Davetsiz/yanlış giriş denemesinde hesap var mı yok mu belli etmeyen genel bir "bu ortam davetle kullanılır" mesajı gösteriliyor (kullanıcı numaralandırmayı önlemek için).
- [x] **Admin: API anahtarları yönetimi.** `/admin/api-keys` sayfası (yalnızca `ADMIN_EMAILS` listesindekilere açık) Deepgram/Anthropic/Azure/OpenAI/Google anahtarlarını AES-256-GCM ile şifreleyip `api_credentials` tablosunda saklıyor; admin panelinden girilen değer `.env`'deki değeri geçersiz kılıyor, girilmezse `.env`'e düşüyor. Tüm sağlayıcı çağrıları (`getApiKey`) bu kaynaktan besleniyor.
- [x] **Eski toplantılar aktarıldı.** Auth eklenmeden önce oluşturulmuş 12 toplantının `user_id`'si `null`'dı (izolasyonun doğal sonucu olarak görünmez olurdu); hepsi asıl admin hesabına (`muharremucak@yahoo.com`) aktarıldı.

## Katkıda Bulunma

Değişiklik önerilerinizi issue/PR olarak açabilirsiniz.
