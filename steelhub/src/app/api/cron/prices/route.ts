// src/app/api/cron/prices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Region, SteelProduct } from '@/lib/types'
import { PRODUCTS } from '@/config/products'
import { createPriceProviders, createStorageProvider } from '@/providers/factory'
import { fetchPriceWithFallback } from '@/lib/fallback'
import { ALL_REGIONS } from '@/config/regions'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get region from query param (required for per-region calls)
  const region = request.nextUrl.searchParams.get('region') as Region | null
  if (!region || !ALL_REGIONS.includes(region)) {
    return NextResponse.json(
      { error: 'Missing or invalid region param' },
      { status: 400 }
    )
  }

  const providers = createPriceProviders()
  const storage = createStorageProvider()
  const results: { product: string; price: number | null; source: string; warning?: string }[] = []

  // Fetch prices for all products in this region
  for (const product of Object.keys(PRODUCTS)) {
    const result = await fetchPriceWithFallback(
      product as SteelProduct,
      region,
      providers,
      storage
    )

    if (result.data) {
      await storage.savePrices([result.data])
      results.push({
        product,
        price: result.data.price,
        source: result.source,
        warning: result.warning,
      })
    } else {
      results.push({
        product,
        price: null,
        source: 'none',
        warning: result.warning,
      })
    }
  }

  return NextResponse.json({
    region,
    fetchedAt: new Date().toISOString(),
    results,
  })
}

// Also handle GET for Vercel cron
export async function GET(request: NextRequest) {
  return POST(request)
}
