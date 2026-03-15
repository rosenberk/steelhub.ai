// src/lib/fallback.ts
import { PriceData, SteelProduct, Region } from '@/lib/types'
import { PriceProvider } from '@/providers/interfaces'
import { SupabaseStorageProvider } from '@/providers/storage/supabase'
import baselinePrices from '@/config/baseline-prices.json'

interface FallbackResult {
  data: PriceData | null
  source: 'primary' | 'secondary' | 'cache' | 'baseline' | 'none'
  warning?: string
}

export async function fetchPriceWithFallback(
  product: SteelProduct,
  region: Region,
  providers: PriceProvider[],
  storage: SupabaseStorageProvider
): Promise<FallbackResult> {

  // Layer 1 & 2: Try each provider in order
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    try {
      const data = await provider.getPrice(product, region)
      if (data) {
        // Update last_successful cache
        await storage.saveLastSuccessful(`price-${product}`, region, data)
        return {
          data,
          source: i === 0 ? 'primary' : 'secondary',
        }
      }
    } catch (err) {
      console.error(`Provider ${provider.name} failed for ${product}/${region}:`, err)
    }
  }

  // Layer 3: Last successful from DB
  const cached = await storage.getLastSuccessful(`price-${product}`, region)
  if (cached && cached.price) {
    const age = Date.now() - new Date(cached._updatedAt).getTime()
    const daysOld = Math.floor(age / (1000 * 60 * 60 * 24))

    return {
      data: {
        product,
        region,
        price: cached.price,
        currency: cached.currency || 'USD',
        unit: cached.unit || 'MT',
        source: `cache (${cached.source})`,
        fetchedAt: new Date(cached._updatedAt),
      },
      source: 'cache',
      warning: `Stale data: ${daysOld} day(s) old`,
    }
  }

  // Layer 4: Baseline static snapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productPrices = (baselinePrices.prices as Record<string, any>)[product]
  const baselinePrice = productPrices?.[region] || productPrices?.['global']

  if (baselinePrice) {
    return {
      data: {
        product,
        region,
        price: baselinePrice,
        currency: 'USD',
        unit: 'MT',
        source: 'baseline',
        fetchedAt: new Date(baselinePrices.snapshotDate),
      },
      source: 'baseline',
      warning: 'Reference price — not current',
    }
  }

  return { data: null, source: 'none', warning: 'No data available' }
}
