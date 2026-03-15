# Sprint 3 — News, Charts & Dedicated Pages Design Spec

## Goal

Add real-time news with AI classification, simple price trend charts, and dedicated Prices/News pages to the SteelHub dashboard.

## Scope

Three subsystems:
1. **News system** — Fetch, classify, store, display news articles
2. **Price charts** — Simple line charts showing historical price data
3. **Dedicated pages** — Prices table page + News listing page with filters

## Prerequisites (changes to existing code)

Before implementing Sprint 3 features, these existing files need updates:

1. **Add `country` to `NewsFilter`** in `src/lib/types.ts`:
   - Add `country?: string` field to the `NewsFilter` interface
   - Without this, the country filter on dashboard and News page cannot work

2. **Add country filter to `getNews()`** in `src/providers/storage/supabase.ts`:
   - Add `.eq('country', filters.country)` clause when `country` is provided

3. **Add `ascending` option to `getPrices()`** in `src/providers/storage/supabase.ts`:
   - Currently hardcodes `ascending: false` — needs an option for chart data (ASC order)
   - Add `ascending?: boolean` to `PriceFilter` in `types.ts`

4. **Add news deduplication**:
   - New migration: `CREATE UNIQUE INDEX idx_news_unique ON news(url) WHERE url IS NOT NULL;`
   - Update `saveNews()` to use `ON CONFLICT (url) DO NOTHING`
   - Also add: `CREATE INDEX idx_news_country ON news(region, country);` for country filter performance

## Part 1: News System

### Data Flow

```
GitHub Actions cron (every 6h)
  → POST /api/cron/news?region=far-east
    → NewsAPI.org fetches articles (100 queries/day free)
      → Noise filter (trusted-domains.ts keywords)
      → Domain tier scoring (Tier 1/2 confidence boost)
      → Groq classifier (Llama 3.1 8B) → category + confidence
      → Falls back to keyword matching if Groq unavailable
    → If NewsAPI fails → Brave Search fallback
    → Store in Supabase `news` table
  → Repeat for each region

Dashboard / News page
  → GET /api/news?region=X&category=Y&country=Z&limit=20
    → Query Supabase `news` table
    → Return JSON
```

### Groq Classifier

- **Provider:** Groq free tier (no cost at ~100 articles/day)
- **Model:** Llama 3.1 8B (fast, sufficient for text classification)
- **Input:** Headline + snippet
- **Output:** `{ category: Category, confidence: number, isRelevant: boolean }`
- **Prompt:** System prompt listing the 5 categories with descriptions, asks model to classify
- **Timeout:** Use `AbortController` with 3-second signal for each Groq request
- **Fallback:** If Groq API fails or times out (3s), fall back to keyword matching from `categories.ts`
- **File:** `src/providers/ai/classifier.ts`

### News Providers

**NewsAPI provider** (`src/providers/news/newsapi.ts`)
- Implements `NewsProvider` interface (already defined in `interfaces.ts`)
- Searches using category keywords + region country names as query
- Applies `isNoise()` filter from `trusted-domains.ts`
- Applies `getDomainTier()` confidence boost
- Passes each article through Groq classifier
- Returns `NewsItem[]`
- Env var: `NEWSAPI_KEY` (already configured)

**Brave Search provider** (`src/providers/news/brave.ts`)
- Same pattern as NewsAPI, different API
- Kicks in if NewsAPI fails (fallback order in factory)
- Env var: `BRAVE_API_KEY` (already configured)

### News Factory

- Add `createNewsProviders()` to `src/providers/factory.ts`
- Returns `[NewsAPIProvider, BraveSearchProvider]` in fallback order
- Add `createClassifier()` returning the Groq classifier

### API Routes

**GET `/api/news`** (`src/app/api/news/route.ts`)
- Query params: `region`, `category`, `country`, `limit` (default 20, max 100)
- All params optional — omit for unfiltered
- Queries Supabase via `storage.getNews(filters)`
- Returns `{ data: NewsItem[] }`
- Protected by existing auth middleware (`src/middleware.ts` — redirects to `/login` if no auth cookie)

**POST `/api/cron/news`** (`src/app/api/cron/news/route.ts`)
- Query param: `region` (required)
- Fetches news for all 5 categories for that region
- Runs through classifier
- Stores via `storage.saveNews(items)`
- Returns `{ success: true, count: N, warnings: string[] }` (report partial failures per category)
- Excluded from auth middleware (cron routes whitelisted in `middleware.ts`)
- Secured by `Authorization: Bearer <CRON_SECRET>` header (same pattern as `cron/prices`)

### Dashboard NewsList Update

- Replace placeholder in `src/components/news-list.tsx`
- Fetches `GET /api/news?region=X&limit=5`
- Shows top 5 headlines with: title (linked if `url` exists, plain text if not), source badge, time ago, category badge
- Country dropdown filter above the list
- Loading skeleton while fetching

### News Page

- `src/app/news/page.tsx` — dedicated page
- Full news listing with card layout
- Filters: region dropdown, category dropdown, country dropdown
- Each card: headline (linked), snippet, source badge, category badge, time ago
- Sidebar "News" link becomes active navigation to this page

## Part 2: Price Charts

### Approach

Simple line chart per product using Chart.js (already installed). Shows all available historical data points from Supabase. No date range picker or complex controls.

### API Change

**Modify `GET /api/prices`** — Add `history=true` param:
- `GET /api/prices?region=far-east&product=HRC&history=true`
- When `history=true`: **requires `product` param** (returns error without it). Returns all data points for that product+region, ordered by `fetchedAt` ASC (oldest first, for charting). Limit raised to 500.
- When `history` omitted: existing behavior (latest prices, DESC order)
- Response: `{ data: PriceResponse[] }` (same shape, just more entries)
- Note: `fetchedAt` is an ISO string — chart component must parse to `Date` for X-axis

### Chart Component

- **File:** `src/components/price-chart.tsx`
- Uses `react-chartjs-2` `Line` component (already installed)
- Props: `product: SteelProduct`, `region: Region`
- Fetches historical data on mount
- Slate Navy themed: dark background (`#1e293b`), accent-colored line (`#38bdf8`), muted grid lines (`#334155`)
- X-axis: dates, Y-axis: price (USD)
- Responsive, fits within the card area

### Integration with Dashboard

- Clicking a PriceCard in RegionView toggles a chart panel below the price grid
- Shows the chart for the clicked product in the current region
- Click again or click another product to switch
- Lightweight — no modal, just an expandable area

## Part 3: Dedicated Pages

### Prices Page

- **File:** `src/app/prices/page.tsx`
- Simple table view of all current prices across all regions
- Columns: Product, Region, Price (USD), Unit, Source, Last Updated, Stale Status
- Sortable by clicking column headers (client-side sort)
- Fetches `GET /api/prices` (no region filter = all prices)
- Slate Navy themed table with hover rows
- No filters needed yet — just a sortable table

### API Change for Prices Page

- Modify `GET /api/prices` to return all prices when no `region` param is specified
- Currently requires region — make it optional (return all if omitted)

### Sidebar Navigation Update

- **Modify:** `src/components/sidebar.tsx`
- "Prices" link → navigates to `/prices`
- "News" link → navigates to `/news`
- "Dashboard" link → navigates to `/`
- Use Next.js `<Link>` component
- Highlight active page based on current pathname (use `usePathname()`)
- **Region list:** Only shown on Dashboard page (where it controls in-page state). Hidden on Prices/News pages where regions are filters, not navigation.

### Sidebar Architecture

The sidebar has two responsibilities that need to be separated:
1. **Page navigation** (Dashboard/Prices/News) — always visible, uses `<Link>` + `usePathname()`
2. **Region selection** (Far East, Asia, etc.) — only on Dashboard page, controls in-page state

**Approach:** Sidebar accepts optional `selectedRegion` and `onRegionSelect` props. When provided (Dashboard page), it shows the region list. When omitted (Prices/News pages), it shows only page navigation. No global state or context needed.

### Layout for Dedicated Pages

- Create a shared layout wrapper: `src/app/(dashboard)/layout.tsx` using Next.js route groups
- This layout renders the Sidebar (nav-only mode) + main content area
- Dashboard page passes region props to Sidebar
- Prices and News pages get Sidebar without region selection
- All pages share the same visual structure (sidebar left, content right)

## New Dependencies

- `groq-sdk` — Groq API client (npm package)
- No other new packages needed

## Environment Variables

- `GROQ_API_KEY` — Groq free tier API key (new, required)
- `NEWSAPI_KEY` — Already configured
- `BRAVE_API_KEY` — Already configured
- `CRON_SECRET` — Already configured

## Cron Schedule Update

Add news fetching to GitHub Actions workflow:
- Every 6 hours: fetch news for all 7 regions
- Calls `POST /api/cron/news?region=X` for each region sequentially
- Same pattern as price cron (per-region to stay under Vercel 10s timeout)
- **Rate limit strategy:** NewsAPI allows 100 queries/day. With 7 regions x 4 fetches/day = 28 queries (batch all 5 categories into a single broad query per region, then classify results). This leaves ~72 queries/day headroom.

## Out of Scope (Sprint 4+)

- Complex charting tools (PowerBI integration)
- Date range picker for charts
- News sentiment analysis visualization
- Export/download features
- Advanced price filters on dedicated page
- Mobile hamburger menu
- Dark/light theme toggle

## Success Criteria

1. News articles fetched automatically every 6 hours
2. Headlines classified into correct categories via Groq/Llama
3. Dashboard shows top 5 news per region with country filter
4. Dedicated News page with region/category/country filters works
5. Price cards are clickable → show historical line chart
6. Dedicated Prices page shows sortable table of all prices
7. Sidebar navigation works across all 3 pages
8. Build passes with no TypeScript/ESLint errors
9. Groq classifier falls back to keyword matching gracefully
