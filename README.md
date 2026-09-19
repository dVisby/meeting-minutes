# Recapp

AI destekli toplantı kaydedici/özetleyici — toplantı ses kaydını yükleyin, konuşmacı bazlı ve zaman damgalı transkripti alın, Claude ile otomatik olarak yapılandırılmış toplantı notları (gündem, görüşülen konular, kararlar, aksiyonlar) üretilsin.

## Özellikler

- **Ses yükleme:** Kaydedilmiş toplantı ses dosyalarını (mp3/m4a/wav) yükleyin.
- **Konuşmacı ayrımı + zaman damgası:** [Deepgram](https://deepgram.com/) ile kim ne zaman konuştu bilgisiyle transkript.
- **AI ile yapılandırılmış notlar:** Claude, transkripti gündem/görüşülen konular/kararlar/aksiyonlar/katılımcılar bölümlerine ayırır (bkz. [docs/meeting-template-example.md](docs/meeting-template-example.md)).
- **Çoklu format export:** Transkript ve notları `.txt`, `.srt`, `.vtt`, `.md` (ve ileride `.pdf`) olarak indirin.
- **Klip / Soundbite:** Transkript üzerinde bir zaman aralığı seçip o bölüm için kısa, çarpıcı bir başlık ve özet ("soundbite") üretin.
- **Aksiyon takibi:** Üretilen aksiyon maddelerini sorumlu/son tarih/durum ile listeleyip güncelleyin.

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

Gerekli ortam değişkenleri: `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Hesaplar

- **Supabase:** Apple/GitHub hesabıyla giriş yapıldı.
- **Deepgram:** Yahoo hesabıyla giriş yapıldı.
- **Anthropic:** API anahtarı console.anthropic.com üzerinden alındı.

## Deploy

Vercel'e bağlayıp yukarıdaki ortam değişkenlerini proje ayarlarında tanımlayın; `vercel deploy` veya Vercel Git entegrasyonu ile dağıtım yapılabilir.

## Katkıda Bulunma

Değişiklik önerilerinizi issue/PR olarak açabilirsiniz.
