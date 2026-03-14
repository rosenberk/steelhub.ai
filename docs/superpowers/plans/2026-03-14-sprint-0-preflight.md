# Sprint 0 — Pre-Flight Checklist Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the SteelHub project with all external services configured, project scaffolded, and connectivity verified — so Sprint 1 can start coding immediately.

**Architecture:** Next.js 14 App Router project with Supabase Postgres for storage, Vercel Hobby for deployment, GitHub Actions for cron scheduling. Provider pattern allows swapping data sources via env vars.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres), Vercel, GitHub Actions

---

## Chunk 1: Project Scaffold + Git Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: `steelhub/` (project root via create-next-app)

- [ ] **Step 1: Create Next.js 14 project with TypeScript + Tailwind**

```bash
cd "C:/Users/berka/OneDrive/Desktop/Steelhub.ai project"
npx create-next-app@14 steelhub --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --use-npm --no-turbopack
```

Expected: Project created at `steelhub/` with `src/app/` structure.

- [ ] **Step 2: Verify project runs**

```bash
cd steelhub && npm run dev
```

Expected: Dev server starts on http://localhost:3000

- [ ] **Step 3: Stop dev server (Ctrl+C)**

---

### Task 2: Initialize Git Repository

**Files:**
- Modify: `steelhub/.gitignore`
- Create: `steelhub/.env.example`
- Create: `steelhub/.env.local`

- [ ] **Step 1: Verify .gitignore (create-next-app already ran git init)**

- [ ] **Step 2: Add environment-specific entries to .gitignore**

Append to `.gitignore`:

```
# Environment
.env.local
.env.production

# Supabase
supabase/.temp/
```

- [ ] **Step 3: Create .env.example with all required variables**

```env
# === Provider Selection ===
PRICE_PROVIDER=webscraping-ai     # webscraping-ai | yahoo | metals-api
NEWS_PROVIDER=newsapi             # newsapi | brave | brave-paid
AI_PARSER=regex                   # regex | claude-haiku
STORAGE_PROVIDER=supabase         # supabase

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=         # https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key (frontend, READ only)
SUPABASE_SERVICE_ROLE_KEY=        # Service role (server-side, WRITE — SECRET!)

# === API Keys ===
NEWSAPI_KEY=                      # NewsAPI.org (100 queries/day free)
BRAVE_API_KEY=                    # Brave Search API (fallback/deep-dive)
WEBSCRAPING_AI_KEY=               # WebScraping.AI (2,000 calls/month free)
METALS_API_KEY=                   # Metals-API (Phase 1)
ANTHROPIC_API_KEY=                # Claude API (Phase 2)

# === Auth ===
AUTH_PIN=                         # Min 6 chars (letters + numbers)
AUTH_SECRET=                      # Cookie secret (min 32 chars random)

# === Update Schedule ===
NEWS_DAILY_REGIONS=far-east,asia,cis,eu
NEWS_WEEKLY_REGIONS=africa,north-america,south-america

# === Cron ===
CRON_SECRET=                      # Vercel cron auth token

# === Currency ===
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

- [ ] **Step 4: Create .env.local with placeholder values**

```env
PRICE_PROVIDER=webscraping-ai
NEWS_PROVIDER=newsapi
AI_PARSER=regex
STORAGE_PROVIDER=supabase

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEWSAPI_KEY=
BRAVE_API_KEY=
WEBSCRAPING_AI_KEY=
METALS_API_KEY=
ANTHROPIC_API_KEY=

AUTH_PIN=steelhub2026
AUTH_SECRET=

NEWS_DAILY_REGIONS=far-east,asia,cis,eu
NEWS_WEEKLY_REGIONS=africa,north-america,south-america

CRON_SECRET=
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

- [ ] **Step 5: Initial commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project with TypeScript + Tailwind"
```

---

### Task 3: Install Core Dependencies

**Files:**
- Modify: `steelhub/package.json`

- [ ] **Step 1: Install shadcn/ui prerequisites**

```bash
npx shadcn@latest init -d
```

- [ ] **Step 2: Install project dependencies**

```bash
npm install @supabase/supabase-js cheerio chart.js react-chartjs-2 yahoo-finance2
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D dotenv tsx
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add core dependencies (supabase, cheerio, chart.js, shadcn)"
```

---

## Chunk 2: External Service Setup (Manual Steps)

### Task 4: Supabase Project Setup

> **These steps require manual browser actions.** Follow each step, then update `.env.local` with the values.

- [ ] **Step 1: Create Supabase project**

1. Go to https://supabase.com/dashboard → New Project
2. Name: `steelhub`
3. Region: Choose closest (EU West recommended for Turkey)
4. Generate a strong database password — save it
5. Wait for project to provision (~2 minutes)

- [ ] **Step 2: Get API keys**

1. Go to Project Settings → API
2. Copy **Project URL** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → paste as `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Run initial schema in Supabase SQL Editor**

Go to SQL Editor → New Query → paste and run:

```sql
-- Prices table
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
  -- unique index below (expressions not allowed in UNIQUE constraint)
);

-- News table
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

-- Last successful data (fallback cache)
CREATE TABLE last_successful (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_type, region)
);

-- Sentiment index (weekly snapshot)
CREATE TABLE sentiment_index (
  id SERIAL PRIMARY KEY,
  region VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL,
  week_start DATE NOT NULL,
  avg_sentiment DECIMAL(3,2),
  news_count INTEGER,
  price_change_pct DECIMAL(5,2),
  correlation_score DECIMAL(3,2),
  divergence_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(region, category, week_start)
);

-- Login attempts (brute force protection)
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- Rate limits
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50),
  ip_address VARCHAR(45),
  window_start TIMESTAMP,
  request_count INTEGER DEFAULT 1,
  UNIQUE(endpoint, ip_address, window_start)
);

-- Exchange rates cache
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency VARCHAR(3) DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW(),
  -- unique index below (expressions not allowed in UNIQUE constraint)
);

-- Discovered sources (dynamic source discovery)
CREATE TABLE discovered_sources (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(100) NOT NULL UNIQUE,
  region VARCHAR(20),
  category VARCHAR(20),
  hit_count INTEGER DEFAULT 1,
  quality_score DECIMAL(3,2),
  is_approved BOOLEAN DEFAULT FALSE,
  discovered_at TIMESTAMP DEFAULT NOW()
);

-- Unique indexes (expression-based)
CREATE UNIQUE INDEX idx_prices_unique_daily ON prices(product, region, country, (fetched_at::date));
CREATE UNIQUE INDEX idx_exchange_rates_unique_daily ON exchange_rates(target_currency, (fetched_at::date));

-- Indexes
CREATE INDEX idx_prices_region_product ON prices(region, product);
CREATE INDEX idx_prices_fetched ON prices(fetched_at DESC);
CREATE INDEX idx_news_region_category ON news(region, category);
CREATE INDEX idx_news_fetched ON news(fetched_at DESC);
CREATE INDEX idx_sentiment_week ON sentiment_index(week_start DESC);
CREATE INDEX idx_login_ip ON login_attempts(ip_address, attempted_at);
```

- [ ] **Step 4: Enable RLS and create policies**

Run in SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_successful ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_sources ENABLE ROW LEVEL SECURITY;

-- Anon key: SELECT only on read tables
CREATE POLICY "anon_read_prices" ON prices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_news" ON news FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_sentiment" ON sentiment_index FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_exchange_rates" ON exchange_rates FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_last_successful" ON last_successful FOR SELECT TO anon USING (true);

-- No INSERT/UPDATE/DELETE policies for anon = deny by default
-- Service role key automatically bypasses RLS (used by cron routes)
```

- [ ] **Step 5: Verify RLS is working**

In SQL Editor, switch to "anon" role and try:

```sql
-- This should work (SELECT)
SELECT * FROM prices LIMIT 1;

-- This should fail (INSERT blocked for anon)
INSERT INTO prices (product, region, price) VALUES ('HRC', 'far-east', 500);
```

---

### Task 5: NewsAPI Setup (Primary News Source)

> **Why NewsAPI over Brave:** 100 free queries/day (~3,000/month) vs Brave's $5/month for 1,000. Articles have 24h delay — acceptable for steel market intelligence.

- [ ] **Step 1: Create NewsAPI account**

1. Go to https://newsapi.org/register
2. Sign up (free Developer plan)
3. Copy API key → paste into `.env.local` as `NEWSAPI_KEY`

- [ ] **Step 2: Create NewsAPI verification script**

```typescript
// scripts/verify-newsapi.ts
// Run with: npx tsx scripts/verify-newsapi.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) {
    console.error('❌ NEWSAPI_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing NewsAPI.org...\n')

  // Test: search for steel industry news
  const res = await fetch(
    `https://newsapi.org/v2/everything?q=steel+HRC+price&language=en&pageSize=5&apiKey=${apiKey}`
  )

  if (!res.ok) {
    const err = await res.json()
    console.error(`❌ HTTP ${res.status}: ${err.message}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ API working — ${data.totalResults} total results`)
  console.log(`✅ Returned ${data.articles?.length || 0} articles:\n`)

  data.articles?.forEach((a: any, i: number) => {
    console.log(`   ${i + 1}. [${a.source?.name}] ${a.title}`)
  })

  // Test: top headlines for business
  const res2 = await fetch(
    `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=3&apiKey=${apiKey}`
  )

  if (res2.ok) {
    const data2 = await res2.json()
    console.log(`\n✅ Top Headlines endpoint works — ${data2.totalResults} results`)
  }

  console.log('\n🎉 NewsAPI check passed!')
}

verify().catch(console.error)
```

- [ ] **Step 3: Run verification**

```bash
npx tsx scripts/verify-newsapi.ts
```

Expected: Steel-related news articles returned with source names.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-newsapi.ts
git commit -m "feat: add NewsAPI verification script (primary news source)"
```

---

### Task 5b: Brave Search API Setup (Fallback + Deep-Dive)

> Brave is now the fallback for news and used for deep-dive searches. Free $5 credit covers this use case for months.

- [ ] **Step 1: Create Brave Search API account**

1. Go to https://api-dashboard.search.brave.com/
2. Sign up / log in
3. Note: $5 free credit included on signup (~1,000 queries)
4. Copy API key → paste into `.env.local` as `BRAVE_API_KEY`

- [ ] **Step 2: Create Brave verification script**

```typescript
// scripts/verify-brave.ts
// Run with: npx tsx scripts/verify-brave.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    console.error('❌ BRAVE_API_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing Brave Search API (fallback)...\n')

  const res = await fetch(
    'https://api.search.brave.com/res/v1/web/search?q=steel+HRC+price&count=3',
    { headers: { 'X-Subscription-Token': apiKey } }
  )

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}: ${res.statusText}`)
    process.exit(1)
  }

  const data = await res.json()
  const results = data.web?.results || []
  console.log(`✅ API working — ${results.length} results returned`)
  results.forEach((r: any, i: number) => {
    console.log(`   ${i + 1}. ${r.title}`)
  })

  console.log('\n🎉 Brave Search API check passed!')
}

verify().catch(console.error)
```

- [ ] **Step 3: Run verification**

```bash
npx tsx scripts/verify-brave.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-brave.ts
git commit -m "feat: add Brave Search verification script (fallback news source)"
```

---

### Task 5c: WebScraping.AI Setup (Price Scraping with JS Rendering)

> **Why:** WebScraping.AI provides headless Chrome rendering for free (2,000 calls/month). This re-enables TradingEconomics scraping which was blocked by Cloudflare. Yahoo Finance becomes fallback instead of primary.

- [ ] **Step 1: Create WebScraping.AI account**

1. Go to https://webscraping.ai
2. Sign up (free plan: 2,000 API calls/month)
3. Copy API key → paste into `.env.local` as `WEBSCRAPING_AI_KEY`

- [ ] **Step 2: Create WebScraping.AI verification script**

```typescript
// scripts/verify-webscraping.ts
// Run with: npx tsx scripts/verify-webscraping.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.WEBSCRAPING_AI_KEY
  if (!apiKey) {
    console.error('❌ WEBSCRAPING_AI_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing WebScraping.AI (headless Chrome rendering)...\n')

  // Test: fetch TradingEconomics steel HRC page
  const targetUrl = 'https://tradingeconomics.com/commodity/steel'
  const res = await fetch(
    `https://api.webscraping.ai/html?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&js=true`
  )

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}: ${res.statusText}`)
    const body = await res.text()
    console.error(body.substring(0, 200))
    process.exit(1)
  }

  const html = await res.text()
  console.log(`✅ Page fetched — ${html.length} chars of HTML`)

  // Check if we can find price-related content
  const hasPrice = html.includes('Price') || html.includes('price') || html.includes('Last')
  const hasTable = html.includes('<table') || html.includes('data-')
  console.log(`✅ Contains price data: ${hasPrice}`)
  console.log(`✅ Contains structured data: ${hasTable}`)

  // Quick check: does it look like JS rendered?
  const hasScript = html.includes('__NEXT_DATA__') || html.includes('window.')
  console.log(`✅ JS rendered content detected: ${hasScript || html.length > 50000}`)

  console.log(`\n📊 Monthly budget: 2,000 calls`)
  console.log(`📊 SteelHub usage: ~840 calls/month (7 regions × 4 products × 30 days)`)
  console.log(`📊 Remaining: ~1,160 calls for retries/fallbacks`)

  console.log('\n🎉 WebScraping.AI check passed!')
}

verify().catch(console.error)
```

- [ ] **Step 3: Run verification**

```bash
npx tsx scripts/verify-webscraping.ts
```

Expected: HTML content from TradingEconomics with price data visible (JS rendered).

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-webscraping.ts
git commit -m "feat: add WebScraping.AI verification (headless Chrome for price scraping)"
```

---

### Task 6: Generate Auth Secrets

- [ ] **Step 1: Generate AUTH_SECRET (32+ chars random)**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output → paste into `.env.local` as `AUTH_SECRET`

- [ ] **Step 2: Set AUTH_PIN**

Choose a PIN of 6+ characters (letters + numbers). Update `.env.local`:

```
AUTH_PIN=your_chosen_pin_here
```

- [ ] **Step 3: Generate CRON_SECRET**

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Copy the output → paste into `.env.local` as `CRON_SECRET`

---

### Task 6b: Create Auth Middleware Skeleton

> **Why now:** Without this, the first Vercel deploy exposes the dashboard to the public. The middleware must exist before first deploy.

**Files:**
- Create: `steelhub/src/middleware.ts`

- [ ] **Step 1: Create middleware file**

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth for login page, cron API, and static assets
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const authCookie = request.cookies.get('steelhub-auth')
  if (!authCookie || authCookie.value !== process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Create minimal login page**

```typescript
// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Invalid PIN')
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg shadow-lg w-80">
        <h1 className="text-xl font-bold text-white mb-6 text-center">SteelHub</h1>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className="w-full p-3 bg-gray-800 text-white rounded mb-4 border border-gray-700 focus:border-blue-500 outline-none"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-medium"
        >
          Login
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create login API route**

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { pin } = await request.json()

  if (pin === process.env.AUTH_PIN) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('steelhub-auth', process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/app/login/page.tsx src/app/api/auth/login/route.ts
git commit -m "feat: add auth middleware + login page (protect dashboard from first deploy)"
```

---

## Chunk 3: Connectivity Verification + Config Files

### Task 7: Verify Supabase Connectivity

**Files:**
- Create: `steelhub/src/lib/supabase.ts`
- Create: `steelhub/scripts/verify-supabase.ts`

- [ ] **Step 1: Create Supabase client helper**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Frontend client (anon key — READ only)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side client (service role — full access)
// ONLY use in API routes and server components
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Create verification script**

```typescript
// scripts/verify-supabase.ts
// Run with: npx tsx scripts/verify-supabase.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function verify() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Test write (service role)
  const { error: insertError } = await supabase
    .from('prices')
    .insert({
      product: 'HRC',
      region: 'far-east',
      country: 'China',
      price: 405.00,
      source: 'test'
    })

  if (insertError) {
    console.error('❌ INSERT failed:', insertError.message)
    process.exit(1)
  }
  console.log('✅ INSERT works (service role)')

  // Test read
  const { data, error: selectError } = await supabase
    .from('prices')
    .select('*')
    .eq('source', 'test')

  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message)
    process.exit(1)
  }
  console.log('✅ SELECT works:', data?.length, 'rows')

  // Cleanup test data
  await supabase.from('prices').delete().eq('source', 'test')
  console.log('✅ Cleanup done')

  // Test anon key (should only read)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error: anonInsertError } = await anonClient
    .from('prices')
    .insert({ product: 'TEST', region: 'test', price: 0, source: 'test' })

  if (anonInsertError) {
    console.log('✅ Anon INSERT correctly blocked:', anonInsertError.message)
  } else {
    console.error('❌ WARNING: Anon key can INSERT — RLS not configured!')
    await supabase.from('prices').delete().eq('source', 'test')
    process.exit(1)
  }

  console.log('\n🎉 All Supabase checks passed!')
}

verify().catch(console.error)
```

- [ ] **Step 3: Run verification**

```bash
npx tsx scripts/verify-supabase.ts
```

Expected: All checks pass with ✅

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts scripts/verify-supabase.ts package.json package-lock.json
git commit -m "feat: add Supabase client helper and connectivity verification"
```

---

### Task 8: Verify Yahoo Finance API (Fallback Price Source)

**Files:**
- Create: `steelhub/scripts/verify-yahoo.ts`

- [ ] **Step 1: Create Yahoo Finance verification script**

```typescript
// scripts/verify-yahoo.ts
// Run with: npx tsx scripts/verify-yahoo.ts
// Requires: npm install yahoo-finance2

import yahooFinance from 'yahoo-finance2'

const YAHOO_SYMBOLS = {
  'Iron Ore': 'TIO=F',           // SGX Iron Ore 62% Fe
  'Coking Coal': 'MTF=F',        // Coal futures
  'HRC Steel': 'HRC=F',          // US HRC futures (if available)
  'BDI': '^BDI',                 // Baltic Dry Index
}

async function verify() {
  console.log('Testing Yahoo Finance via yahoo-finance2 package...\n')

  for (const [name, symbol] of Object.entries(YAHOO_SYMBOLS)) {
    try {
      const quote = await yahooFinance.quote(symbol)
      if (quote && quote.regularMarketPrice) {
        console.log(`✅ ${name} (${symbol}): ${quote.regularMarketPrice} ${quote.currency || 'USD'}`)
      } else {
        console.log(`⚠️  ${name} (${symbol}): No price in response`)
      }
    } catch (err: any) {
      console.log(`❌ ${name} (${symbol}): ${err.message}`)
    }
  }

  console.log('\nDone. Symbols with ⚠️/❌ may need alternative tickers for Sprint 1.')
}

verify().catch(console.error)
```

- [ ] **Step 2: Run verification**

```bash
npx tsx scripts/verify-yahoo.ts
```

Expected: At least Iron Ore and BDI should return valid prices. Note which symbols work — we'll adjust tickers in Sprint 1 based on results.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-yahoo.ts
git commit -m "feat: add Yahoo Finance API verification script"
```

---

### Task 9: Verify ExchangeRate API

**Files:**
- Create: `steelhub/scripts/verify-exchange-rate.ts`

- [ ] **Step 1: Create ExchangeRate verification script**

```typescript
// scripts/verify-exchange-rate.ts
// Run with: npx tsx scripts/verify-exchange-rate.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

const NEEDED_CURRENCIES = ['CNY', 'EUR', 'TRY', 'RUB', 'INR', 'JPY', 'KRW']

async function verify() {
  console.log('Testing ExchangeRate-API...\n')

  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ Base: ${data.base}, Date: ${data.date}`)
  console.log(`✅ Total currencies: ${Object.keys(data.rates).length}\n`)

  for (const currency of NEEDED_CURRENCIES) {
    if (data.rates[currency]) {
      console.log(`✅ USD/${currency}: ${data.rates[currency]}`)
    } else {
      console.log(`❌ ${currency}: NOT AVAILABLE`)
    }
  }

  console.log('\n🎉 ExchangeRate-API check complete!')
}

verify().catch(console.error)
```

- [ ] **Step 2: Run verification**

```bash
npx tsx scripts/verify-exchange-rate.ts
```

Expected: All 7 currencies available.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-exchange-rate.ts
git commit -m "feat: add ExchangeRate API verification script"
```

---

### Task 10: Create Baseline Prices Snapshot

**Files:**
- Create: `steelhub/src/config/baseline-prices.json`

- [ ] **Step 1: Create baseline prices file with current reference prices**

```json
{
  "snapshotDate": "2026-03-14",
  "note": "Static fallback prices — used when all live sources fail. Update periodically.",
  "prices": {
    "HRC": {
      "far-east": 405,
      "asia": 520,
      "eu": 650,
      "cis": 430,
      "africa": 550,
      "north-america": 720,
      "south-america": 560
    },
    "CRC": {
      "far-east": 480,
      "asia": 590,
      "eu": 750,
      "cis": 510,
      "africa": 620,
      "north-america": 830,
      "south-america": 640
    },
    "Rebar": {
      "far-east": 420,
      "asia": 500,
      "eu": 600,
      "cis": 410,
      "africa": 530,
      "north-america": 680,
      "south-america": 520
    },
    "Scrap": {
      "far-east": 320,
      "asia": 380,
      "eu": 340,
      "cis": 310,
      "africa": 350,
      "north-america": 370,
      "south-america": 330
    },
    "IronOre": {
      "far-east": 110,
      "asia": 115,
      "eu": 120,
      "cis": 105,
      "africa": 112,
      "north-america": 118,
      "south-america": 108
    },
    "CokingCoal": {
      "far-east": 220,
      "asia": 230,
      "eu": 240,
      "cis": 210,
      "africa": 225,
      "north-america": 235,
      "south-america": 215
    },
    "Slab": {
      "far-east": 390,
      "asia": 460,
      "eu": 560,
      "cis": 400,
      "africa": 480,
      "north-america": 620,
      "south-america": 470
    },
    "Billet": {
      "far-east": 400,
      "asia": 470,
      "eu": 540,
      "cis": 390,
      "africa": 490,
      "north-america": 600,
      "south-america": 460
    },
    "BDI": {
      "global": 1850
    }
  },
  "currency": "USD",
  "unit": "MT"
}
```

> **Note to Berkay:** These are approximate reference prices. You should verify and adjust them against current market data before deploy.

- [ ] **Step 2: Commit**

```bash
git add src/config/baseline-prices.json
git commit -m "feat: add baseline prices static snapshot (4th fallback layer)"
```

---

## Chunk 4: Vercel + GitHub Setup

### Task 11: Create Vercel Configuration

**Files:**
- Create: `steelhub/vercel.json`

- [ ] **Step 1: Create vercel.json with cron config**

```json
{
  "crons": [
    {
      "path": "/api/cron/all",
      "schedule": "0 6 * * *"
    }
  ]
}
```

> Note: Vercel Hobby allows only 1 cron job — this single `/api/cron/all` endpoint orchestrates all tasks. Primary scheduling is via GitHub Actions (no timeout limits). This Vercel cron is a fallback only.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel cron configuration"
```

---

### Task 12: Create GitHub Actions Workflow

**Files:**
- Create: `steelhub/.github/workflows/cron-jobs.yml`

- [ ] **Step 1: Create cron workflow**

```yaml
# .github/workflows/cron-jobs.yml
name: SteelHub Scheduled Data Fetch

on:
  schedule:
    # Daily at 06:00 UTC
    - cron: '0 6 * * *'
  workflow_dispatch: # Allow manual trigger

env:
  AUTH_HEADER: "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
  BASE_URL: ${{ secrets.APP_URL }}

jobs:
  fetch-data:
    runs-on: ubuntu-latest
    steps:
      # --- Prices: per-region to stay under Vercel 10s timeout ---
      - name: Prices - Far East
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=far-east" --max-time 15
        continue-on-error: true

      - name: Prices - Asia
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=asia" --max-time 15
        continue-on-error: true

      - name: Prices - CIS
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=cis" --max-time 15
        continue-on-error: true

      - name: Prices - EU
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=eu" --max-time 15
        continue-on-error: true

      - name: Prices - Africa
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=africa" --max-time 15
        continue-on-error: true

      - name: Prices - North America
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=north-america" --max-time 15
        continue-on-error: true

      - name: Prices - South America
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/prices?region=south-america" --max-time 15
        continue-on-error: true

      # --- News: daily regions only (weekly regions run on Sundays) ---
      - name: News - Far East
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/news?region=far-east" --max-time 15
        continue-on-error: true

      - name: News - Asia
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/news?region=asia" --max-time 15
        continue-on-error: true

      - name: News - CIS
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/news?region=cis" --max-time 15
        continue-on-error: true

      - name: News - EU
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/news?region=eu" --max-time 15
        continue-on-error: true

      # --- Exchange rates: 1 call ---
      - name: Exchange Rates
        run: curl -sf -X POST -H "$AUTH_HEADER" "$BASE_URL/api/cron/exchange-rates" --max-time 15
        continue-on-error: true

  # Weekly regions run only on Sundays
  fetch-weekly-news:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 6 * * 0' || github.event_name == 'workflow_dispatch'
    steps:
      - name: News - Africa
        run: curl -sf -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/news?region=africa" --max-time 15
        continue-on-error: true

      - name: News - North America
        run: curl -sf -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/news?region=north-america" --max-time 15
        continue-on-error: true

      - name: News - South America
        run: curl -sf -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/news?region=south-america" --max-time 15
        continue-on-error: true
```

> **Key design:** Each curl call hits one region = one Vercel function invocation. Each stays well under the 10s Hobby timeout. GitHub Actions handles the orchestration sequentially for free.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/cron-jobs.yml
git commit -m "chore: add GitHub Actions cron workflow for data fetching"
```

---

### Task 13: Create GitHub Repository + Push

- [ ] **Step 1: Create GitHub repo**

```bash
cd steelhub
gh repo create steelhub --private --source=. --push
```

> If `gh` CLI is not installed, create the repo manually on GitHub and push:
> ```bash
> git remote add origin https://github.com/YOUR_USERNAME/steelhub.git
> git branch -M main
> git push -u origin main
> ```

- [ ] **Step 2: Add GitHub Actions secrets**

Go to GitHub → repo Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `CRON_SECRET` | Same as `.env.local` CRON_SECRET |
| `APP_URL` | Your Vercel deployment URL (set after first deploy) |

---

### Task 14: Deploy to Vercel

- [ ] **Step 1: Link to Vercel**

```bash
npx vercel link
```

Or go to https://vercel.com/new → Import from GitHub → select `steelhub`.

- [ ] **Step 2: Set environment variables in Vercel dashboard**

Go to Project Settings → Environment Variables. Add ALL variables from `.env.local`.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

Or push to `main` for automatic deploy.

- [ ] **Step 4: Verify deployment**

Visit your deployment URL. You should see the default Next.js page.

- [ ] **Step 5: Update GitHub Actions secret**

Set `APP_URL` secret to your Vercel deployment URL (e.g., `https://steelhub.vercel.app`)

---

## Chunk 5: SQL Migrations (Stored in Repo)

### Task 15: Save SQL Migrations to Repo

**Files:**
- Create: `steelhub/supabase/migrations/001_initial_schema.sql`
- Create: `steelhub/supabase/migrations/002_rls_policies.sql`

- [ ] **Step 1: Create initial schema migration file**

Save the SQL from Task 4 Step 3 into `supabase/migrations/001_initial_schema.sql`.

- [ ] **Step 2: Create RLS policies migration file**

Save the SQL from Task 4 Step 4 into `supabase/migrations/002_rls_policies.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "chore: add SQL migration files for reference"
```

---

## Sprint 0 Completion Checklist

Before moving to Sprint 1, verify ALL items:

- [ ] Next.js project created and runs locally
- [ ] Git repo initialized with proper `.gitignore`
- [ ] `.env.example` and `.env.local` created
- [ ] Dependencies installed (supabase-js, cheerio, chart.js, yahoo-finance2, shadcn)
- [ ] Supabase project created with all 8 tables
- [ ] Supabase RLS enabled — anon = read only, service role = full access
- [ ] Supabase connectivity verified (verify-supabase.ts passes)
- [ ] NewsAPI key obtained and tested (primary news — 100 queries/day free)
- [ ] Brave Search API key obtained and tested (fallback news)
- [ ] WebScraping.AI key obtained and tested (primary price scraping — 2,000 calls/month free)
- [ ] Yahoo Finance API tested as fallback — note which symbols work
- [ ] ExchangeRate-API tested — all 7 currencies available
- [ ] AUTH_SECRET and CRON_SECRET generated
- [ ] AUTH_PIN set (6+ chars)
- [ ] baseline-prices.json created with reference prices
- [ ] Auth middleware + login page created (dashboard protected from first deploy)
- [ ] vercel.json with cron config
- [ ] GitHub Actions workflow for scheduling (per-region calls)
- [ ] GitHub repo created and pushed
- [ ] Vercel deployment live (shows login page, not open dashboard)
- [ ] GitHub Actions secrets configured (CRON_SECRET, APP_URL)

**All green? → Sprint 1 starts.**

---

## Sprint 1 Preparation Notes

Carry these into Sprint 1 planning:

### 1. Upsert Strategy (Supabase unique index)
The `idx_prices_unique_daily` index means inserting the same product/region/country twice on the same day will fail. Sprint 1 cron code **must** use Supabase upsert:

```typescript
// Use this pattern in all cron writes:
const { error } = await supabase
  .from('prices')
  .upsert(
    { product, region, country, price, source, fetched_at: new Date().toISOString() },
    { onConflict: 'product,region,country' } // Note: expression-based index needs raw SQL for proper ON CONFLICT
  )

// If upsert doesn't work cleanly with the date expression index,
// use: DELETE today's row first, then INSERT. Simple and safe.
```

### 2. Unit Conversion Constants (Normalizer)
US HRC prices are quoted in USD/Short Ton (NT). All other regions use Metric Ton (MT).

```typescript
// lib/normalizer.ts constants for Sprint 1:
const UNIT_FACTORS: Record<string, number> = {
  'MT': 1.0,          // Metric Ton (1000 kg) — standard
  'NT': 0.9072,       // Net/Short Ton (907.2 kg) — US prices
  'LT': 1.0160,       // Long Ton (1016 kg) — UK/legacy
  'KG': 0.001,        // Kilogram
}

// To convert NT → MT: price_per_nt * (1 / 0.9072) = price_per_nt * 1.1023
// Example: US HRC $800/NT = $800 × 1.1023 = $881.84/MT
```

### 3. Yahoo Finance Ticker Results
After running `verify-yahoo.ts`, record which symbols returned data here:

| Symbol | Status | Notes |
|--------|--------|-------|
| TIO=F (Iron Ore) | ? | |
| MTF=F (Coking Coal) | ? | |
| HRC=F (HRC Steel) | ? | |
| ^BDI (Baltic Dry) | ? | |

Symbols that fail need WebScraping.AI (TradingEconomics) as primary, Yahoo as fallback.

### 4. Revised Provider Chain (Sprint 1)

**Price providers (in order):**
1. WebScraping.AI → TradingEconomics (headless Chrome, JS-rendered, 2,000 calls/month free)
2. Yahoo Finance (`yahoo-finance2` package, free, no auth)
3. last_successful DB cache
4. baseline-prices.json static snapshot

**News providers (in order):**
1. NewsAPI.org (100 queries/day free, structured articles, 24h delay)
2. Brave Search API ($5 free credit, ~1,000 queries, for deep-dive/fallback)
3. last_successful DB cache

### 5. Updated Cost Projection

| Phase | Services | Monthly |
|-------|----------|---------|
| Phase 0 | Supabase free + WebScraping.AI free + NewsAPI free + ExchangeRate free | **$0** |
| Phase 1 | +Metals-API (replaces WebScraping.AI for prices) | **$15** |
| Phase 2 | +Claude Haiku (sentiment + categorize) | **$20** |
| Phase 3 | +Brave paid (7 regions daily deep-dive) | **$35-40** |
