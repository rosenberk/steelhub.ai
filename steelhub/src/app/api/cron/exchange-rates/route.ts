// src/app/api/cron/exchange-rates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchExchangeRates } from '@/providers/exchange/rates'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rates = await fetchExchangeRates()
    const supabase = createServiceClient()

    // Save key currencies to DB
    const keyCurrencies = ['CNY', 'EUR', 'TRY', 'RUB', 'INR', 'JPY', 'KRW']
    const rows = keyCurrencies
      .filter(c => rates.rates[c])
      .map(c => ({
        base_currency: 'USD',
        target_currency: c,
        rate: rates.rates[c],
        fetched_at: rates.fetchedAt.toISOString(),
      }))

    await supabase.from('exchange_rates').insert(rows)

    return NextResponse.json({
      fetchedAt: rates.fetchedAt.toISOString(),
      currencies: rows.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
