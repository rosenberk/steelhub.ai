// src/providers/factory.ts
import { PriceProvider, NewsProvider } from '@/providers/interfaces'
import { NewsAPIProvider } from './news/newsapi'
import { BraveSearchProvider } from './news/brave'
import { YahooPriceProvider } from '@/providers/price/yahoo'
import { ScraperPriceProvider } from '@/providers/price/scraper'
import { SupabaseStorageProvider } from '@/providers/storage/supabase'

// Price providers in fallback order
export function createPriceProviders(): PriceProvider[] {
  const providers: PriceProvider[] = []

  const priceProvider = process.env.PRICE_PROVIDER || 'yahoo'

  // Primary
  if (priceProvider === 'yahoo') {
    providers.push(new YahooPriceProvider())
  }

  // Secondary: ScraperAPI always available as fallback if key exists
  if (process.env.SCRAPER_API_KEY) {
    providers.push(new ScraperPriceProvider())
  }

  // If no providers configured, still add Yahoo as default
  if (providers.length === 0) {
    providers.push(new YahooPriceProvider())
  }

  return providers
}

// Storage provider (currently only Supabase)
export function createStorageProvider(): SupabaseStorageProvider {
  return new SupabaseStorageProvider()
}

export function createNewsProviders(): NewsProvider[] {
  return [new NewsAPIProvider(), new BraveSearchProvider()]
}
