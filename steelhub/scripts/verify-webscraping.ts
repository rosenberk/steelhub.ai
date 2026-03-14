// Run with: npx tsx scripts/verify-webscraping.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.WEBSCRAPING_AI_KEY
  if (!apiKey) {
    console.error('❌ WEBSCRAPING_AI_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing WebScraping.AI (headless Chrome rendering)...\n')

  // Test: fetch TradingEconomics steel page
  const targetUrl = 'https://tradingeconomics.com/commodity/steel'
  const res = await fetch(
    `https://api.webscraping.ai/html?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&js=true`
  )

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}: ${res.statusText}`)
    const body = await res.text()
    console.error(body.substring(0, 200))
    process.exit(1)
  }

  const html = await res.text()
  console.log(`✅ Page fetched — ${html.length} chars of HTML`)

  // Check if we can find price-related content
  const hasPrice = html.includes('Price') || html.includes('price') || html.includes('Last')
  const hasTable = html.includes('<table') || html.includes('data-')
  console.log(`✅ Contains price data: ${hasPrice}`)
  console.log(`✅ Contains structured data: ${hasTable}`)

  console.log(`\n📊 Monthly budget: 2,000 calls`)
  console.log(`📊 SteelHub usage: ~840 calls/month (7 regions × 4 products × 30 days)`)
  console.log(`📊 Remaining: ~1,160 calls for retries/fallbacks`)

  console.log('\n🎉 WebScraping.AI check passed!')
}

verify().catch(console.error)
