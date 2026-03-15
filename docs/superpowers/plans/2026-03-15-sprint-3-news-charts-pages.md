# Sprint 3 — News, Charts & Dedicated Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time news with AI classification (Groq/Llama), simple price trend charts (Chart.js), and dedicated Prices/News pages to the SteelHub dashboard.

**Architecture:** News flows through cron → NewsAPI.org → Groq classifier → Supabase → `/api/news` → UI. Charts fetch historical price data via `/api/prices?history=true`. Three new pages share a refactored sidebar with `next/link` navigation. All backend follows the existing provider/factory/storage pattern.

**Tech Stack:** Next.js 14, TypeScript, Tailwind v3, Groq SDK (Llama 3.1 8B), Chart.js + react-chartjs-2, Supabase, NewsAPI.org, Brave Search API

**Spec:** `docs/superpowers/specs/2026-03-15-sprint3-news-charts-pages.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/types.ts` | Add `country` to NewsFilter, `ascending` to PriceFilter |
| Modify | `src/providers/storage/supabase.ts` | Add country filter to getNews, ascending to getPrices, dedup to saveNews |
| Create | `src/providers/ai/classifier.ts` | Groq-powered headline classifier with keyword fallback |
| Create | `src/providers/news/newsapi.ts` | NewsAPI.org provider |
| Create | `src/providers/news/brave.ts` | Brave Search fallback provider |
| Modify | `src/providers/factory.ts` | Add createNewsProviders(), createClassifier() |
| Create | `src/app/api/news/route.ts` | GET /api/news endpoint |
| Create | `src/app/api/cron/news/route.ts` | POST cron news fetcher |
| Modify | `src/app/api/prices/route.ts` | Add history=true param |
| Modify | `src/app/api/cron/all/route.ts` | Add news cron call |
| Modify | `src/components/sidebar.tsx` | Link navigation, usePathname, optional region props |
| Create | `src/components/page-layout.tsx` | Shared layout for Prices/News pages (sidebar nav-only + content) |
| Modify | `src/components/news-list.tsx` | Replace placeholder with live news + country filter |
| Create | `src/components/news-card.tsx` | Single news item display |
| Create | `src/components/price-chart.tsx` | Chart.js line chart for price history |
| Modify | `src/components/price-card.tsx` | Add onClick prop |
| Modify | `src/components/region-view.tsx` | Add chart toggle panel |
| Create | `src/app/prices/page.tsx` | Dedicated sortable prices table |
| Create | `src/app/news/page.tsx` | Dedicated news page with filters |

---

## Chunk 1: Prerequisites & Storage Updates

### Task 1: Update types with country filter and ascending sort

**Files:**
- Modify: `steelhub/src/lib/types.ts`

- [ ] **Step 1: Add country to NewsFilter and ascending to PriceFilter**

In `steelhub/src/lib/types.ts`, find the `NewsFilter` interface and add `country`:

```ts
export interface NewsFilter {
  category?: Category
  region?: Region
  country?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
}
```

Find the `PriceFilter` interface and add `ascending`:

```ts
export interface PriceFilter {
  product?: SteelProduct
  region?: Region
  country?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  ascending?: boolean
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(sprint3): add country filter and ascending sort to filter types"
```

---

### Task 2: Create database migration for news indexes

**Files:**
- Create: `steelhub/supabase/migrations/003_news_indexes.sql`

The news dedup (upsert with `onConflict: 'url'`) requires a unique index on `url`. Without this, the upsert will fail. Also add a country index for filter performance.

- [ ] **Step 1: Create migration file**

```sql
-- 003_news_indexes.sql
-- Unique index for news dedup (required for upsert ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_unique ON news(url) WHERE url IS NOT NULL;

-- Country filter performance
CREATE INDEX IF NOT EXISTS idx_news_country ON news(region, country);
```

- [ ] **Step 2: Run migration against Supabase**

Apply via Supabase dashboard SQL editor or CLI:
```bash
# If using Supabase CLI:
cd steelhub && npx supabase db push
# Or run the SQL manually in Supabase dashboard → SQL Editor
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_news_indexes.sql
git commit -m "feat(sprint3): add news dedup and country indexes"
```

---

### Task 3: Update storage layer for country filter, sort order, and dedup

**Files:**
- Modify: `steelhub/src/providers/storage/supabase.ts`

- [ ] **Step 1: Add country filter to getNews()**

In `steelhub/src/providers/storage/supabase.ts`, find the `getNews` method. Add this line after the existing `region` filter:

```ts
if (filters.country) query = query.eq('country', filters.country)
```

- [ ] **Step 2: Add ascending option to getPrices()**

In the `getPrices` method, change the hardcoded `ascending: false` to use the filter:

```ts
query = query.order('fetched_at', { ascending: filters.ascending ?? false })
```

- [ ] **Step 3: Add dedup to saveNews()**

In the `saveNews` method, add `ON CONFLICT` handling. Replace the existing insert call with:

```ts
const { error } = await this.client
  .from('news')
  .upsert(
    items.map(item => ({
      title: item.title,
      url: item.url || null,
      snippet: item.snippet || null,
      source: item.source || null,
      category: item.category,
      region: item.region,
      country: item.country || null,
      sentiment: item.sentiment ?? null,
      confidence: item.confidence ?? null,
      published_at: item.publishedAt?.toISOString() || null,
      fetched_at: item.fetchedAt.toISOString(),
    })),
    { onConflict: 'url', ignoreDuplicates: true }
  )
```

- [ ] **Step 4: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/providers/storage/supabase.ts
git commit -m "feat(sprint3): add country filter, sort order, and news dedup to storage"
```

---

### Task 4: Install groq-sdk

**Files:**
- Modify: `steelhub/package.json`

- [ ] **Step 1: Install groq-sdk**

```bash
cd steelhub && npm install groq-sdk
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(sprint3): install groq-sdk for AI classification"
```

---

## Chunk 2: News Backend (Classifier, Providers, API Routes)

### Task 5: Create Groq classifier with keyword fallback

**Files:**
- Create: `steelhub/src/providers/ai/classifier.ts`

- [ ] **Step 1: Create classifier**

```ts
// src/providers/ai/classifier.ts
import Groq from 'groq-sdk'
import { Category, ClassificationResult } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'

const SYSTEM_PROMPT = `You are a steel industry news classifier. Classify the given headline and snippet into exactly ONE of these categories:

1. hammadde (Raw Materials) — iron ore, coal, scrap, coke, DRI, pig iron
2. urun (Steel Products) — HRC, CRC, HDG, rebar, slab, billet, wire rod, coil, plate
3. tuketim (Consumption) — PMI, manufacturing, construction, automotive, demand, production
4. tasima (Shipping) — freight, BDI, Baltic, shipping, vessel, charter, dry bulk
5. vergi (Tariffs & Trade) — tariff, duty, CBAM, anti-dumping, safeguard, import tax, quota

Respond with ONLY a JSON object: {"category": "<id>", "confidence": <0.0-1.0>, "isRelevant": <true/false>}
Set isRelevant to false if the article is not about the steel industry.`

export async function classifyWithGroq(
  title: string,
  snippet: string
): Promise<ClassificationResult> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return classifyWithKeywords(title, snippet)

  try {
    const client = new Groq({ apiKey: groqKey })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const completion = await client.chat.completions.create(
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Title: ${title}\nSnippet: ${snippet || 'N/A'}` },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const text = completion.choices[0]?.message?.content
    if (!text) return classifyWithKeywords(title, snippet)

    const parsed = JSON.parse(text)
    const validCategories: Category[] = ['hammadde', 'urun', 'tuketim', 'tasima', 'vergi']
    if (!validCategories.includes(parsed.category)) {
      return classifyWithKeywords(title, snippet)
    }

    return {
      category: parsed.category as Category,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      isRelevant: parsed.isRelevant !== false,
    }
  } catch {
    return classifyWithKeywords(title, snippet)
  }
}

export function classifyWithKeywords(
  title: string,
  snippet: string
): ClassificationResult {
  const text = `${title} ${snippet}`.toLowerCase()

  let bestCategory: Category = 'urun'
  let bestScore = 0

  for (const [catId, config] of Object.entries(CATEGORIES)) {
    const score = config.keywords.filter(kw => text.includes(kw.toLowerCase())).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = catId as Category
    }
  }

  return {
    category: bestCategory,
    confidence: bestScore > 0 ? Math.min(0.8, bestScore * 0.2) : 0.1,
    isRelevant: bestScore > 0,
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/providers/ai/classifier.ts
git commit -m "feat(sprint3): add Groq classifier with keyword fallback"
```

---

### Task 6: Create NewsAPI provider

**Files:**
- Create: `steelhub/src/providers/news/newsapi.ts`

- [ ] **Step 1: Create NewsAPI provider**

```ts
// src/providers/news/newsapi.ts
import { NewsProvider } from '../interfaces'
import { NewsItem, Category, Region } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'
import { REGIONS } from '@/config/regions'
import { getDomainTier, isNoise } from '@/config/trusted-domains'
import { classifyWithGroq } from '../ai/classifier'

export class NewsAPIProvider implements NewsProvider {
  name = 'newsapi'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY || ''
  }

  async searchNews(category: Category, region: Region): Promise<NewsItem[]> {
    if (!this.apiKey) return []

    const regionConfig = REGIONS[region]
    const keywords = CATEGORIES[category].keywords.slice(0, 3).join(' OR ')
    const countries = regionConfig.countries.slice(0, 3).join(' OR ')
    const query = `(${keywords}) AND (${countries} OR steel)`

    try {
      const url = new URL('https://newsapi.org/v2/everything')
      url.searchParams.set('q', query)
      url.searchParams.set('language', 'en')
      url.searchParams.set('sortBy', 'publishedAt')
      url.searchParams.set('pageSize', '10')
      url.searchParams.set('apiKey', this.apiKey)

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'SteelHub/1.0' },
      })

      if (!res.ok) {
        console.error(`NewsAPI error: ${res.status}`)
        return []
      }

      const json = await res.json()
      const articles: NewsItem[] = []

      for (const article of json.articles ?? []) {
        const title = article.title || ''
        const snippet = article.description || ''

        // Filter noise
        if (isNoise(title, snippet)) continue

        // Classify
        const classification = await classifyWithGroq(title, snippet)
        if (!classification.isRelevant) continue

        // Domain tier confidence boost
        const tier = getDomainTier(article.url || '')
        const confidenceBoost = tier === 1 ? 0.2 : tier === 2 ? 0.1 : 0

        articles.push({
          title,
          url: article.url || undefined,
          snippet,
          source: article.source?.name || undefined,
          category: classification.category,
          region,
          sentiment: undefined,
          confidence: Math.min(1, classification.confidence + confidenceBoost),
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
          fetchedAt: new Date(),
        })
      }

      return articles
    } catch (err) {
      console.error('NewsAPI fetch error:', err)
      return []
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/providers/news/newsapi.ts
git commit -m "feat(sprint3): add NewsAPI provider with classification and filtering"
```

---

### Task 7: Create Brave Search fallback provider

**Files:**
- Create: `steelhub/src/providers/news/brave.ts`

- [ ] **Step 1: Create Brave provider**

```ts
// src/providers/news/brave.ts
import { NewsProvider } from '../interfaces'
import { NewsItem, Category, Region } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'
import { REGIONS } from '@/config/regions'
import { getDomainTier, isNoise } from '@/config/trusted-domains'
import { classifyWithGroq } from '../ai/classifier'

export class BraveSearchProvider implements NewsProvider {
  name = 'brave'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.BRAVE_API_KEY || ''
  }

  async searchNews(category: Category, region: Region): Promise<NewsItem[]> {
    if (!this.apiKey) return []

    const regionConfig = REGIONS[region]
    const keywords = CATEGORIES[category].keywords.slice(0, 2).join(' ')
    const country = regionConfig.countries[0]
    const query = `${keywords} steel ${country}`

    try {
      const url = new URL('https://api.search.brave.com/res/v1/news/search')
      url.searchParams.set('q', query)
      url.searchParams.set('count', '10')
      url.searchParams.set('freshness', 'pd')

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      })

      if (!res.ok) {
        console.error(`Brave Search error: ${res.status}`)
        return []
      }

      const json = await res.json()
      const articles: NewsItem[] = []

      for (const result of json.results ?? []) {
        const title = result.title || ''
        const snippet = result.description || ''

        if (isNoise(title, snippet)) continue

        const classification = await classifyWithGroq(title, snippet)
        if (!classification.isRelevant) continue

        const tier = getDomainTier(result.url || '')
        const confidenceBoost = tier === 1 ? 0.2 : tier === 2 ? 0.1 : 0

        articles.push({
          title,
          url: result.url || undefined,
          snippet,
          source: result.meta_url?.hostname || undefined,
          category: classification.category,
          region,
          sentiment: undefined,
          confidence: Math.min(1, classification.confidence + confidenceBoost),
          publishedAt: undefined, // Brave returns relative time strings, not parseable dates
          fetchedAt: new Date(),
        })
      }

      return articles
    } catch (err) {
      console.error('Brave Search error:', err)
      return []
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/providers/news/brave.ts
git commit -m "feat(sprint3): add Brave Search fallback news provider"
```

---

### Task 8: Wire news providers into factory

**Files:**
- Modify: `steelhub/src/providers/factory.ts`

- [ ] **Step 1: Add news provider factory functions**

Add these imports to `steelhub/src/providers/factory.ts`. Update the existing interfaces import to include `NewsProvider`:

```ts
import { PriceProvider, NewsProvider } from './interfaces'
import { NewsAPIProvider } from './news/newsapi'
import { BraveSearchProvider } from './news/brave'
```

Add this exported function:

```ts
export function createNewsProviders(): NewsProvider[] {
  return [new NewsAPIProvider(), new BraveSearchProvider()]
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/providers/factory.ts
git commit -m "feat(sprint3): wire news providers into factory"
```

---

### Task 9: Create news API route

**Files:**
- Create: `steelhub/src/app/api/news/route.ts`

- [ ] **Step 1: Create GET /api/news**

```ts
// src/app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createStorageProvider } from '@/providers/factory'
import { Category, Region } from '@/lib/types'

export async function GET(request: NextRequest) {
  const storage = createStorageProvider()

  const region = request.nextUrl.searchParams.get('region') as Region | null
  const category = request.nextUrl.searchParams.get('category') as Category | null
  const country = request.nextUrl.searchParams.get('country')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

  const news = await storage.getNews({
    region: region || undefined,
    category: category || undefined,
    country: country || undefined,
    limit: Math.min(limit, 100),
  })

  return NextResponse.json({ data: news })
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/news/route.ts
git commit -m "feat(sprint3): add GET /api/news endpoint"
```

---

### Task 10: Create news cron route

**Files:**
- Create: `steelhub/src/app/api/cron/news/route.ts`

- [ ] **Step 1: Create POST /api/cron/news**

```ts
// src/app/api/cron/news/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNewsProviders, createStorageProvider } from '@/providers/factory'
import { Region, Category, NewsItem } from '@/lib/types'
import { ALL_REGIONS } from '@/config/regions'
import { ALL_CATEGORIES } from '@/config/categories'

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const region = request.nextUrl.searchParams.get('region') as Region | null
  if (!region || !ALL_REGIONS.includes(region)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 })
  }

  const providers = createNewsProviders()
  const storage = createStorageProvider()
  const warnings: string[] = []
  let totalCount = 0

  // Fetch news for each category using first working provider
  for (const category of ALL_CATEGORIES) {
    let articles: NewsItem[] = []

    for (const provider of providers) {
      try {
        articles = await provider.searchNews(category, region)
        if (articles.length > 0) break
      } catch (err) {
        warnings.push(`${provider.name}/${category}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    if (articles.length > 0) {
      try {
        await storage.saveNews(articles)
        totalCount += articles.length
      } catch (err) {
        warnings.push(`save/${category}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    region,
    count: totalCount,
    warnings,
  })
}

// Vercel cron compatibility (calls POST internally)
export async function GET(request: NextRequest) {
  return POST(request)
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/news/route.ts
git commit -m "feat(sprint3): add news cron route with fallback providers"
```

---

### Task 11: Update cron orchestrator

**Files:**
- Modify: `steelhub/src/app/api/cron/all/route.ts`

- [ ] **Step 1: Add news cron call**

In `steelhub/src/app/api/cron/all/route.ts`, add a news fetch call after the existing price fetch. Add this inside the **GET handler** (the only exported handler), after the prices call:

```ts
// Fetch news for default region
const newsRes = await fetch(`${baseUrl}/api/cron/news?region=far-east`, {
  method: 'POST',
  headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
})
```

Include it in the results array.

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/all/route.ts
git commit -m "feat(sprint3): add news fetch to cron orchestrator"
```

---

## Chunk 3: News Frontend

### Task 12: Create NewsCard component

**Files:**
- Create: `steelhub/src/components/news-card.tsx`

- [ ] **Step 1: Create NewsCard**

```tsx
// src/components/news-card.tsx
'use client'

import { Category } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'

interface NewsCardProps {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  confidence?: number
  publishedAt?: string
  compact?: boolean
}

const CATEGORY_COLORS: Record<Category, string> = {
  hammadde: 'bg-[#38bdf8]/20 text-[#38bdf8]',
  urun: 'bg-[#4ade80]/20 text-[#4ade80]',
  tuketim: 'bg-[#fbbf24]/20 text-[#fbbf24]',
  tasima: 'bg-[#a78bfa]/20 text-[#a78bfa]',
  vergi: 'bg-[#f87171]/20 text-[#f87171]',
}

export function NewsCard({ title, url, snippet, source, category, publishedAt, compact }: NewsCardProps) {
  const timeAgo = publishedAt ? getTimeAgo(publishedAt) : null
  const categoryLabel = CATEGORIES[category]?.nameEn || category

  const titleElement = url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-[#38bdf8] transition-colors">
      {title}
    </a>
  ) : (
    <span>{title}</span>
  )

  if (compact) {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-[#334155] last:border-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e2e8f0] leading-tight">{titleElement}</div>
          <div className="flex items-center gap-2 mt-1">
            {source && <span className="text-[10px] text-[#38bdf8]">{source}</span>}
            {timeAgo && <span className="text-[10px] text-[#475569]">{timeAgo}</span>}
          </div>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`}>
          {categoryLabel}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155] hover:border-[#475569] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-[#e2e8f0] leading-tight">{titleElement}</h3>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`}>
          {categoryLabel}
        </span>
      </div>
      {snippet && <p className="text-xs text-[#64748b] line-clamp-2 mb-2">{snippet}</p>}
      <div className="flex items-center gap-2">
        {source && <span className="text-[10px] text-[#38bdf8]">{source}</span>}
        {timeAgo && <span className="text-[10px] text-[#475569]">{timeAgo}</span>}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/news-card.tsx
git commit -m "feat(sprint3): add NewsCard component with compact and full modes"
```

---

### Task 13: Replace NewsList placeholder with live news

**Files:**
- Modify: `steelhub/src/components/news-list.tsx`

- [ ] **Step 1: Replace NewsList with live data**

Replace the entire contents of `steelhub/src/components/news-list.tsx`:

```tsx
// src/components/news-list.tsx
'use client'

import { useEffect, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { NewsCard } from './news-card'
import { Region, Category } from '@/lib/types'
import { REGIONS } from '@/config/regions'

interface NewsItem {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  confidence?: number
  publishedAt?: string
  fetchedAt: string
}

interface NewsListProps {
  region: Region
}

export function NewsList({ region }: NewsListProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string>('')

  const countries = REGIONS[region].countries

  useEffect(() => {
    const controller = new AbortController()

    async function fetchNews() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ region, limit: '5' })
        if (selectedCountry) params.set('country', selectedCountry)
        const res = await fetch(`/api/news?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setNews(json.data ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setNews([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchNews()
    return () => controller.abort()
  }, [region, selectedCountry])

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#94a3b8]">Latest News</h3>
        <select
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value)}
          className="text-xs bg-[#1e293b] text-[#94a3b8] border border-[#334155] rounded px-2 py-1 outline-none focus:border-[#38bdf8]"
        >
          <option value="">All Countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-[#1e293b] rounded-lg p-6 text-center border border-[#334155]">
          <Newspaper className="w-8 h-8 text-[#475569] mx-auto mb-2" />
          <p className="text-sm text-[#475569]">No news available for this region</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] px-4">
          {news.map((item, i) => (
            <NewsCard
              key={`${item.title}-${i}`}
              title={item.title}
              url={item.url}
              source={item.source}
              category={item.category}
              publishedAt={item.publishedAt}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update RegionView to pass region prop to NewsList**

In `steelhub/src/components/region-view.tsx`, change `<NewsList />` to `<NewsList region={region} />`.

- [ ] **Step 3: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/news-list.tsx src/components/region-view.tsx
git commit -m "feat(sprint3): replace NewsList placeholder with live news feed"
```

---

## Chunk 4: Price Charts

### Task 14: Add history support to prices API

**Files:**
- Modify: `steelhub/src/app/api/prices/route.ts`

- [ ] **Step 1: Add history param handling**

In `steelhub/src/app/api/prices/route.ts`, add handling for the `history` query param. After reading the existing params, add:

```ts
const history = request.nextUrl.searchParams.get('history') === 'true'

if (history && !product) {
  return NextResponse.json({ error: 'product param required for history' }, { status: 400 })
}
```

Then modify the `getPrices` call to pass ascending and higher limit for history:

```ts
const prices = await storage.getPrices({
  product: product || undefined,
  region: region || undefined,
  limit: history ? 500 : Math.min(limit, 200),
  ascending: history ? true : undefined,
})
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prices/route.ts
git commit -m "feat(sprint3): add history mode to prices API for chart data"
```

---

### Task 15: Create PriceChart component

**Files:**
- Create: `steelhub/src/components/price-chart.tsx`

- [ ] **Step 1: Create chart component**

```tsx
// src/components/price-chart.tsx
'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { SteelProduct, Region } from '@/lib/types'
import { PRODUCTS } from '@/config/products'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface PriceChartProps {
  product: SteelProduct
  region: Region
}

export function PriceChart({ product, region }: PriceChartProps) {
  const [labels, setLabels] = useState<string[]>([])
  const [prices, setPrices] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchHistory() {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/prices?product=${product}&region=${region}&history=true`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error()
        const json = await res.json()
        const data = json.data ?? []

        setLabels(data.map((d: { fetchedAt: string }) => {
          const date = new Date(d.fetchedAt)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }))
        setPrices(data.map((d: { price: number }) => d.price))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLabels([])
        setPrices([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchHistory()
    return () => controller.abort()
  }, [product, region])

  if (isLoading) {
    return (
      <div className="bg-[#1e293b] rounded-lg p-4 h-48 animate-pulse flex items-center justify-center">
        <span className="text-xs text-[#475569]">Loading chart...</span>
      </div>
    )
  }

  if (prices.length < 2) {
    return (
      <div className="bg-[#1e293b] rounded-lg p-4 h-48 flex items-center justify-center">
        <span className="text-xs text-[#475569]">Not enough data points for chart</span>
      </div>
    )
  }

  const config = PRODUCTS[product]

  return (
    <div className="bg-[#1e293b] rounded-lg p-4">
      <div className="text-xs text-[#94a3b8] mb-2">{config.name} — Price History</div>
      <Line
        data={{
          labels,
          datasets: [
            {
              data: prices,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#38bdf8',
              tension: 0.3,
              fill: true,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `$${ctx.parsed.y.toLocaleString()} / ${config.defaultUnit}`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: '#475569', font: { size: 10 } },
              grid: { color: '#334155' },
            },
            y: {
              ticks: {
                color: '#475569',
                font: { size: 10 },
                callback: (v) => `$${v}`,
              },
              grid: { color: '#334155' },
            },
          },
        }}
        height={160}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/price-chart.tsx
git commit -m "feat(sprint3): add PriceChart component with Chart.js line chart"
```

---

### Task 16: Add click handler to PriceCard and chart toggle to RegionView

**Files:**
- Modify: `steelhub/src/components/price-card.tsx`
- Modify: `steelhub/src/components/region-view.tsx`

- [ ] **Step 1: Add onClick prop to PriceCard**

In `steelhub/src/components/price-card.tsx`, add `onClick?: () => void` to `PriceCardProps`. Add `onClick` to the destructured props. On both the available and N/A card `<div>` wrappers, add `onClick={onClick}` and `className` should include `cursor-pointer` when onClick is provided.

For the available card div, change to:
```tsx
    <div
      className={`bg-[#1e293b] rounded-lg p-3.5 border-l-[3px] border-[#38bdf8] hover:bg-[#253449] transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
```

- [ ] **Step 2: Add chart toggle state to RegionView**

In `steelhub/src/components/region-view.tsx`:

Add import at the top:
```tsx
import { PriceChart } from './price-chart'
import { SteelProduct } from '@/lib/types'
```

Add state after existing state declarations:
```tsx
const [selectedProduct, setSelectedProduct] = useState<SteelProduct | null>(null)
```

Add `import { useState } from 'react'` if not already imported (it should be).

Pass `onProductSelect` to PriceGrid:
```tsx
<PriceGrid prices={prices} isLoading={isLoading} onProductSelect={(p) => {
  setSelectedProduct(prev => prev === p ? null : p)
}} />
```

Add chart panel after PriceGrid:
```tsx
{selectedProduct && (
  <div className="mt-4">
    <PriceChart product={selectedProduct} region={region} />
  </div>
)}
```

- [ ] **Step 3: Update PriceGrid to pass onClick to PriceCards**

In `steelhub/src/components/price-grid.tsx`, add `SteelProduct` to the import from `@/lib/types` (currently only imports `PriceResponse`). Then add `onProductSelect?: (product: SteelProduct) => void` to `PriceGridProps`. In the PriceCard render, add:
```tsx
onClick={onProductSelect ? () => onProductSelect(productId) : undefined}
```

- [ ] **Step 4: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/price-card.tsx src/components/region-view.tsx src/components/price-grid.tsx
git commit -m "feat(sprint3): add clickable price cards with chart toggle"
```

---

## Chunk 5: Dedicated Pages & Navigation

### Task 17: Refactor Sidebar with Link navigation and optional regions

**Files:**
- Modify: `steelhub/src/components/sidebar.tsx`

- [ ] **Step 1: Refactor Sidebar**

Replace the entire contents of `steelhub/src/components/sidebar.tsx`:

```tsx
// src/components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, DollarSign, Newspaper } from 'lucide-react'
import { REGIONS, DAILY_REGIONS, WEEKLY_REGIONS } from '@/config/regions'
import { Region } from '@/lib/types'

interface SidebarProps {
  selectedRegion?: Region
  onRegionSelect?: (region: Region) => void
}

export function Sidebar({ selectedRegion, onRegionSelect }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/prices', label: 'Prices', icon: DollarSign },
    { href: '/news', label: 'News', icon: Newspaper },
  ]

  return (
    <aside className="hidden md:flex w-[220px] bg-[#1e293b] p-5 flex-col border-r border-[#334155] flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <Link href="/" className="text-[#38bdf8] font-bold text-lg mb-6 tracking-wide block">
        SteelHub
      </Link>

      {/* Nav Links */}
      <nav className="mb-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-md text-[13px] mb-1 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'bg-[#0f172a] text-[#e2e8f0]'
                  : 'text-[#64748b] hover:bg-[#0f172a] hover:text-[#94a3b8]'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </Link>
          )
        })}
      </nav>

      {/* Region list — only on Dashboard */}
      {onRegionSelect && selectedRegion && (
        <>
          <div className="border-t border-[#334155] my-4" />

          <div className="text-[10px] text-[#475569] uppercase tracking-[1.5px] mb-2 px-3">
            Daily
          </div>
          {DAILY_REGIONS.map(regionId => {
            const region = REGIONS[regionId]
            const isActive = selectedRegion === regionId
            return (
              <button
                key={regionId}
                onClick={() => onRegionSelect(regionId)}
                className={`w-full text-left px-3 py-1.5 text-xs mb-0.5 border-l-2 rounded-r transition-colors ${
                  isActive
                    ? 'text-[#38bdf8] bg-[#0f172a] border-[#38bdf8]'
                    : 'text-[#94a3b8] border-transparent hover:text-[#e2e8f0] hover:bg-[#0f172a]'
                }`}
              >
                {region.name}
              </button>
            )
          })}

          <div className="text-[10px] text-[#475569] uppercase tracking-[1.5px] mb-2 mt-4 px-3">
            Weekly
          </div>
          {WEEKLY_REGIONS.map(regionId => {
            const region = REGIONS[regionId]
            const isActive = selectedRegion === regionId
            return (
              <button
                key={regionId}
                onClick={() => onRegionSelect(regionId)}
                className={`w-full text-left px-3 py-1.5 text-xs mb-0.5 border-l-2 rounded-r transition-colors ${
                  isActive
                    ? 'text-[#38bdf8] bg-[#0f172a] border-[#38bdf8]'
                    : 'text-[#475569] border-transparent hover:text-[#94a3b8] hover:bg-[#0f172a]'
                }`}
              >
                {region.name}
              </button>
            )
          })}
        </>
      )}

      {/* Footer */}
      <div className="mt-auto text-[10px] text-[#334155]">
        Anti-Gravity Studio
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat(sprint3): refactor Sidebar with Link navigation and optional regions"
```

---

### Task 18: Create PageLayout for dedicated pages

**Files:**
- Create: `steelhub/src/components/page-layout.tsx`

- [ ] **Step 1: Create PageLayout**

```tsx
// src/components/page-layout.tsx
'use client'

import { Sidebar } from './sidebar'

interface PageLayoutProps {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/page-layout.tsx
git commit -m "feat(sprint3): add PageLayout wrapper for dedicated pages"
```

---

### Task 19: Create dedicated Prices page

**Files:**
- Create: `steelhub/src/app/prices/page.tsx`
- Modify: `steelhub/src/app/api/prices/route.ts` (make region optional)

- [ ] **Step 1: Make region optional in prices API**

In `steelhub/src/app/api/prices/route.ts`, the `region` param is already optional (passed as `region || undefined`). Verify this — if it currently requires region, remove the requirement so it returns all prices when no region is specified.

- [ ] **Step 2: Create Prices page**

```tsx
// src/app/prices/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { PriceResponse, SteelProduct, Region, StaleLevel } from '@/lib/types'
import { PRODUCTS } from '@/config/products'
import { REGIONS } from '@/config/regions'

type SortKey = 'product' | 'region' | 'price' | 'updatedAt'
type SortDir = 'asc' | 'desc'

export default function PricesPage() {
  const [prices, setPrices] = useState<PriceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('product')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    async function fetchPrices() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/prices?limit=200')
        if (!res.ok) throw new Error()
        const json = await res.json()
        setPrices(json.data ?? [])
      } catch {
        setPrices([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchPrices()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...prices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'product': return dir * a.product.localeCompare(b.product)
      case 'region': return dir * a.region.localeCompare(b.region)
      case 'price': return dir * (a.price - b.price)
      case 'updatedAt': return dir * (new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
      default: return 0
    }
  })

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const staleDot = (level: StaleLevel) => {
    const color = level === 'fresh' ? 'bg-[#4ade80]' : level === 'day-old' ? 'bg-[#fbbf24]' : 'bg-[#f87171]'
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
  }

  return (
    <PageLayout>
      <h1 className="text-xl font-semibold text-[#e2e8f0] mb-4">All Prices</h1>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#1e293b] rounded" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155] text-[#64748b] text-xs">
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('product')}>
                  Product{sortIcon('product')}
                </th>
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('region')}>
                  Region{sortIcon('region')}
                </th>
                <th className="text-right py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('price')}>
                  Price (USD){sortIcon('price')}
                </th>
                <th className="text-left py-2 px-3">Unit</th>
                <th className="text-left py-2 px-3">Source</th>
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('updatedAt')}>
                  Updated{sortIcon('updatedAt')}
                </th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={`${p.product}-${p.region}-${i}`} className="border-b border-[#334155]/50 hover:bg-[#1e293b] transition-colors">
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{PRODUCTS[p.product]?.name || p.product}</td>
                  <td className="py-2.5 px-3 text-[#94a3b8]">{REGIONS[p.region]?.name || p.region}</td>
                  <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-mono">
                    ${p.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 px-3 text-[#64748b]">{p.unit}</td>
                  <td className="py-2.5 px-3 text-[#64748b]">{p.source}</td>
                  <td className="py-2.5 px-3 text-[#64748b]">{new Date(p.fetchedAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-center">{staleDot(p.staleLevel)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#475569]">No price data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/prices/page.tsx src/app/api/prices/route.ts
git commit -m "feat(sprint3): add dedicated Prices page with sortable table"
```

---

### Task 20: Create dedicated News page

**Files:**
- Create: `steelhub/src/app/news/page.tsx`

- [ ] **Step 1: Create News page**

```tsx
// src/app/news/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { NewsCard } from '@/components/news-card'
import { Region, Category } from '@/lib/types'
import { REGIONS, ALL_REGIONS } from '@/config/regions'
import { CATEGORIES, ALL_CATEGORIES } from '@/config/categories'

interface NewsItem {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  region: Region
  country?: string
  confidence?: number
  publishedAt?: string
  fetchedAt: string
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [regionFilter, setRegionFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [countryFilter, setCountryFilter] = useState<string>('')

  const countries = regionFilter
    ? REGIONS[regionFilter as Region]?.countries ?? []
    : []

  useEffect(() => {
    const controller = new AbortController()

    async function fetchNews() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ limit: '50' })
        if (regionFilter) params.set('region', regionFilter)
        if (categoryFilter) params.set('category', categoryFilter)
        if (countryFilter) params.set('country', countryFilter)

        const res = await fetch(`/api/news?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setNews(json.data ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setNews([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchNews()
    return () => controller.abort()
  }, [regionFilter, categoryFilter, countryFilter])

  // Reset country when region changes
  useEffect(() => {
    setCountryFilter('')
  }, [regionFilter])

  const selectClass = 'text-xs bg-[#1e293b] text-[#94a3b8] border border-[#334155] rounded px-2 py-1.5 outline-none focus:border-[#38bdf8]'

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#e2e8f0]">News</h1>
        <div className="flex gap-2">
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={selectClass}>
            <option value="">All Regions</option>
            {ALL_REGIONS.map(r => (
              <option key={r} value={r}>{REGIONS[r].name}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORIES[c].nameEn}</option>
            ))}
          </select>
          {countries.length > 0 && (
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className={selectClass}>
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-full mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-[#1e293b] rounded-lg p-8 text-center border border-[#334155]">
          <p className="text-sm text-[#475569]">No news found matching your filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {news.map((item, i) => (
            <NewsCard
              key={`${item.title}-${i}`}
              title={item.title}
              url={item.url}
              snippet={item.snippet}
              source={item.source}
              category={item.category}
              confidence={item.confidence}
              publishedAt={item.publishedAt}
            />
          ))}
        </div>
      )}
    </PageLayout>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd steelhub && npm run build
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/news/page.tsx
git commit -m "feat(sprint3): add dedicated News page with region/category/country filters"
```

---

### Task 21: Final verification and push

**Files:**
- No new files

- [ ] **Step 1: Run production build**

```bash
cd steelhub && npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 2: Run lint**

```bash
cd steelhub && npm run lint
```

Expected: No errors.

- [ ] **Step 3: Manual smoke test**

```bash
cd steelhub && npm run dev
```

Verify:
1. Dashboard loads, sidebar shows active page highlighting
2. Click "Prices" in sidebar → navigates to `/prices` with sortable table
3. Click "News" in sidebar → navigates to `/news` with filters
4. Click "Dashboard" → back to dashboard with region navigation
5. On dashboard, click a price card → chart panel appears below grid
6. Click same card again → chart hides
7. News section on dashboard shows placeholder (no data until cron runs)
8. Responsive: sidebar hidden on mobile

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(sprint3): polish and fix any build issues"
```

- [ ] **Step 5: Push to remote**

```bash
git push origin main
```

---

## Success Criteria (from spec)

1. News articles fetched automatically (cron route works)
2. Headlines classified into correct categories via Groq/Llama
3. Dashboard shows top 5 news per region with country filter
4. Dedicated News page with region/category/country filters works
5. Price cards are clickable → show historical line chart
6. Dedicated Prices page shows sortable table of all prices
7. Sidebar navigation works across all 3 pages
8. Build passes with no TypeScript/ESLint errors
9. Groq classifier falls back to keyword matching gracefully
