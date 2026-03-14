// Run with: npx tsx scripts/verify-brave.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    console.error('❌ BRAVE_API_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing Brave Search API (fallback)...\n')

  const res = await fetch(
    'https://api.search.brave.com/res/v1/web/search?q=steel+HRC+price&count=3',
    { headers: { 'X-Subscription-Token': apiKey } }
  )

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}: ${res.statusText}`)
    process.exit(1)
  }

  const data = await res.json()
  const results = data.web?.results || []
  console.log(`✅ API working — ${results.length} results returned`)
  results.forEach((r: any, i: number) => {
    console.log(`   ${i + 1}. ${r.title}`)
  })

  console.log('\n🎉 Brave Search API check passed!')
}

verify().catch(console.error)
