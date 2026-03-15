// src/lib/normalizer.ts
import { NormalizedPrice, ExchangeRateCache } from '@/lib/types'
import { convertToUSD } from '@/providers/exchange/rates'

// Unit conversion factors to Metric Ton
const UNIT_TO_MT: Record<string, number> = {
  'MT': 1.0,          // Metric Ton (1000 kg) — standard
  'NT': 0.9072,       // Net/Short Ton (907.2 kg) — US
  'LT': 1.0160,       // Long Ton (1016 kg) — UK
  'KG': 0.001,        // Kilogram
}

export function normalizePrice(
  rawPrice: number,
  fromUnit: string,
  fromCurrency: string,
  rates: ExchangeRateCache
): NormalizedPrice {
  // Step 1: Convert currency to USD
  const priceInUSD = convertToUSD(rawPrice, fromCurrency, rates)

  // Step 2: Convert unit to MT
  // If price is per NT, we need MORE per MT (MT is heavier)
  // price_per_MT = price_per_unit / factor
  // e.g. $800/NT → $800 / 0.9072 = $881.84/MT
  const factor = UNIT_TO_MT[fromUnit]
  if (!factor) throw new Error(`Unknown unit: ${fromUnit}`)

  const normalizedValue = priceInUSD / factor

  return {
    value: Math.round(normalizedValue * 100) / 100,
    originalValue: rawPrice,
    originalUnit: fromUnit,
    originalCurrency: fromCurrency,
    conversionRate: fromCurrency === 'USD' ? 1 : (rates.rates[fromCurrency] || 1),
  }
}
