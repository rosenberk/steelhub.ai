# SteelHub — Design Document v1.1

**Proje:** SteelHub — Steel Industry Intelligence Dashboard  
**Owner:** Berkay / Anti-Gravity Studio  
**Tarih:** 14 Mart 2026  
**Versiyon:** v1.1 (Revize — kritik geri bildirimler entegre edildi)  
**Durum:** Onay bekliyor

---

## Değişiklik Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| v1.0 | 14.03.2026 | İlk tasarım |
| v1.1 | 14.03.2026 | Kritik revizyon: Ephemeral FS sorunu çözüldü (Supabase), scraping fallback eklendi, haber noise azaltma, CIS önceliği yükseltildi, sentiment analizi eklendi, auth katmanı eklendi, birim standardizasyonu |

---

## 1. Proje Özeti

SteelHub, çelik endüstrisi için bölgesel bazda fiyat takibi, haber izleme ve raporlama yapan web tabanlı bir internal intelligence tool'dur. 5 ana kategori ve 7 bölge kapsamında çelik piyasalarını izler.

**Kullanım:** Internal (Anti-Gravity Studio)  
**Deployment:** Vercel (free tier)  
**Storage:** Supabase (free tier — 500MB Postgres)  
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

| Bölge | Ülkeler | Öncelik | Gerekçe |
|-------|---------|---------|---------|
| **Far East** | Çin, Vietnam, Japonya, Kore, Malezya | 🔴 Yüksek | Global fiyat belirleyici, en büyük üretici |
| **Asia** | Hindistan, Türkiye, Orta Doğu | 🔴 Yüksek | Türkiye için doğrudan pazar |
| **CIS** | Rusya, Ukrayna | 🔴 Yüksek | ⚠️ v1.0'da "Orta" idi → Türkiye'ye lojistik yakınlık ve hammadde tedarik zinciri nedeniyle "Yüksek" olarak revize edildi |
| **EU** | Tüm Avrupa ülkeleri | 🔴 Yüksek | CBAM, en büyük ihracat pazarı |
| **Africa** | Kuzey Afrika, Diğer | 🟡 Orta | Gelişen pazar, Türkiye'den ihracat |
| **North America** | ABD, Kanada, Meksika | 🟡 Orta | US HRC benchmark, Section 232 |
| **South America** | Brezilya, Şili | 🟢 Düşük | Sınırlı doğrudan etki |

### Bölge Bazlı Kaynak Stratejisi

- **Far East:** China HRC FOB, SHFE futures, Mysteel haberleri
- **Asia:** Turkey Rebar FOB, Scrap CFR Turkey, India Sponge Iron
- **CIS:** Russia HRC FOB Black Sea, Ukraine billet prices, CIS scrap export
- **EU:** NW EU HRC, Platts/Argus benchmarks, CBAM güncellemeleri
- **Africa:** N.Africa import prices, Egypt rebar, Algeria steel demand
- **North America:** US Midwest HRC, Nucor CSP, CME futures, Section 232
- **South America:** Brazil HRC domestic, Chile import

---

## 4. Kritik Mimari Kararlar (v1.1 Revizyonları)

### A. Storage: Supabase (Ephemeral FS Sorunu Çözümü)

**Problem (v1.0):** Vercel serverless ortamında `/data` klasörüne JSON yazma planlanmıştı. Vercel'in ephemeral filesystem'i bunu imkansız kılar — function soğuduğunda veya deploy olduğunda tüm veri silinir.

**Çözüm:** Supabase Free Tier (Postgres)

| Özellik | Limit |
|---------|-------|
| Database storage | 500 MB |
| Bandwidth | 5 GB egress |
| API requests | Sınırsız |
| Maliyet | $0/ay |
| Pause policy | 1 hafta inaktiflik sonrası pause (cron günlük çalıştığı için sorun olmaz) |

**Veri boyutu tahmini:**
- Fiyat verileri: ~50 ürün × 7 bölge × 52 hafta = ~18K satır/yıl (~2 MB)
- Haber verileri: ~35 haber/gün × 365 gün = ~12.8K satır/yıl (~5 MB)
- Toplam yıllık: ~7 MB → 500 MB limitinin %1.4'ü

**DB Şeması:**

```sql
-- Fiyat verileri
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product VARCHAR(20) NOT NULL,     -- 'HRC', 'CRC', 'Scrap', etc.
  region VARCHAR(20) NOT NULL,      -- 'far-east', 'asia', etc.
  country VARCHAR(30),              -- 'China', 'Turkey', etc.
  price DECIMAL(10,2) NOT NULL,     -- USD/ton (standart birim)
  currency VARCHAR(3) DEFAULT 'USD',
  unit VARCHAR(10) DEFAULT 'MT',    -- Metric Ton
  source VARCHAR(50),               -- 'tradingeconomics', 'metals-api'
  fetched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product, region, country, fetched_at::date)
);

-- Haber verileri
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  source VARCHAR(100),
  category VARCHAR(20) NOT NULL,    -- 5 kategoriden biri
  region VARCHAR(20) NOT NULL,
  country VARCHAR(30),
  sentiment DECIMAL(3,2),           -- -1.00 ile +1.00 arası
  confidence DECIMAL(3,2),          -- Kategorize güvenilirlik skoru
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Son başarılı veri (fallback cache)
CREATE TABLE last_successful (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(20) NOT NULL,   -- 'price' veya 'news'
  region VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_type, region)
);

-- Fiyat birim dönüşüm tablosu
CREATE TABLE unit_conversions (
  id SERIAL PRIMARY KEY,
  from_unit VARCHAR(10),
  to_unit VARCHAR(10),
  factor DECIMAL(10,6),
  notes TEXT
);
```

**Storage Provider Pattern (ileride upgrade):**

```typescript
interface StorageProvider {
  savePrices(data: PriceData[]): Promise<void>
  getPrices(filters: PriceFilter): Promise<PriceData[]>
  saveNews(items: NewsItem[]): Promise<void>
  getNews(filters: NewsFilter): Promise<NewsItem[]>
  getLastSuccessful(type: string, region: string): Promise<any>
}

// Faz 0: SupabaseStorageProvider (free)
// Gelecek: Eğer Supabase yetmezse → Neon DB veya Supabase Pro
```

### B. Scraping Fallback Mekanizması

**Problem (v1.0):** Scraper kırıldığında dashboard tamamen boş görünür.

**Çözüm: 3 Katmanlı Fallback**

```
1. Birincil kaynak çalışıyor mu?
   ├─ EVET → Veriyi al, DB'ye yaz, last_successful güncelle
   └─ HAYIR → Fallback #1: Alternatif kaynak dene
                ├─ EVET → Veriyi al, DB'ye yaz
                └─ HAYIR → Fallback #2: last_successful tablosundan göster
                            + UI'da "⚠ Stale data" uyarısı göster
                            + Veri yaşını göster: "Son güncelleme: 3 gün önce"
```

**Alternatif kaynak mapping:**

| Birincil | Fallback #1 | Fallback #2 |
|----------|-------------|-------------|
| TradingEconomics (scraping) | SteelBenchmarker | Last successful (DB) |
| SteelBenchmarker | Google search via Brave | Last successful (DB) |
| Brave Search (haberler) | RSS feeds (SteelOrbis, Kallanish) | Last successful (DB) |

**UI Stale Data Gösterimi:**

```typescript
interface PriceCardProps {
  price: number
  change: number
  isStale: boolean        // true ise uyarı göster
  lastUpdated: Date       // "3 gün önce" formatında
  dataSource: string      // "TradingEconomics" veya "Fallback: SteelBenchmarker"
}
```

### C. Haber Sınıflandırma Noise Azaltma

**Problem (v1.0):** Regex ile "Iron Ore" geçen her haber "Hammadde" olarak sınıflandırılır — Minecraft haberleri bile.

**Çözüm: 3 Katmanlı Filtreleme**

**Katman 1 — Brave Search Query Optimization:**
Sorgulara domain ve context kısıtlaması eklenir.

```typescript
// YANLIŞ (v1.0)
"China iron ore price"

// DOĞRU (v1.1) — steel/metal context zorunlu
"China iron ore steel price site:reuters.com OR site:argusmedia.com OR site:platts.com OR site:steelorbis.com OR site:kallanish.com OR site:mysteel.net"
```

**Güvenilir kaynak whitelist:**

```typescript
const TRUSTED_DOMAINS = [
  // Tier 1: Sektörel kaynaklar
  'argusmedia.com', 'spglobal.com', 'platts.com',
  'steelorbis.com', 'kallanish.com', 'mysteel.net',
  'bigmint.co', 'steelonthenet.com', 'worldsteel.org',
  'fastmarkets.com', 'crugroup.com',
  // Tier 2: Finans/haber
  'reuters.com', 'bloomberg.com', 'ft.com',
  'tradingeconomics.com', 'investing.com',
  // Tier 3: Bölgesel
  'steelmint.com', 'metalexpert.com',
  'nucor.com', 'worldsteelprices.com'
];
```

**Katman 2 — Negatif keyword filtresi:**

```typescript
const NOISE_KEYWORDS = [
  'minecraft', 'game', 'recipe', 'movie', 'song',
  'stainless steel watch', 'steel guitar', 'steel wool',
  'man of steel', 'steel curtain', 'nerves of steel',
  'real steel', 'steel magnolias', 'steel drum'
];

function isNoise(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase();
  return NOISE_KEYWORDS.some(kw => text.includes(kw));
}
```

**Katman 3 — Confidence Score:**

```typescript
interface ClassificationResult {
  category: Category
  confidence: number      // 0.0 - 1.0
  isRelevant: boolean     // confidence > 0.5 ise true
}

// Faz 0: Keyword hit count → confidence
// keyword hit 1 = 0.4, hit 2 = 0.7, hit 3+ = 0.9
// + domain tier bonus: Tier 1 = +0.2, Tier 2 = +0.1

// Faz 2: Claude Haiku → doğal dil confidence
```

**UI'da confidence gösterimi:** Düşük güvenilirlik haberlerinde soluk renk + "?" ikonu.

### D. Fiyat Standardizasyonu

**Problem:** Farklı kaynaklar farklı birimler kullanır ($/ton, $/MT, CNY/ton, €/ton, $/NT).

**Çözüm: Tüm fiyatlar USD/MT (Metrik Ton) standardında saklanır ve gösterilir.**

```typescript
interface PriceNormalizer {
  normalize(rawPrice: number, fromUnit: string, fromCurrency: string): Promise<NormalizedPrice>
}

interface NormalizedPrice {
  value: number           // USD/MT
  originalValue: number   // Orijinal değer
  originalUnit: string    // Orijinal birim
  originalCurrency: string
  conversionRate: number  // Dönüşüm kuru
  conversionDate: Date
}

// Birim dönüşümleri
const UNIT_FACTORS: Record<string, number> = {
  'MT': 1.0,              // Metrik Ton (1000 kg) — standart
  'NT': 0.9072,           // Net Ton (907.2 kg) — US kısa ton
  'LT': 1.0160,           // Long Ton (1016 kg) — UK uzun ton
  'GT': 1.0,              // Gross Ton = Metrik Ton (çelikte)
  'KG': 0.001,            // Kilogram
};
```

**Grafiklerde gösterim:**
- Y ekseni: Her zaman "USD/MT"
- Tooltip'te orijinal fiyat ve kaynak bilgisi
- Döviz kurları: ExchangeRate-API (ücretsiz, günlük güncelleme)

### E. AI Parser: Sentiment Analizi (Faz 2)

**v1.0'da:** AI sadece kategorize ediyordu.
**v1.1'de:** Sentiment skorlama eklendi.

```typescript
// Faz 2: Claude Haiku prompt
const PARSE_PROMPT = `
Analyze this steel industry news item:
Title: {title}
Snippet: {snippet}

Respond in JSON only:
{
  "category": "hammadde|urun|tuketim|tasima|vergi",
  "region": "far-east|asia|cis|eu|africa|north-america|south-america",
  "country": "specific country or null",
  "sentiment": -1.0 to +1.0 (negative=bearish for steel prices, positive=bullish),
  "confidence": 0.0 to 1.0,
  "priceImpact": "none|low|medium|high",
  "summary": "max 1 sentence Turkish summary"
}
`;
```

**Sentiment → Dashboard Gösterimi:**
- 🔴 < -0.3: Bearish (fiyat düşüş beklentisi)
- 🟡 -0.3 ile +0.3: Nötr
- 🟢 > +0.3: Bullish (fiyat artış beklentisi)
- Haftalık sentiment ortalaması → trend göstergesi

### F. Simple Auth (Internal Tool Güvenliği)

**Problem:** Internal tool olsa bile veriler herkese açık olmamalı.

**Çözüm: Basit middleware-based auth (Faz 0 MVP)**

```typescript
// middleware.ts — Next.js Middleware
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const authCookie = request.cookies.get('steelhub-auth')

  if (!authCookie || authCookie.value !== process.env.AUTH_SECRET) {
    // Basit pin/şifre sayfasına yönlendir
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|api/cron|_next|favicon).*)']
}
```

- `/login` sayfasında tek bir PIN girişi (env'den: `AUTH_PIN=xxxx`)
- Cron endpoint'leri `CRON_SECRET` header ile korunur (Vercel otomatik)
- İleride Supabase Auth'a upgrade edilebilir

---

## 5. Progressive Enhancement — Faz Planı

### Mimari Prensip: Provider Pattern

Her veri kaynağı bir interface arkasında. Upgrade = `.env` değişikliği, kod değişikliği yok.

```typescript
// providers/interfaces.ts

interface PriceProvider {
  getPrice(product: SteelProduct, region: Region): Promise<PriceData>
  getHistory(product: SteelProduct, region: Region, days: number): Promise<PriceData[]>
  isAvailable(): Promise<boolean>  // Health check
}

interface NewsProvider {
  searchNews(category: Category, region: Region, options?: SearchOptions): Promise<NewsItem[]>
}

interface AIParser {
  categorize(headline: string, snippet: string): Promise<ClassificationResult>
  analyzeSentiment(text: string): Promise<SentimentResult>     // v1.1 eklendi
  summarize(articles: NewsItem[]): Promise<string>
}

interface StorageProvider {
  savePrices(data: PriceData[]): Promise<void>
  getPrices(filters: PriceFilter): Promise<PriceData[]>
  saveNews(items: NewsItem[]): Promise<void>
  getNews(filters: NewsFilter): Promise<NewsItem[]>
  getLastSuccessful(type: string, region: string): Promise<any>
  saveLastSuccessful(type: string, region: string, data: any): Promise<void>
}

// .env.local
PRICE_PROVIDER=scraping          // scraping | metals-api
NEWS_PROVIDER=brave-free         // brave-free | brave-paid
AI_PARSER=regex                  // regex | claude-haiku
STORAGE_PROVIDER=supabase        // supabase (default)
```

### Faz 0 — MVP Kurulum ($0/ay)

**Storage:** Supabase Free (Postgres, 500 MB)
**Fiyatlar:** TradingEconomics scraping + SteelBenchmarker fallback
**Haberler:** Brave Search API ($5 ücretsiz kredi ≈ 1,000 arama/ay)
**AI Parse:** Regex + keyword + confidence score + noise filter
**Auth:** PIN-based middleware
**Bölge kapsamı:** 4 bölge günlük (Far East, Asia, CIS, EU), 3 bölge haftalık

**Faz 0 kısıtlamaları:**
- Fiyat gecikmesi: ~1 hafta (scraping periyodu)
- Haber kategorize doğruluğu: ~75-85% (regex + noise filter)
- Sentiment: Yok (Faz 2'de gelecek)

### Faz 1 — Fiyat Kalitesi (+$15/ay → Toplam $15/ay)

**Değişiklik:** `PRICE_PROVIDER=metals-api`

**Metals-API Professional ($15/ay):**
- Saatlik fiyat güncellemesi
- `USDSTEEL-HR` — LME Steel HRC FOB China
- `USDSTEEL-RE` — LME Steel Rebar FOB Turkey
- `USDSTEEL-SC` — LME Steel Scrap CFR Turkey
- `USDIRON` — Iron Ore 62% Fe
- `USDUS-HRC` — US Midwest HRC
- Historical data: 2019+

⚠️ **Tavsiye:** Faz 1'e Sprint 2 sonunda geçiş yapın. 1 haftalık gecikme intelligence değerini ciddi düşürür — çelik piyasası günde %3-5 oynayabilir.

### Faz 2 — Akıllı Haberler + Sentiment (+$5/ay → Toplam $20/ay)

**Değişiklik:** `AI_PARSER=claude-haiku`

**Claude Haiku:**
- Kategorize doğruluğu: %95+
- Sentiment skoru: -1.0 ile +1.0
- Fiyat etki tahmini: none/low/medium/high
- 1 cümlelik Türkçe özet
- Maliyet: ~$0.15/ay (17.5K token/gün)

### Faz 3 — Tam Kapsam (+$15-20/ay → Toplam $35-40/ay)

**Değişiklik:** `NEWS_PROVIDER=brave-paid`

- 7 bölge günlük (35+ query/gün)
- Deep-dive arama kapasitesi
- Tüm bölgeler eşit kapsam

---

## 6. Tech Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| **Frontend** | Next.js 14 (App Router) | SSR + API routes + cron |
| **Styling** | Tailwind CSS + shadcn/ui | Hızlı, responsive |
| **Grafikler** | Chart.js (react-chartjs-2) | Hafif, esnek |
| **Database** | Supabase (Postgres, free) | ⚠️ v1.0'daki JSON yerine — ephemeral FS sorunu çözüldü |
| **Deployment** | Vercel (free tier) | Otomatik deploy, cron |
| **Scraping** | Cheerio (server-side) | Hafif HTML parsing |
| **API Client** | Fetch (native) | Ek bağımlılık yok |
| **Auth** | Custom middleware (PIN) | Basit, yeterli |
| **Döviz Kuru** | ExchangeRate-API (free) | Birim standardizasyonu |

---

## 7. Dosya Yapısı

```
steelhub/
├── src/
│   ├── providers/                     ← Provider Pattern
│   │   ├── interfaces.ts              ← Tüm provider interface'leri
│   │   ├── factory.ts                 ← .env'den provider seçimi
│   │   ├── price/
│   │   │   ├── scraping.ts            ← Faz 0: TradingEconomics + fallback
│   │   │   └── metals-api.ts          ← Faz 1: Metals-API client
│   │   ├── news/
│   │   │   └── brave.ts              ← Brave Search (free & paid aynı kod)
│   │   ├── parser/
│   │   │   ├── regex.ts              ← Faz 0: Keyword + noise filter + confidence
│   │   │   └── claude.ts             ← Faz 2: Claude Haiku + sentiment
│   │   └── storage/
│   │       └── supabase.ts           ← ⚠️ v1.1: Supabase Postgres client
│   │
│   ├── config/
│   │   ├── regions.ts                ← 7 bölge tanımları + ülke listeleri
│   │   ├── categories.ts             ← 5 kategori + keyword mapping
│   │   ├── products.ts               ← Çelik ürün listesi
│   │   ├── sources.ts                ← Bölge × Kategori arama sorguları
│   │   ├── trusted-domains.ts        ← ⚠️ v1.1: Güvenilir kaynak whitelist
│   │   └── noise-keywords.ts         ← ⚠️ v1.1: Negatif keyword filtresi
│   │
│   ├── lib/
│   │   ├── types.ts                  ← TypeScript type tanımları
│   │   ├── utils.ts                  ← Tarih formatlama, yüzde hesap
│   │   ├── normalizer.ts             ← ⚠️ v1.1: Fiyat birim standardizasyonu
│   │   ├── fallback.ts               ← ⚠️ v1.1: 3 katmanlı fallback manager
│   │   └── supabase.ts               ← Supabase client init
│   │
│   ├── app/
│   │   ├── page.tsx                  ← Ana dashboard (overview)
│   │   ├── layout.tsx                ← Layout + navigation
│   │   ├── login/
│   │   │   └── page.tsx              ← ⚠️ v1.1: PIN giriş sayfası
│   │   ├── prices/
│   │   │   └── page.tsx              ← Fiyat tablosu + grafikler
│   │   ├── news/
│   │   │   └── page.tsx              ← Haber listesi + filtreler
│   │   ├── reports/
│   │   │   └── page.tsx              ← Haftalık rapor özeti
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── prices/route.ts   ← Fiyat güncelleme cron
│   │       │   └── news/route.ts     ← Haber tarama cron
│   │       ├── prices/route.ts       ← Fiyat API endpoint
│   │       └── news/route.ts         ← Haber API endpoint
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── PriceCard.tsx         ← Fiyat kartı (son + değişim + stale uyarı)
│   │   │   ├── CategoryTabs.tsx      ← 5 kategori tab
│   │   │   ├── RegionFilter.tsx      ← Bölge seçim dropdown
│   │   │   ├── OverviewGrid.tsx      ← Ana sayfa grid
│   │   │   └── SentimentBadge.tsx    ← ⚠️ v1.1: 🔴🟡🟢 sentiment göstergesi
│   │   ├── charts/
│   │   │   ├── TrendChart.tsx        ← Fiyat trend (Y ekseni: USD/MT)
│   │   │   └── CompareChart.tsx      ← Bölge karşılaştırma
│   │   ├── news/
│   │   │   ├── NewsCard.tsx          ← Haber kartı + confidence badge
│   │   │   └── NewsList.tsx          ← Filtrelenmiş haber listesi
│   │   └── common/
│   │       ├── Badge.tsx             ← Kategori/bölge badge
│   │       ├── ChangeIndicator.tsx   ← ▲▼ fiyat değişim
│   │       └── StaleWarning.tsx      ← ⚠️ v1.1: "Eski veri" uyarı banner
│   │
│   ├── hooks/
│   │   ├── usePrices.ts
│   │   └── useNews.ts
│   │
│   └── middleware.ts                 ← ⚠️ v1.1: PIN auth middleware
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    ← ⚠️ v1.1: DB şeması
│
├── public/
├── .env.local                        ← Provider config + auth (GİZLİ)
├── .env.example
├── vercel.json                       ← Cron job tanımları
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. Veri Kaynakları Detayı

### Fiyat Kaynakları

| Veri | Faz 0 (Scraping) | Faz 1 (Metals-API) | Standart Birim |
|------|-------------------|---------------------|----------------|
| HRC (China FOB) | TradingEconomics | `USDSTEEL-HR` | USD/MT |
| HRC (US Midwest) | TradingEconomics | `USDUS-HRC` | USD/NT → USD/MT |
| Rebar (Turkey FOB) | SteelBenchmarker | `USDSTEEL-RE` | USD/MT |
| Scrap (CFR Turkey) | TradingEconomics | `USDSTEEL-SC` | USD/MT |
| Iron Ore (62% Fe) | TradingEconomics | `USDIRON` | USD/MT (dry) |
| Coking Coal | TradingEconomics | Scraping fallback | USD/MT |
| BDI | TradingEconomics | Scraping fallback | Index points |

⚠️ **US HRC dikkat:** US fiyatları genellikle $/NT (Net Ton = Short Ton = 907.2 kg). Gösterimde $/MT'ye çevrilmeli. `NT → MT çarpanı: × 1.1023`

### Haber Arama Sorguları (v1.1 — Optimize)

**Genel format:** `"{keyword}" steel {context} site:{trusted_domain}`

**Hammadde örnekleri:**
- `"steel scrap" price weekly site:argusmedia.com OR site:steelorbis.com`
- `"iron ore" 62% price site:reuters.com OR site:tradingeconomics.com`
- `"coking coal" metallurgical price site:platts.com OR site:argusmedia.com`

**Çelik Ürünü örnekleri:**
- `"HRC" "hot rolled coil" price {region} site:steelorbis.com OR site:kallanish.com`
- `"CRC" OR "cold rolled" steel price site:fastmarkets.com OR site:argusmedia.com`

**Tüketim örnekleri:**
- `"manufacturing PMI" {country} site:reuters.com OR site:tradingeconomics.com`
- `"steel demand" {region} construction automotive`

**Taşımacılık örnekleri:**
- `"Baltic Dry Index" site:tradingeconomics.com OR site:reuters.com`
- `"steel freight" {region} shipping rates`

**Vergiler örnekleri:**
- `"CBAM" steel carbon border 2026 site:reuters.com OR site:ft.com`
- `"anti-dumping" steel {region} site:steelorbis.com OR site:worldsteel.org`

---

## 9. Revize Sprint Planı

### Sprint 1 — Temel Altyapı + Storage (3 gün)

- [ ] Next.js 14 proje kurulumu (App Router + Tailwind + shadcn/ui)
- [ ] **⚠️ Supabase proje oluşturma + migration (DB şeması)**
- [ ] **⚠️ Supabase client helper (`lib/supabase.ts`)**
- [ ] TypeScript type tanımları (Region, Category, Product, PriceData, NewsItem)
- [ ] Provider interfaces + factory pattern
- [ ] Config dosyaları (regions, categories, products, sources, trusted-domains, noise-keywords)
- [ ] **⚠️ Fiyat normalizer (birim dönüşüm: NT→MT, CNY→USD)**
- [ ] TradingEconomics scraper (PriceProvider implementasyonu)
- [ ] **⚠️ Fallback manager (3 katmanlı)**
- [ ] **⚠️ PIN-based auth middleware + login sayfası**
- [ ] İlk veri çekme testi → Supabase'e yazma

### Sprint 2 — Dashboard UI + Faz 1 Geçiş (3 gün)

- [ ] Layout + navigation (5 kategori tab)
- [ ] PriceCard component (son fiyat + değişim + **stale warning**)
- [ ] RegionFilter component (7 bölge dropdown)
- [ ] OverviewGrid (ana sayfa — tüm kategoriler özet)
- [ ] TrendChart (Chart.js — **Y ekseni: USD/MT standart**)
- [ ] ChangeIndicator (▲ yeşil / ▼ kırmızı)
- [ ] Responsive tasarım (mobile uyumlu)
- [ ] **⚠️ Metals-API provider implementasyonu (Faz 1 hazırlığı)**
- [ ] **⚠️ Tavsiye: Sprint 2 sonunda `PRICE_PROVIDER=metals-api` geçişi**

### Sprint 3 — Haber Sistemi (2-3 gün)

- [ ] Brave Search API client
- [ ] **⚠️ Optimized search queries (trusted domain + context)**
- [ ] **⚠️ Noise filter (negatif keyword listesi)**
- [ ] **⚠️ Confidence score hesaplama**
- [ ] Regex-based kategorize + confidence
- [ ] Bölge tespiti (ülke adından)
- [ ] NewsCard + NewsList components (**confidence badge**)
- [ ] Kategori ve bölge filtresi
- [ ] Vercel cron job kurulumu (günlük haber + fiyat)
- [ ] **⚠️ last_successful fallback entegrasyonu**

### Sprint 4 — Rapor ve Polish (2 gün)

- [ ] Haftalık özet sayfası (en önemli değişimler + haberler)
- [ ] **⚠️ Sentiment göstergesi placeholder (Faz 2'de aktif)**
- [ ] Basit PDF export (html2pdf veya jsPDF)
- [ ] Error handling + loading states + **stale data UI**
- [ ] Vercel deployment + domain ayarı
- [ ] README.md yazımı
- [ ] `.env.example` dosyası
- [ ] **⚠️ Smoke test: Scraper kırılma simülasyonu → fallback çalışıyor mu?**

**Toplam: ~10-12 gün**

---

## 10. Env Konfigürasyonu

```env
# .env.local

# === Provider Seçimi ===
PRICE_PROVIDER=scraping              # scraping | metals-api
NEWS_PROVIDER=brave-free             # brave-free | brave-paid
AI_PARSER=regex                      # regex | claude-haiku
STORAGE_PROVIDER=supabase            # supabase

# === Database ===
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=           # Supabase service role key (server-side only)

# === API Keys ===
BRAVE_API_KEY=                       # Brave Search API key
METALS_API_KEY=                      # Metals-API key (Faz 1)
ANTHROPIC_API_KEY=                   # Claude API key (Faz 2)

# === Auth ===
AUTH_PIN=                            # Dashboard giriş PIN'i
AUTH_SECRET=                         # Cookie secret (rastgele uzun string)

# === Güncelleme Ayarları ===
PRICE_CRON=weekly                    # daily | weekly
NEWS_CRON=daily                      # daily | weekly
NEWS_DAILY_REGIONS=far-east,asia,cis,eu        # v1.1: CIS eklendi
NEWS_WEEKLY_REGIONS=africa,north-america,south-america

# === Cron ===
CRON_SECRET=                         # Vercel cron auth token

# === Döviz ===
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

---

## 11. Maliyet Özeti

| Faz | Açıklama | Aylık Maliyet | Kümülatif |
|-----|----------|--------------|-----------|
| Faz 0 | MVP: Supabase + Scraping + Brave free + Regex + Auth | **$0** | $0/ay |
| Faz 1 | +Metals-API (saatlik fiyat) — Sprint 2 sonunda aktif | +$15 | $15/ay |
| Faz 2 | +Claude Haiku (AI parse + sentiment) | +$5 | $20/ay |
| Faz 3 | +Brave paid (7 bölge günlük) | +$15-20 | $35-40/ay |

**Her faz geçişi = sadece `.env` değişikliği.**

---

## 12. Riskler ve Mitigasyon (v1.1 Güncellenmiş)

| Risk | Etki | Mitigasyon | Durum |
|------|------|------------|-------|
| ~~Ephemeral FS~~ | ~~Veri kaybı~~ | ~~JSON dosyalar~~ | ✅ **Çözüldü: Supabase Postgres** |
| TradingEconomics scraper kırılması | Fiyat verisi durur | 3 katmanlı fallback + stale data gösterimi | ✅ v1.1 |
| Haber noise (alakasız sonuçlar) | Dashboard güvenilirliği düşer | Trusted domains + noise filter + confidence score | ✅ v1.1 |
| Fiyat birim karmaşası | Yanlış karşılaştırma | USD/MT standardizasyonu + normalizer | ✅ v1.1 |
| CIS bölge önceliği düşük | Türkiye analizi eksik kalır | Yüksek önceliğe çıkarıldı | ✅ v1.1 |
| Dashboard herkese açık | Veri güvenliği | PIN-based auth middleware | ✅ v1.1 |
| Brave free kredi aşımı | Haber tarama durur | Öncelikli 4 bölge + haftalık diğerleri | Kabul |
| Supabase 1 hafta inaktiflik | DB pause olur | Günlük cron job DB'yi canlı tutar | Kabul |
| Vercel Hobby cron limiti | 1 cron/gün | Tek cron'da hem fiyat hem haber çek | Kabul |

---

## 13. Gelecek Özellikler (Backlog)

- [ ] Fiyat alert sistemi (Telegram bot bildirim)
- [ ] Bölgeler arası spread analizi (EU HRC vs China HRC farkı)
- [ ] Maliyet hesaplama aracı (hammadde → ürün maliyet simülasyonu)
- [ ] Çolakoğlu HRC platform entegrasyonu
- [ ] Tarihsel veri import (CSV upload)
- [ ] Çoklu dil desteği (TR/EN toggle)
- [ ] API endpoint (dış uygulamalar için veri paylaşımı)
- [ ] Supabase Auth'a upgrade (PIN yerine)
- [ ] Haftalık otomatik rapor e-posta

---

*Bu döküman Anti-Gravity Studio tarafından SteelHub projesi için hazırlanmıştır.*  
*Son güncelleme: 14 Mart 2026 — v1.1 (Kritik Revizyon)*
