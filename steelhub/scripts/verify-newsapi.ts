// Run with: npx tsx scripts/verify-newsapi.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

async function verify() {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) {
    console.error('❌ NEWSAPI_KEY not set in .env.local')
    process.exit(1)
  }

  console.log('Testing NewsAPI.org...\n')

  // Test: search for steel industry news
  const res = await fetch(
    `https://newsapi.org/v2/everything?q=steel+HRC+price&language=en&pageSize=5&apiKey=${apiKey}`
  )

  if (!res.ok) {
    const err = await res.json()
    console.error(`❌ HTTP ${res.status}: ${err.message}`)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`✅ API working — ${data.totalResults} total results`)
  console.log(`✅ Returned ${data.articles?.length || 0} articles:\n`)

  data.articles?.forEach((a: any, i: number) => {
    console.log(`   ${i + 1}. [${a.source?.name}] ${a.title}`)
  })

  // Test: top headlines for business
  const res2 = await fetch(
    `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=3&apiKey=${apiKey}`
  )

  if (res2.ok) {
    const data2 = await res2.json()
    console.log(`\n✅ Top Headlines endpoint works — ${data2.totalResults} results`)
  }

  console.log('\n🎉 NewsAPI check passed!')
}

verify().catch(console.error)
