# SteelHub — Design Document

**Proje:** SteelHub — Steel Industry Intelligence Dashboard  
**Owner:** Berkay / Anti-Gravity Studio  
**Tarih:** 14 Mart 2026  
**Versiyon:** v1.0  
**Durum:** Onay bekliyor

---

## 1. Proje Özeti

SteelHub, çelik endüstrisi için bölgesel bazda fiyat takibi, haber izleme ve raporlama yapan web tabanlı bir internal intelligence tool'dur. 5 ana kategori ve 7 bölge kapsamında çelik piyasalarını izler.

**Kullanım:** Internal (Anti-Gravity Studio)  
**Deployment:** Vercel / Netlify (free tier)  
**Yaklaşım:** Progressive Enhancement — $0/ay MVP ile başla, config değişikliği ile kaliteyi artır

---

## 2. 5 Ana Kategori

| # | Kategori | İzlenen Veriler | Güncelleme |
|---|----------|----------------|------------|
| 1 | **Hammadde** | Hurda (HMS 1&2), Kömür (Coking Coal), Cevher (Iron Ore 62% Fe) | Haftalık fiyat, günlük haber |
| 2 | **Çelik Ürünü** | HRC, CRC, HDG, Slab, Billet, Rebar, PPGI | Haftalık fiyat, günlük haber |
| 3 | **Son Kullanıcı / Tüketim** | İmalat PMI, otomotiv üretim, inşaat aktivitesi | Aylık veri, günlük haber |
| 4 | **Taşımacılık** | BDI (Baltic Dry Index), Capesize/Panamax rates, container freight | Günlük BDI, haftalık navlun |
| 5 | **Vergiler / Ticaret** | İthalat vergileri, anti-dumping, CBAM, safeguard duties | Günlük haber |

---

## 3. 7 Bölge ve Ülkeler

| Bölge | Ülkeler | Öncelik |
|-------|---------|---------|
| **Far East** | Çin, Vietnam, Japonya, Kore, Malezya | 🔴 Yüksek |
| **Asia** | Hindistan, Türkiye, Orta Doğu | 🔴 Yüksek |
| **CIS** | Rusya, Ukrayna | 🟡 Orta |
| **EU** | Tüm Avrupa ülkeleri | 🔴 Yüksek |
| **Africa** | Kuzey Afrika, Diğer | 🟢 Düşük |
| **North America** | ABD, Kanada, Meksika | 🟡 Orta |
| **South America** | Brezilya, Şili | 🟢 Düşük |

### Bölge Bazlı Kaynak Stratejisi

- **Far East:** China HRC FOB, SHFE futures, Mysteel haberleri
- **Asia:** Turkey Rebar FOB, Scrap CFR Turkey, India Sponge Iron
- **CIS:** Russia HRC FOB Black Sea, Ukraine billet prices
- **EU:** NW EU HRC, Platts/Argus benchmarks
- **Africa:** N.Africa import prices, Egypt rebar
- **North America:** US Midwest HRC, Nucor CSP, CME futures
- **South America:** Brazil HRC domestic, Chile import

---

## 4. Progressive Enhancement — Faz Planı

### Mimari Prensip: Provider Pattern

Her veri kaynağı bir interface arkasında. Upgrade = `.env` değişikliği, kod değişikliği yok.

```typescript
// providers/interfaces.ts
interface PriceProvider {
  getPrice(product: SteelProduct, region: Region): Promise<PriceData>
  getHistory(product: SteelProduct, region: Region, days: number): Promise<PriceData[]>
}

interface NewsProvider {
  searchNews(category: Category, region: Region): Promise<NewsItem[]>
}

interface AIParser {
  categorize(headline: string): Promise<Category>
  summarize(articles: NewsItem[]): Promise<string>
}

// .env.local
PRICE_PROVIDER=scraping        // scraping | metals-api
NEWS_PROVIDER=brave-free       // brave-free | brave-paid
AI_PARSER=regex                // regex | claude-haiku
```

### Faz 0 — MVP Kurulum ($0/ay)

**Fiyat Verileri:**
- TradingEconomics web scraping (Cheerio)
  - HRC Steel: `tradingeconomics.com/commodity/hrc-steel`
  - Scrap Steel: `tradingeconomics.com/commodity/scrap-steel`
  - Iron Ore: `tradingeconomics.com/commodity/iron-ore`
  - Coking Coal: `tradingeconomics.com/commodity/coal`
  - BDI: `tradingeconomics.com/commodity/baltic`
- SteelBenchmarker (bi-monthly, free)
  - US HRC, EU HRC, China HRC, World Export HRC
- Güncelleme: Haftalık (Vercel cron)

**Haber Taraması:**
- Brave Search API (aylık $5 ücretsiz kredi ≈ 1,000 arama)
- Günlük 15 arama → 3 öncelikli bölge (Far East, Asia, EU)
- Diğer 4 bölge haftalık tarama
- Arama sorguları örneği:
  - `"China HRC steel price weekly"` → Hammadde/Ürün
  - `"EU CBAM steel carbon 2026"` → Vergiler
  - `"India manufacturing PMI"` → Tüketim
  - `"Baltic Dry Index freight"` → Taşımacılık

**AI Parse:**
- Regex + keyword matching
- Keyword → Kategori mapping:
  - `scrap|ore|coal|coke|pig iron|DRI` → Hammadde
  - `HRC|CRC|HDG|slab|billet|rebar|PPGI|coil` → Çelik Ürünü
  - `PMI|manufacturing|construction|automotive|demand` → Tüketim
  - `freight|BDI|shipping|vessel|Capesize|Panamax` → Taşımacılık
  - `tariff|duty|CBAM|anti-dumping|safeguard|import tax` → Vergiler

**Kısıtlamalar:**
- Fiyat gecikmesi: ~1 hafta
- Bölge kapsamı: 3/7 günlük, 4/7 haftalık
- Haber kategorize doğruluğu: ~70-80%

---

### Faz 1 — Fiyat Kalitesi Upgrade (+$15/ay → Toplam $15/ay)

**Değişiklik:** `PRICE_PROVIDER=metals-api`

**Metals-API Professional Plan ($15/ay):**
- Saatlik fiyat güncellemesi
- Desteklenen semboller:
  - `USDSTEEL-HR` — LME Steel HRC FOB China
  - `USDSTEEL-RE` — LME Steel Rebar FOB Turkey
  - `USDSTEEL-SC` — LME Steel Scrap CFR Turkey
  - `USDIRON` — Iron Ore 62% Fe
  - `USDUS-HRC` — US Midwest HRC
- Historical data: 2019+
- Rate limit: Her 10 dakikada güncelleme

**Kazanım:** Gerçek zamana yakın fiyat, güvenilir API (scraper kırılma riski yok)

---

### Faz 2 — Akıllı Haberler Upgrade (+$5/ay → Toplam $20/ay)

**Değişiklik:** `AI_PARSER=claude-haiku`

**Claude Haiku Entegrasyonu:**
- Anthropic API (claude-haiku-4-5-20251001)
- Maliyet: ~$0.25/1M input token
- Günlük yük: ~35 haber × ~500 token = 17.5K token/gün ≈ $0.15/ay
- Toplam AI maliyeti: $5/ay bütçe (fazlasıyla yeterli)

**Yapacakları:**
1. Haber başlığı + snippet → 5 kategoriden birine sınıflandırma
2. Bölge tespiti (ülke adından)
3. Fiyat etkisi tahmini (bullish/bearish/neutral)
4. Haftalık özet rapor oluşturma
5. Trend algılama (aynı konuda artan haber sayısı)

**Kazanım:** %95+ doğruluk kategorize, otomatik özet, trend analizi

---

### Faz 3 — Tam Kapsam (+$15-20/ay → Toplam $35-40/ay)

**Değişiklik:** `NEWS_PROVIDER=brave-paid`

**Brave Search API Paid Plan:**
- Aylık ~3,000-4,000 arama
- 7 bölge × 5 kategori = 35 arama/gün = ~1,050/ay
- Ek deep-dive aramalar için ~2,000/ay bütçe
- Tüm bölgeler günlük kapsam

**Kazanım:** 7/7 bölge günlük, deep-dive arama imkanı

---

## 5. Tech Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| **Frontend** | Next.js 14 (App Router) | SSR + API routes + cron desteği |
| **Styling** | Tailwind CSS + shadcn/ui | Hızlı, responsive UI |
| **Grafikler** | Chart.js (react-chartjs-2) | Hafif, esnek fiyat grafikleri |
| **Storage** | JSON dosyalar (`/data`) | Free tier uyumlu, basit |
| **Deployment** | Vercel (free tier) | Otomatik deploy, cron jobs |
| **Scraping** | Cheerio (server-side) | Hafif HTML parsing |
| **API Client** | Fetch (native) | Ek bağımlılık yok |

### Vercel Free Tier Limitleri
- Cron jobs: Günde 1 kez (yeterli)
- Serverless functions: 100GB-hours/ay
- Bandwidth: 100GB/ay
- Build: 6,000 dakika/ay

---

## 6. Dosya Yapısı

```
steelhub/
├── src/
│   ├── providers/                 ← Provider Pattern (kilit mimari)
│   │   ├── interfaces.ts          ← PriceProvider, NewsProvider, AIParser interfaces
│   │   ├── factory.ts             ← .env'den provider seçimi
│   │   ├── price/
│   │   │   ├── scraping.ts        ← Faz 0: TradingEconomics scraper
│   │   │   └── metals-api.ts      ← Faz 1: Metals-API client
│   │   ├── news/
│   │   │   └── brave.ts           ← Brave Search API (free & paid aynı kod)
│   │   └── parser/
│   │       ├── regex.ts           ← Faz 0: Keyword matching
│   │       └── claude.ts          ← Faz 2: Claude Haiku AI parse
│   │
│   ├── config/
│   │   ├── regions.ts             ← 7 bölge tanımları + ülke listeleri
│   │   ├── categories.ts          ← 5 kategori tanımları + keyword'ler
│   │   ├── products.ts            ← Çelik ürün listesi (HRC, CRC, etc.)
│   │   └── sources.ts             ← Bölge × Kategori arama sorguları
│   │
│   ├── app/                       ← Next.js App Router
│   │   ├── page.tsx               ← Ana dashboard (overview)
│   │   ├── layout.tsx             ← Genel layout + navigation
│   │   ├── prices/
│   │   │   └── page.tsx           ← Fiyat tablosu + grafikler
│   │   ├── news/
│   │   │   └── page.tsx           ← Haber listesi + filtreler
│   │   ├── reports/
│   │   │   └── page.tsx           ← Haftalık rapor özeti
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── prices/route.ts    ← Fiyat güncelleme cron
│   │       │   └── news/route.ts      ← Haber tarama cron
│   │       ├── prices/route.ts        ← Fiyat API endpoint
│   │       └── news/route.ts          ← Haber API endpoint
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── PriceCard.tsx      ← Fiyat kartı (son + değişim %)
│   │   │   ├── CategoryTabs.tsx   ← 5 kategori tab navigasyonu
│   │   │   ├── RegionFilter.tsx   ← Bölge seçim dropdown
│   │   │   └── OverviewGrid.tsx   ← Ana sayfa grid layout
│   │   ├── charts/
│   │   │   ├── TrendChart.tsx     ← Fiyat trend line chart
│   │   │   └── CompareChart.tsx   ← Bölge karşılaştırma
│   │   ├── news/
│   │   │   ├── NewsCard.tsx       ← Tek haber kartı
│   │   │   └── NewsList.tsx       ← Filtrelenmiş haber listesi
│   │   └── common/
│   │       ├── Badge.tsx          ← Kategori/bölge badge'i
│   │       └── ChangeIndicator.tsx ← ▲▼ fiyat değişim göstergesi
│   │
│   ├── lib/
│   │   ├── storage.ts             ← JSON read/write helpers
│   │   ├── types.ts               ← TypeScript type tanımları
│   │   └── utils.ts               ← Tarih formatlama, yüzde hesap
│   │
│   └── hooks/
│       ├── usePrices.ts           ← Fiyat verisi hook
│       └── useNews.ts             ← Haber verisi hook
│
├── data/                          ← JSON storage (gitignore'd)
│   ├── prices/
│   │   ├── latest.json            ← Son fiyatlar
│   │   └── history/
│   │       ├── hrc.json           ← HRC fiyat geçmişi
│   │       ├── scrap.json
│   │       └── iron-ore.json
│   └── news/
│       ├── latest.json            ← Son haberler
│       └── archive/
│           └── 2026-03-14.json    ← Günlük arşiv
│
├── public/
├── .env.local                     ← Provider config (GİZLİ)
├── .env.example                   ← Örnek config
├── vercel.json                    ← Cron job tanımları
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 7. Veri Kaynakları Detayı

### Fiyat Kaynakları

| Veri | Faz 0 (Scraping) | Faz 1 (Metals-API) |
|------|-------------------|---------------------|
| HRC (China FOB) | TradingEconomics | `USDSTEEL-HR` |
| HRC (US Midwest) | TradingEconomics | `USDUS-HRC` |
| Rebar (Turkey FOB) | SteelBenchmarker | `USDSTEEL-RE` |
| Scrap (CFR Turkey) | TradingEconomics | `USDSTEEL-SC` |
| Iron Ore (62% Fe) | TradingEconomics | `USDIRON` |
| Coking Coal | TradingEconomics | Scraping fallback |
| BDI | TradingEconomics | Scraping fallback |

### Haber Arama Sorguları (Brave Search)

**Hammadde:**
- `"{region} steel scrap price {year}"` 
- `"{region} iron ore market weekly"`
- `"{region} coking coal price"`

**Çelik Ürünü:**
- `"{region} HRC steel price weekly"`
- `"{region} CRC HDG steel market"`
- `"{region} slab billet price"`

**Tüketim:**
- `"{region} manufacturing PMI {month}"`
- `"{region} steel demand construction automotive"`

**Taşımacılık:**
- `"Baltic Dry Index weekly"`
- `"{region} steel freight shipping rates"`

**Vergiler:**
- `"{region} steel import tariff anti-dumping {year}"`
- `"CBAM steel carbon border {year}"`

---

## 8. Sprint Planı (Faz 0 MVP)

### Sprint 1 — Temel Altyapı (2-3 gün)

- [ ] Next.js 14 proje kurulumu (App Router + Tailwind + shadcn/ui)
- [ ] TypeScript type tanımları (Region, Category, Product, PriceData, NewsItem)
- [ ] Provider interfaces + factory pattern
- [ ] Config dosyaları (regions, categories, products, sources)
- [ ] JSON storage helper (read/write)
- [ ] TradingEconomics scraper (PriceProvider implementasyonu)
- [ ] İlk veri çekme testi

### Sprint 2 — Dashboard UI (2-3 gün)

- [ ] Layout + navigation (5 kategori tab)
- [ ] PriceCard component (son fiyat + haftalık değişim %)
- [ ] RegionFilter component (7 bölge dropdown)
- [ ] OverviewGrid (ana sayfa — tüm kategoriler özet)
- [ ] TrendChart (Chart.js — son 3 ay fiyat grafiği)
- [ ] ChangeIndicator (▲ yeşil / ▼ kırmızı)
- [ ] Responsive tasarım (mobile uyumlu)

### Sprint 3 — Haber Sistemi (2 gün)

- [ ] Brave Search API client
- [ ] Regex-based kategorize (keyword → kategori mapping)
- [ ] Bölge tespit (ülke adından)
- [ ] NewsCard + NewsList components
- [ ] Kategori ve bölge filtresi
- [ ] Vercel cron job kurulumu (günlük haber çekme)
- [ ] Vercel cron job kurulumu (haftalık fiyat güncelleme)

### Sprint 4 — Rapor ve Polish (1-2 gün)

- [ ] Haftalık özet sayfası (en önemli değişimler + haberler)
- [ ] Basit PDF export (jsPDF veya html2pdf)
- [ ] Error handling + loading states
- [ ] Vercel deployment + domain ayarı
- [ ] README.md yazımı
- [ ] `.env.example` dosyası

**Toplam: ~8-10 gün**

---

## 9. Env Konfigürasyonu

```env
# .env.local

# === Provider Seçimi ===
PRICE_PROVIDER=scraping          # scraping | metals-api
NEWS_PROVIDER=brave-free         # brave-free | brave-paid  
AI_PARSER=regex                  # regex | claude-haiku

# === API Keys ===
BRAVE_API_KEY=                   # Brave Search API key
METALS_API_KEY=                  # Metals-API key (Faz 1)
ANTHROPIC_API_KEY=               # Claude API key (Faz 2)

# === Güncelleme Sıklığı ===
PRICE_CRON=weekly                # daily | weekly
NEWS_CRON=daily                  # daily | weekly
NEWS_DAILY_REGIONS=far-east,asia,eu   # Günlük taranan bölgeler
NEWS_WEEKLY_REGIONS=cis,africa,north-america,south-america

# === Cron Ayarları ===
CRON_SECRET=                     # Vercel cron auth token
```

---

## 10. Maliyet Özeti

| Faz | Açıklama | Aylık Maliyet | Kümülatif |
|-----|----------|--------------|-----------|
| Faz 0 | MVP: Scraping + Brave free + Regex | $0 | $0/ay |
| Faz 1 | +Metals-API (saatlik fiyat) | +$15 | $15/ay |
| Faz 2 | +Claude Haiku (AI parse) | +$5 | $20/ay |
| Faz 3 | +Brave paid (7 bölge günlük) | +$15-20 | $35-40/ay |

**Her faz geçişi = sadece `.env` değişikliği. Kod değişikliği yok.**

---

## 11. Riskler ve Mitigasyon

| Risk | Etki | Mitigasyon |
|------|------|------------|
| TradingEconomics scraper kırılması | Fiyat verisi durur | Metals-API'ye upgrade (Faz 1) |
| Brave free kredi limiti aşımı | Haber tarama durur | Öncelikli bölgelere odaklan |
| Vercel free tier cron limiti | Günlük güncelleme yapılamaz | Haftalık cron'a düşür |
| Çelik fiyat kaynağı bölgesel eksiklik | Bazı bölgeler boş | Brave Search ile haber bazlı fiyat tahmini |

---

## 12. Gelecek Özellikler (Backlog)

- [ ] Fiyat alert sistemi (e-posta veya Telegram bildirim)
- [ ] Bölgeler arası spread analizi (EU HRC vs China HRC)
- [ ] Maliyet hesaplama aracı (hammadde → ürün maliyet simülasyonu)
- [ ] Çolakoğlu entegrasyonu (HRC lead gen platform ile bağlantı)
- [ ] Tarihsel veri import (CSV upload)
- [ ] Çoklu dil desteği (TR/EN)
- [ ] API endpoint (dış uygulamalar için veri paylaşımı)

---

*Bu döküman Anti-Gravity Studio tarafından SteelHub projesi için hazırlanmıştır.*  
*Son güncelleme: 14 Mart 2026*
