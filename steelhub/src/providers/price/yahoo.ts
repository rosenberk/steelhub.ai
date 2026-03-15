// src/providers/price/yahoo.ts
import YahooFinance from 'yahoo-finance2'
import { PriceProvider } from '@/providers/interfaces'
import { SteelProduct, Region, PriceData } from '@/lib/types'
import { PRODUCTS } from '@/config/products'
import { normalizePrice } from '@/lib/normalizer'
import { getExchangeRates } from '@/providers/exchange/rates'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// Yahoo symbols give global prices. Map to closest region.
const SYMBOL_REGION_MAP: Record<string, Region> = {
  'HRC=F': 'north-america',   // CME US HRC
  'TIO=F': 'far-east',        // SGX Iron Ore (China reference)
  'MTF=F': 'far-east',        // Coal futures
}

export class YahooPriceProvider implements PriceProvider {
  name = 'yahoo-finance'

  async isAvailable(): Promise<boolean> {
    try {
      const quote = await yf.quote('TIO=F')
      return !!quote?.regularMarketPrice
    } catch {
      return false
    }
  }

  async getPrice(product: SteelProduct, region: Region): Promise<PriceData | null> {
    const config = PRODUCTS[product]
    if (!config.yahooSymbol) return null

    // Yahoo gives one global price per symbol, not per region
    // Only return data for the region this symbol represents
    const symbolRegion = SYMBOL_REGION_MAP[config.yahooSymbol]
    if (symbolRegion && symbolRegion !== region) return null

    try {
      const quote = await yf.quote(config.yahooSymbol)
      if (!quote?.regularMarketPrice) return null

      const rates = await getExchangeRates()
      const currency = quote.currency || 'USD'
      const normalized = normalizePrice(
        quote.regularMarketPrice,
        config.defaultUnit,
        currency,
        rates
      )

      return {
        product,
        region,
        price: normalized.value,
        currency,
        unit: config.defaultUnit,
        source: this.name,
        fetchedAt: new Date(),
      }
    } catch (err) {
      console.error(`Yahoo Finance error for ${product}:`, err)
      return null
    }
  }
}
