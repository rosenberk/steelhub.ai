// Run with: npx tsx scripts/verify-exchange-rate.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

const NEEDED_CURRENCIES = ['CNY', 'EUR', 'TRY', 'RUB', 'INR', 'JPY', 'KRW']

async function verify() {
  console.log('Testing ExchangeRate-API...\n')

  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ Base: ${data.base}, Date: ${data.date}`)
  console.log(`✅ Total currencies: ${Object.keys(data.rates).length}\n`)

  for (const currency of NEEDED_CURRENCIES) {
    if (data.rates[currency]) {
      console.log(`✅ USD/${currency}: ${data.rates[currency]}`)
    } else {
      console.log(`❌ ${currency}: NOT AVAILABLE`)
    }
  }

  console.log('\n🎉 ExchangeRate-API check complete!')
}

verify().catch(console.error)
