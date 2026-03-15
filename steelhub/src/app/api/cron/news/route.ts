// src/app/api/cron/news/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNewsProviders, createStorageProvider } from '@/providers/factory'
import { Region, NewsItem } from '@/lib/types'
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
