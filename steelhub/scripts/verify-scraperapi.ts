// Run with: npx tsx scripts/verify-scraperapi.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as cheerio from 'cheerio'

async function verify() {
  const apiKey = process.env.SCRAPER_API_KEY
  if (!apiKey) {
    console.error('❌ SCRAPER_API_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing ScraperAPI (JS rendering + TradingEconomics)...\n')

  // Test 1: Basic API connectivity
  const testUrl = 'https://httpbin.org/ip'
  const res1 = await fetch(
    `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(testUrl)}`
  )

  if (!res1.ok) {
    console.error(`❌ API error: HTTP ${res1.status}`)
    process.exit(1)
  }
  console.log('✅ API connectivity works')

  // Test 2: TradingEconomics with JS rendering (costs 5 credits)
  console.log('\n⏳ Fetching TradingEconomics steel page (JS render = 5 credits)...')
  const steelUrl = 'https://tradingeconomics.com/commodity/steel'
  const res2 = await fetch(
    `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(steelUrl)}&render=true`
  )

  if (!res2.ok) {
    console.error(`❌ TradingEconomics fetch failed: HTTP ${res2.status}`)
    const body = await res2.text()
    console.error(body.substring(0, 200))
    process.exit(1)
  }

  const html = await res2.text()
  console.log(`✅ Page fetched — ${html.length} chars`)

  // Parse with Cheerio to find price data
  const $ = cheerio.load(html)

  // TradingEconomics shows prices in a table or specific elements
  const title = $('title').text()
  console.log(`✅ Page title: ${title}`)

  // Look for price-like numbers in the page
  const priceElements = $('[id*="price"], [class*="price"], [data-value]')
  console.log(`✅ Price-related elements found: ${priceElements.length}`)

  // Check for table data
  const tables = $('table')
  console.log(`✅ Tables found: ${tables.length}`)

  if (tables.length > 0) {
    const firstTableRows = tables.first().find('tr').length
    console.log(`✅ First table rows: ${firstTableRows}`)
  }

  console.log('\n📊 Credit usage: 5 credits (JS render) + 1 credit (basic test) = 6 credits used')
  console.log('📊 Monthly budget: 1,000 credits = ~200 JS-rendered requests')
  console.log('📊 SteelHub weekly scrape: 7 products × 5 credits = 35 credits/week = ~140/month')

  console.log('\n🎉 ScraperAPI check passed!')
}

verify().catch(console.error)
