// src/providers/exchange/rates.ts
import { ExchangeRateCache } from '@/lib/types'
import { createServiceClient } from '@/lib/supabase'

const API_URL = process.env.EXCHANGE_RATE_API_URL
  || 'https://api.exchangerate-api.com/v4/latest/USD'

export async function fetchExchangeRates(): Promise<ExchangeRateCache> {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`)

  const data = await res.json()
  return {
    base: data.base,
    rates: data.rates,
    fetchedAt: new Date(),
  }
}

export async function getExchangeRates(): Promise<ExchangeRateCache> {
  const supabase = createServiceClient()

  // Check DB cache first (valid for 24h)
  const { data: cached } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)

  if (cached && cached.length > 0) {
    const age = Date.now() - new Date(cached[0].fetched_at).getTime()
    if (age < 24 * 60 * 60 * 1000) {
      // Reconstruct rates from DB rows
      const { data: allRates } = await supabase
        .from('exchange_rates')
        .select('target_currency, rate')
        .eq('fetched_at', cached[0].fetched_at)

      const rates: Record<string, number> = {}
      allRates?.forEach(r => { rates[r.target_currency] = Number(r.rate) })

      return {
        base: 'USD',
        rates,
        fetchedAt: new Date(cached[0].fetched_at),
      }
    }
  }

  // Fetch fresh rates
  const fresh = await fetchExchangeRates()

  // Save to DB
  const rows = Object.entries(fresh.rates).map(([currency, rate]) => ({
    base_currency: 'USD',
    target_currency: currency,
    rate,
    fetched_at: fresh.fetchedAt.toISOString(),
  }))

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await supabase.from('exchange_rates').insert(rows.slice(i, i + 50))
  }

  return fresh
}

export function convertToUSD(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRateCache
): number {
  if (fromCurrency === 'USD') return amount
  const rate = rates.rates[fromCurrency]
  if (!rate) throw new Error(`No exchange rate for ${fromCurrency}`)
  return amount / rate
}
