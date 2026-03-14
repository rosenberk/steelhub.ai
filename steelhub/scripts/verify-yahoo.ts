// Run with: npx tsx scripts/verify-yahoo.ts

import yahooFinance from 'yahoo-finance2'

const YAHOO_SYMBOLS = {
  'Iron Ore': 'TIO=F',           // SGX Iron Ore 62% Fe
  'Coking Coal': 'MTF=F',        // Coal futures
  'HRC Steel': 'HRC=F',          // US HRC futures (if available)
  'BDI': '^BDI',                 // Baltic Dry Index
}

async function verify() {
  console.log('Testing Yahoo Finance via yahoo-finance2 package (fallback)...\n')

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
