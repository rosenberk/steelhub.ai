// src/app/api/prices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createStorageProvider } from '@/providers/factory'
import { SteelProduct, Region, getStaleLevel } from '@/lib/types'

export async function GET(request: NextRequest) {
  const storage = createStorageProvider()

  const product = request.nextUrl.searchParams.get('product') as SteelProduct | null
  const region = request.nextUrl.searchParams.get('region') as Region | null
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const history = request.nextUrl.searchParams.get('history') === 'true'

  if (history && !product) {
    return NextResponse.json({ error: 'product param required for history' }, { status: 400 })
  }

  const prices = await storage.getPrices({
    product: product || undefined,
    region: region || undefined,
    limit: history ? 500 : Math.min(limit, 200),
    ascending: history ? true : undefined,
  })

  // Add stale level to each price
  const enriched = prices.map(p => ({
    ...p,
    staleLevel: getStaleLevel(p.fetchedAt),
  }))

  return NextResponse.json({ data: enriched })
}
