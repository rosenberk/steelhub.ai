# SteelHub — Design Document v1.2

**Proje:** SteelHub — Steel Industry Intelligence Dashboard  
**Owner:** Berkay / Anti-Gravity Studio  
**Tarih:** 14 Mart 2026  
**Versiyon:** v1.2 (Final — operasyonel riskler + teknik checklist entegre)  
**Durum:** Onay bekliyor

---

## Değişiklik Geçmişi

| Versiyon | Tarih | Değişiklik |
|----------|-------|------------|
| v1.0 | 14.03.2026 | İlk tasarım |
| v1.1 | 14.03.2026 | Ephemeral FS → Supabase, scraping fallback, noise filter, CIS önceliği, sentiment, auth, birim standardizasyonu |
| v1.2 | 14.03.2026 | Kalan operasyonel riskler kapatıldı: çoklu fallback kırılma, niş kaynak keşfi, brute-force koruması, Piyasa Duyarlılık Endeksi, Supabase RLS, rate limiting, ExchangeRate-API uyum, CIS özel kaynakları, Sprint 0 pre-checklist |

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
| **Far East** | Çin, Vietnam, Japonya, Kore, Malezya | 🔴 Yüksek | Global fiyat belirleyici |
| **Asia** | Hindistan, Türkiye, Orta Doğu | 🔴 Yüksek | Doğrudan pazar |
| **CIS** | Rusya, Ukrayna | 🔴 Yüksek | Lojistik yakınlık + hammadde tedarik |
| **EU** | Tüm Avrupa ülkeleri | 🔴 Yüksek | CBAM + ihracat pazarı |
| **Africa** | Kuzey Afrika, Diğer | 🟡 Orta | Gelişen pazar |
| **North America** | ABD, Kanada, Meksika | 🟡 Orta | US benchmark, Section 232 |
| **South America** | Brezilya, Şili | 🟢 Düşük | Sınırlı doğrudan etki |

### CIS Bölgesi Özel Kaynaklar (v1.2)

CIS bölgesinde savaş durumu nedeniyle veri parçalıdır. Özel kaynak stratejisi:

```typescript
const CIS_SOURCES = {
  primary: [
    'metalexpert.com',     // Rusya/Ukrayna uzman kaynağı
    'mysteel.net',         // CIS desk verileri
    'metalbulletin.com',   // CIS fiyat referansları
  ],
  secondary: [
    'gmk.center',          // Ukrayna çelik merkezi (GMK Center)
    'metalinfo.ru',        // Rusya metal haberleri
    'steelorbis.com',      // CIS bölge filtresi
  ],
  // Brave sorgularında CIS için özel keyword'ler
  searchKeywords: [
    'CIS steel export Black Sea',
    'Russia HRC FOB',
    'Ukraine billet export',
    'CIS scrap market',
    'Black Sea steel freight'
  ]
};
```

---

## 4. Kritik Mimari Kararlar

### A. Storage: Supabase Postgres

**DB Şeması:**

```sql
-- Fiyat verileri
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  country VARCHAR(30),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  unit VARCHAR(10) DEFAULT 'MT',
  source VARCHAR(50),
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
  category VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  country VARCHAR(30),
  sentiment DECIMAL(3,2),
  confidence DECIMAL(3,2),
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Son başarılı veri (fallback cache)
CREATE TABLE last_successful (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_type, region)
);

-- v1.2: Piyasa Duyarlılık Endeksi (haftalık snapshot)
CREATE TABLE sentiment_index (
  id SERIAL PRIMARY KEY,
  region VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL,
  week_start DATE NOT NULL,
  avg_sentiment DECIMAL(3,2),           -- Haftalık ortalama sentiment
  news_count INTEGER,                   -- Haber sayısı
  price_change_pct DECIMAL(5,2),        -- Aynı hafta fiyat değişimi %
  correlation_score DECIMAL(3,2),       -- Sentiment vs fiyat korelasyonu
  divergence_flag BOOLEAN DEFAULT FALSE,-- Sentiment/fiyat ters gidiyorsa TRUE
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(region, category, week_start)
);

-- v1.2: Auth - brute force koruması
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- İndeksler (RLS performansı için)
CREATE INDEX idx_prices_region_product ON prices(region, product);
CREATE INDEX idx_prices_fetched ON prices(fetched_at DESC);
CREATE INDEX idx_news_region_category ON news(region, category);
CREATE INDEX idx_news_fetched ON news(fetched_at DESC);
CREATE INDEX idx_sentiment_week ON sentiment_index(week_start DESC);
CREATE INDEX idx_login_ip ON login_attempts(ip_address, attempted_at);
```

### Supabase RLS Politikaları (v1.2)

```sql
-- RLS aktif et
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_successful ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Anon key: Sadece SELECT (okuma)
CREATE POLICY "Anon can read prices"
  ON prices FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read news"
  ON news FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read sentiment"
  ON sentiment_index FOR SELECT TO anon USING (true);

-- Anon key: INSERT/UPDATE/DELETE yasak (policy yok = deny)

-- Service role: Tüm işlemler (cron jobs için)
-- Service role key otomatik olarak RLS'yi bypass eder
-- Cron route'ları SUPABASE_SERVICE_ROLE_KEY kullanır
```

**Prensip:** Frontend → `SUPABASE_ANON_KEY` (sadece okur). Cron API routes → `SUPABASE_SERVICE_ROLE_KEY` (yazar). Service role key ASLA client'a exposed edilmez.

### B. 4 Katmanlı Scraping Fallback (v1.2 Genişletilmiş)

**Problem (v1.1 kalan açık):** Fallback kaynakları da scraping ise, aynı anda bozulabilir.

**Çözüm: 4. katman olarak "statik snapshot" eklendi.**

```
1. Birincil kaynak (TradingEconomics scraping)
   ├─ OK → Veri al, DB'ye yaz, last_successful güncelle
   └─ FAIL →
2. Fallback #1 (SteelBenchmarker scraping)
   ├─ OK → Veri al, DB'ye yaz
   └─ FAIL →
3. Fallback #2 (last_successful tablosu — DB'deki en son başarılı veri)
   ├─ Veri var → Göster + "⚠ Stale data: X gün önce" uyarısı
   └─ Veri yok →
4. Fallback #3 (v1.2): Statik snapshot (hardcoded baseline)
   └─ Göster + "⚠ Referans fiyat — güncel değil" uyarısı
```

**Statik snapshot:** Proje ilk deploy edildiğinde, o anki tüm fiyatları `config/baseline-prices.json` dosyasına kaydederiz. Bu dosya repo'da durur ve asla silinmez. Son çare olarak bu fiyatları gösterir — dashboard asla tamamen boş kalmaz.

```typescript
// config/baseline-prices.json (repo'da, deploy ile güncellenir)
{
  "snapshotDate": "2026-03-14",
  "prices": {
    "HRC": { "far-east": 405, "asia": 520, "eu": 650, "cis": 430, ... },
    "Scrap": { "far-east": 320, "asia": 380, "eu": 340, "cis": 310, ... },
    ...
  }
}
```

**Stale data UI katmanları:**

| Veri Yaşı | Gösterim | Renk |
|-----------|----------|------|
| < 24 saat | Normal | Varsayılan |
| 1-3 gün | "Son güncelleme: X gün önce" | 🟡 Sarı |
| 3-7 gün | "⚠ Eski veri — kaynak erişilemedi" | 🟠 Turuncu |
| > 7 gün | "⚠ Referans fiyat — güncel değil" | 🔴 Kırmızı |
| Baseline | "📌 Proje başlangıç referansı" | ⚫ Gri |

### C. Haber Noise Azaltma + Niş Kaynak Keşfi (v1.2)

**v1.1 kalan açık:** Önemli yerel kaynaklar whitelist dışında kalabilir.

**Çözüm: Dinamik kaynak keşfi mekanizması**

```typescript
// Faz 0: Statik whitelist (v1.1'den)
const TRUSTED_DOMAINS_STATIC = [ ... ]; // 20+ domain

// v1.2: Keşfedilen kaynaklar DB'de
CREATE TABLE discovered_sources (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(100) NOT NULL UNIQUE,
  region VARCHAR(20),
  category VARCHAR(20),
  hit_count INTEGER DEFAULT 1,         -- Kaç kez karşılaşıldı
  quality_score DECIMAL(3,2),          -- Manuel puanlama (0-1)
  is_approved BOOLEAN DEFAULT FALSE,   -- Manuel onay
  discovered_at TIMESTAMP DEFAULT NOW()
);

// Brave arama sonuçlarından gelen ama whitelist'te olmayan domain'ler
// otomatik olarak discovered_sources'a eklenir (is_approved=false)
// Haftalık olarak kontrol edilip manuel onaylanır
```

**Kaynak keşif akışı:**

```
Brave Search sonucu geldi
├─ Domain trusted_domains'de mi?
│   ├─ EVET → Haberi ekle (confidence +0.2)
│   └─ HAYIR → Domain discovered_sources'da mı?
│       ├─ EVET → hit_count++ , is_approved ise ekle
│       └─ HAYIR → discovered_sources'a kaydet (is_approved=false)
│                   Haberi ekleme, ama domain'i logla
└─ Haftalık: discovered_sources'u incele, kaliteli olanları onayla
```

Bu sayede zamanla niş ama değerli kaynaklar (örn: `gmk.center` Ukrayna çelik merkezi) otomatik keşfedilir.

### D. Auth: Brute-Force Koruması (v1.2)

**v1.1 kalan açık:** PIN kaba kuvvetle aşılabilir.

**Çözüm: Rate limiting + progressive delay**

```typescript
// middleware.ts — v1.2 güvenlik katmanları

const RATE_LIMIT = {
  maxAttempts: 5,           // 5 yanlış deneme
  windowMinutes: 15,        // 15 dakika penceresi
  lockoutMinutes: 30,       // Lockout süresi
  progressiveDelay: true,   // Her yanlış denemede artan bekleme
};

async function checkBruteForce(ip: string): Promise<{allowed: boolean, waitSeconds: number}> {
  const recentAttempts = await supabase
    .from('login_attempts')
    .select('*')
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - RATE_LIMIT.windowMinutes * 60000).toISOString())
    .order('attempted_at', { ascending: false });

  const failCount = recentAttempts.data?.length || 0;

  if (failCount >= RATE_LIMIT.maxAttempts) {
    return { allowed: false, waitSeconds: RATE_LIMIT.lockoutMinutes * 60 };
  }

  // Progressive delay: 0s, 2s, 5s, 10s, 20s
  const delays = [0, 2, 5, 10, 20];
  const waitSeconds = delays[Math.min(failCount, delays.length - 1)];

  return { allowed: true, waitSeconds };
}
```

**Ek güvenlik önlemleri:**
- PIN minimum 6 karakter (sayı + harf)
- `AUTH_SECRET` minimum 32 karakter rastgele string
- Login sayfasında deneme sayacı gösterilmez (bilgi sızıntısı önlenir)
- Başarısız deneme logları `login_attempts` tablosunda saklanır

### E. Vercel API Rate Limiting (v1.2)

```typescript
// lib/rate-limiter.ts
// Basit in-memory rate limiter (Vercel serverless uyumlu)

const RATE_LIMITS = {
  'api/prices': { requests: 60, windowMs: 60000 },    // 60 req/dakika
  'api/news': { requests: 30, windowMs: 60000 },      // 30 req/dakika
  'api/cron': { requests: 2, windowMs: 60000 },       // 2 req/dakika (cron only)
};

// Vercel'de in-memory state function'lar arası paylaşılmaz
// Bu yüzden Supabase'de basit bir sayaç tutarız:

CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50),
  ip_address VARCHAR(45),
  window_start TIMESTAMP,
  request_count INTEGER DEFAULT 1,
  UNIQUE(endpoint, ip_address, window_start)
);

// Cron endpoint'leri ek olarak CRON_SECRET header ile korunur
```

### F. Döviz Kuru API Uyumluluğu (v1.2)

**ExchangeRate-API Free Tier kontrol:**

| Özellik | Limit |
|---------|-------|
| Günlük istek | 1,500 req/gün |
| Güncelleme sıklığı | Günlük |
| Desteklenen para birimleri | 161 |
| Maliyet | $0 |

**SteelHub ihtiyacı:** Günde 1 kez döviz kuru çekme (CNY, EUR, TRY, RUB → USD). Toplam: 1 req/gün. Limit çok çok yeterli.

**Döviz kuru cache stratejisi:**

```typescript
// Döviz kurları günde 1 kez çekilir ve DB'de tutulur
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency VARCHAR(3) DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(target_currency, fetched_at::date)
);

// Fiyat normalize ederken önce DB'deki güncel kuru kontrol et
// Yoksa API'den çek ve cache'le
```

---

## 5. Piyasa Duyarlılık Endeksi (v1.2 — Yeni Özellik)

**Problem:** Sentiment skoru sadece bir badge olarak kalırsa kullanıcı için "süslü ama işlevsiz" olur.

**Çözüm: Sentiment ↔ Fiyat korelasyonu analizi**

### Endeks Hesaplama (Haftalık)

```typescript
interface SentimentIndexData {
  region: string
  category: string
  weekStart: Date
  avgSentiment: number      // Haftanın ortalama sentiment'i (-1 ile +1)
  newsCount: number         // Analiz edilen haber sayısı
  priceChangePct: number    // Aynı hafta fiyat değişimi %
  correlationScore: number  // Korelasyon (-1 ile +1)
  divergenceFlag: boolean   // Ters gidiyorsa TRUE
}

// Hesaplama mantığı:
// 1. Haftalık tüm haberlerin sentiment ortalamasını al
// 2. Aynı hafta aynı bölge/kategori için fiyat değişimini hesapla
// 3. Son 4 haftanın sentiment vs fiyat korelasyonunu hesapla
// 4. Korelasyon < -0.3 ise divergence (sapma) flag'i

function calculateDivergence(
  sentiments: number[],  // Son 4 hafta sentiment ortalamaları
  priceChanges: number[] // Son 4 hafta fiyat değişimleri
): { correlation: number, isDiverging: boolean } {
  // Pearson korelasyon katsayısı
  const correlation = pearsonCorrelation(sentiments, priceChanges);

  // Divergence: Haberler bullish ama fiyat düşüyor (veya tersi)
  const lastSentiment = sentiments[sentiments.length - 1];
  const lastPriceChange = priceChanges[priceChanges.length - 1];
  const isDiverging = (lastSentiment > 0.2 && lastPriceChange < -1) ||
                      (lastSentiment < -0.2 && lastPriceChange > 1);

  return { correlation, isDiverging };
}
```

### Dashboard Gösterimi

```
┌─────────────────────────────────────────────────────┐
│  Piyasa Duyarlılık Endeksi — Far East HRC           │
│                                                      │
│  Bu Hafta Sentiment:  🟢 +0.45 (Bullish)            │
│  Bu Hafta Fiyat:      ▲ +2.3%                       │
│  4 Hafta Korelasyon:  0.72 (Güçlü pozitif)          │
│                                                      │
│  ✅ Haberler ve fiyat aynı yönde hareket ediyor      │
│                                                      │
│  ─── veya ───                                        │
│                                                      │
│  ⚠️ DİKKAT: Sapma tespit edildi!                     │
│  Haberler bullish (+0.45) ama fiyat düşüyor (-1.8%) │
│  → Piyasada direnç veya gecikmeli tepki olabilir     │
└─────────────────────────────────────────────────────┘
```

**Faz planı:**
- Faz 0-1: Veri toplanır ama endeks hesaplanmaz (yeterli veri yok)
- Faz 2: Claude Haiku aktif → Sentiment verisi akmaya başlar → 4 hafta sonra endeks aktif
- Minimum veri: 4 haftalık sentiment + fiyat verisi gerekli

---

## 6. Progressive Enhancement — Faz Planı

### Mimari Prensip: Provider Pattern

```typescript
// providers/interfaces.ts

interface PriceProvider {
  getPrice(product: SteelProduct, region: Region): Promise<PriceData>
  getHistory(product: SteelProduct, region: Region, days: number): Promise<PriceData[]>
  isAvailable(): Promise<boolean>
}

interface NewsProvider {
  searchNews(category: Category, region: Region, options?: SearchOptions): Promise<NewsItem[]>
}

interface AIParser {
  categorize(headline: string, snippet: string): Promise<ClassificationResult>
  analyzeSentiment(text: string): Promise<SentimentResult>
  summarize(articles: NewsItem[]): Promise<string>
}

interface StorageProvider {
  savePrices(data: PriceData[]): Promise<void>
  getPrices(filters: PriceFilter): Promise<PriceData[]>
  saveNews(items: NewsItem[]): Promise<void>
  getNews(filters: NewsFilter): Promise<NewsItem[]>
  getLastSuccessful(type: string, region: string): Promise<any>
  saveLastSuccessful(type: string, region: string, data: any): Promise<void>
  calculateSentimentIndex(region: string, category: string): Promise<SentimentIndexData>
}

// .env.local
PRICE_PROVIDER=scraping          // scraping | metals-api
NEWS_PROVIDER=brave-free         // brave-free | brave-paid
AI_PARSER=regex                  // regex | claude-haiku
STORAGE_PROVIDER=supabase        // supabase
```

### Faz 0 — MVP ($0/ay)

- Supabase Free + TradingEconomics scraping + Brave free + Regex + PIN auth + RLS
- 4 bölge günlük (Far East, Asia, CIS, EU), 3 bölge haftalık

### Faz 1 — Fiyat Kalitesi (+$15/ay → $15/ay)

- `PRICE_PROVIDER=metals-api` (saatlik fiyat)
- Tavsiye: Sprint 2 sonunda aktif et

### Faz 2 — AI + Sentiment (+$5/ay → $20/ay)

- `AI_PARSER=claude-haiku` (kategorize + sentiment + özet)
- 4 hafta veri birikmesinden sonra Piyasa Duyarlılık Endeksi aktif

### Faz 3 — Tam Kapsam (+$15-20/ay → $35-40/ay)

- `NEWS_PROVIDER=brave-paid` (7 bölge günlük, 35+ query/gün)

---

## 7. Tech Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| **Frontend** | Next.js 14 (App Router) | SSR + API routes + cron |
| **Styling** | Tailwind CSS + shadcn/ui | Hızlı, responsive |
| **Grafikler** | Chart.js (react-chartjs-2) | Hafif, esnek |
| **Database** | Supabase (Postgres, free) | RLS + 500MB + API |
| **Deployment** | Vercel (free tier) | Otomatik deploy, cron |
| **Scraping** | Cheerio (server-side) | Hafif HTML parsing |
| **Döviz** | ExchangeRate-API (free) | 1,500 req/gün (1 yeterli) |
| **Auth** | Custom middleware + brute-force koruması | PIN + rate limit |

---

## 8. Dosya Yapısı

```
steelhub/
├── src/
│   ├── providers/
│   │   ├── interfaces.ts
│   │   ├── factory.ts
│   │   ├── price/
│   │   │   ├── scraping.ts
│   │   │   └── metals-api.ts
│   │   ├── news/
│   │   │   └── brave.ts
│   │   ├── parser/
│   │   │   ├── regex.ts
│   │   │   └── claude.ts
│   │   └── storage/
│   │       └── supabase.ts
│   │
│   ├── config/
│   │   ├── regions.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── sources.ts
│   │   ├── trusted-domains.ts
│   │   ├── noise-keywords.ts
│   │   ├── cis-sources.ts              ← v1.2: CIS özel kaynak listesi
│   │   └── baseline-prices.json        ← v1.2: Statik snapshot (4. fallback)
│   │
│   ├── lib/
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── normalizer.ts
│   │   ├── fallback.ts
│   │   ├── supabase.ts
│   │   ├── rate-limiter.ts             ← v1.2: API rate limiting
│   │   ├── brute-force.ts             ← v1.2: Login rate limiting
│   │   ├── source-discovery.ts        ← v1.2: Dinamik kaynak keşfi
│   │   └── sentiment-index.ts         ← v1.2: Piyasa Duyarlılık Endeksi
│   │
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── prices/page.tsx
│   │   ├── news/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── sentiment/page.tsx          ← v1.2: Duyarlılık endeksi sayfası
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── prices/route.ts
│   │       │   ├── news/route.ts
│   │       │   └── sentiment/route.ts  ← v1.2: Haftalık endeks hesaplama
│   │       ├── prices/route.ts
│   │       └── news/route.ts
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── PriceCard.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   ├── RegionFilter.tsx
│   │   │   ├── OverviewGrid.tsx
│   │   │   └── SentimentBadge.tsx
│   │   ├── charts/
│   │   │   ├── TrendChart.tsx
│   │   │   ├── CompareChart.tsx
│   │   │   └── SentimentCorrelation.tsx ← v1.2: Sentiment vs fiyat grafik
│   │   ├── news/
│   │   │   ├── NewsCard.tsx
│   │   │   └── NewsList.tsx
│   │   └── common/
│   │       ├── Badge.tsx
│   │       ├── ChangeIndicator.tsx
│   │       ├── StaleWarning.tsx
│   │       └── DivergenceAlert.tsx     ← v1.2: "Sapma tespit edildi" uyarı
│   │
│   ├── hooks/
│   │   ├── usePrices.ts
│   │   ├── useNews.ts
│   │   └── useSentimentIndex.ts        ← v1.2
│   │
│   └── middleware.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql        ← v1.2: RLS kuralları
│       └── 003_sentiment_index.sql     ← v1.2: Sentiment tabloları
│
├── public/
├── .env.local
├── .env.example
├── vercel.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 9. Sprint Planı

### Sprint 0 — Pre-Flight Checklist (v1.2 — 1 gün)

Kodlama öncesi tamamlanması GEREKEN kontrol listesi:

- [ ] **Supabase proje oluştur** → Project URL ve API key'leri al
- [ ] **Supabase RLS:** Tüm tablolarda RLS aktif, anon key sadece SELECT
- [ ] **Supabase service role key:** `.env.local`'a ekle, client kodunda ASLA kullanma
- [ ] **Brave Search API:** Hesap oluştur, API key al, $5 ücretsiz kredi doğrula
- [ ] **ExchangeRate-API:** Free tier test et (1 req/gün, 1,500 limit — SteelHub için fazlasıyla yeterli)
- [ ] **Vercel proje oluştur:** GitHub repo bağla, `vercel.json` cron config hazırla
- [ ] **Domain (opsiyonel):** `steelhub.vercel.app` veya custom domain
- [ ] **PIN belirle:** Minimum 6 karakter (harf + sayı), `AUTH_SECRET` 32+ karakter
- [ ] **TradingEconomics test:** Cheerio ile bir fiyat sayfasını parse et, HTML yapısını doğrula
- [ ] **baseline-prices.json:** Güncel fiyatları manuel toplayıp statik snapshot oluştur
- [ ] **Git repo:** `.gitignore`'a `.env.local` ekle, `.env.example` oluştur

### Sprint 1 — Temel Altyapı + Storage (3 gün)

- [ ] Next.js 14 proje kurulumu (App Router + Tailwind + shadcn/ui)
- [ ] Supabase migration çalıştır (001 + 002 + 003)
- [ ] Supabase client helper (`lib/supabase.ts`) — anon vs service role ayrımı
- [ ] TypeScript type tanımları
- [ ] Provider interfaces + factory pattern
- [ ] Config dosyaları (regions, categories, products, sources, trusted-domains, noise-keywords, cis-sources)
- [ ] Fiyat normalizer (NT→MT, CNY→USD, EUR→USD)
- [ ] Döviz kuru cache (ExchangeRate-API → DB)
- [ ] TradingEconomics scraper + SteelBenchmarker fallback
- [ ] 4 katmanlı fallback manager (birincil → alternatif → last_successful → baseline)
- [ ] PIN auth middleware + brute-force koruması
- [ ] API rate limiter
- [ ] İlk veri çekme → Supabase'e yazma testi

### Sprint 2 — Dashboard UI + Metals-API Hazırlığı (3 gün)

- [ ] Layout + navigation (5 kategori tab)
- [ ] PriceCard (son fiyat + değişim + stale warning katmanları)
- [ ] RegionFilter (7 bölge)
- [ ] OverviewGrid
- [ ] TrendChart (Chart.js — Y ekseni: USD/MT, tooltip'te orijinal birim)
- [ ] ChangeIndicator (▲▼)
- [ ] StaleWarning component (veri yaşına göre renk)
- [ ] Responsive tasarım
- [ ] Metals-API provider implementasyonu
- [ ] **Tavsiye: Sprint 2 sonunda `PRICE_PROVIDER=metals-api` geçişi ($15/ay)**

### Sprint 3 — Haber Sistemi (2-3 gün)

- [ ] Brave Search API client
- [ ] Optimized search queries (trusted domain + context + CIS özel)
- [ ] Noise filter (negatif keyword)
- [ ] Confidence score hesaplama
- [ ] Dinamik kaynak keşfi (discovered_sources tablosu)
- [ ] Regex kategorize + confidence
- [ ] NewsCard + NewsList + confidence badge
- [ ] Kategori ve bölge filtresi
- [ ] Vercel cron job (günlük haber + fiyat + döviz kuru)
- [ ] last_successful fallback entegrasyonu
- [ ] Scraper kırılma simülasyonu → fallback çalışıyor mu test

### Sprint 4 — Rapor + Sentiment Placeholder + Polish (2 gün)

- [ ] Haftalık özet sayfası
- [ ] Sentiment göstergesi placeholder (Faz 2'de aktif, şimdi UI hazır)
- [ ] SentimentCorrelation chart placeholder
- [ ] DivergenceAlert component
- [ ] Basit PDF export
- [ ] Error handling + loading states
- [ ] Vercel deployment
- [ ] README + `.env.example`
- [ ] Smoke test: tüm fallback katmanları

**Toplam: 1 (Sprint 0) + 10-11 (Sprint 1-4) = ~11-12 gün**

---

## 10. Env Konfigürasyonu

```env
# .env.local

# === Provider Seçimi ===
PRICE_PROVIDER=scraping              # scraping | metals-api
NEWS_PROVIDER=brave-free             # brave-free | brave-paid
AI_PARSER=regex                      # regex | claude-haiku
STORAGE_PROVIDER=supabase            # supabase

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=            # https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Anon key (frontend, sadece READ)
SUPABASE_SERVICE_ROLE_KEY=           # Service role (server-side, WRITE — GİZLİ!)

# === API Keys ===
BRAVE_API_KEY=                       # Brave Search API
METALS_API_KEY=                      # Metals-API (Faz 1)
ANTHROPIC_API_KEY=                   # Claude API (Faz 2)

# === Auth ===
AUTH_PIN=                            # Min 6 karakter (harf + sayı)
AUTH_SECRET=                         # Cookie secret (min 32 karakter rastgele)

# === Güncelleme ===
NEWS_DAILY_REGIONS=far-east,asia,cis,eu
NEWS_WEEKLY_REGIONS=africa,north-america,south-america

# === Cron ===
CRON_SECRET=                         # Vercel cron auth token

# === Döviz ===
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

---

## 11. Maliyet Özeti

| Faz | Açıklama | Aylık | Kümülatif |
|-----|----------|-------|-----------|
| Faz 0 | Supabase + Scraping + Brave free + Regex + Auth + RLS | **$0** | $0/ay |
| Faz 1 | +Metals-API (saatlik fiyat) | +$15 | $15/ay |
| Faz 2 | +Claude Haiku (sentiment + kategorize) | +$5 | $20/ay |
| Faz 3 | +Brave paid (7 bölge günlük) | +$15-20 | $35-40/ay |

---

## 12. Risk Matrisi (v1.2 — Final)

| Risk | Tehlike | Mitigasyon | Kalan Açık | Durum |
|------|---------|------------|------------|-------|
| Ephemeral FS | Veri kaybı | Supabase Postgres | — | ✅ Kapatıldı |
| Scraper kırılması | Dashboard boş | 4 katmanlı fallback + baseline snapshot | Tüm scraper'lar aynı anda kırılırsa 4. katman devreye girer | ✅ Kapatıldı |
| Haber noise | Alakasız sonuçlar | Trusted domains + noise filter + confidence | — | ✅ Kapatıldı |
| Niş kaynaklar | Önemli haberler kaçırılır | Dinamik kaynak keşfi + discovered_sources | Manuel onay gerekli (haftalık) | ✅ Azaltıldı |
| Brute-force | PIN aşılır | Progressive delay + lockout + attempt logging | — | ✅ Kapatıldı |
| API rate abuse | Kaynak tüketimi | Endpoint bazlı rate limiting | In-memory state paylaşılmaz (DB-based çözüm) | ✅ Kapatıldı |
| Supabase RLS | Veri sızıntısı | Anon=SELECT only, Service role=server only | — | ✅ Kapatıldı |
| Döviz API uyumsuzluğu | Birim dönüşüm hatası | 1 req/gün vs 1,500 limit — fazlasıyla yeterli | — | ✅ Kapatıldı |
| CIS veri parçalılığı | Bölge verisi eksik | Özel kaynak listesi (metalexpert, gmk.center) | Savaş durumu verileri bozabilir | ⚠️ Kabul |
| Faz 0 fiyat gecikmesi | Intelligence değer kaybı | Sprint 2 sonunda Faz 1'e erken geçiş tavsiyesi | — | ⚠️ Kabul |
| Brave free kredi | Haber kapsamı kısıtlı | 4 bölge öncelik + haftalık diğerleri | — | ⚠️ Kabul |
| Supabase pause | 1 hafta inaktiflikte DB durur | Günlük cron DB'yi canlı tutar | Cron da çalışmazsa? → baseline fallback | ⚠️ Kabul |

---

## 13. Gelecek Özellikler (Backlog)

- [ ] Fiyat alert sistemi (Telegram bot)
- [ ] Bölgeler arası spread analizi (EU HRC vs China HRC)
- [ ] Maliyet simülasyonu (hammadde → ürün)
- [ ] Çolakoğlu HRC platform entegrasyonu
- [ ] CSV import (tarihsel veri)
- [ ] TR/EN dil toggle
- [ ] External API endpoint
- [ ] Supabase Auth upgrade (PIN → OAuth)
- [ ] Haftalık otomatik rapor e-posta
- [ ] Piyasa Duyarlılık Endeksi trend grafikleri (aylık/üç aylık)

---

*Bu döküman Anti-Gravity Studio tarafından SteelHub projesi için hazırlanmıştır.*  
*Son güncelleme: 14 Mart 2026 — v1.2 (Final)*
