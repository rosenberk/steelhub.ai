// Run with: npx tsx scripts/verify-supabase.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function verify() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceKey || !anonKey) {
    console.error('❌ Missing Supabase env vars. Check .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  // Test write (service role)
  const { error: insertError } = await supabase
    .from('prices')
    .insert({
      product: 'HRC',
      region: 'far-east',
      country: 'China',
      price: 405.00,
      source: 'test'
    })

  if (insertError) {
    console.error('❌ INSERT failed:', insertError.message)
    process.exit(1)
  }
  console.log('✅ INSERT works (service role)')

  // Test read
  const { data, error: selectError } = await supabase
    .from('prices')
    .select('*')
    .eq('source', 'test')

  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message)
    process.exit(1)
  }
  console.log('✅ SELECT works:', data?.length, 'rows')

  // Cleanup test data
  await supabase.from('prices').delete().eq('source', 'test')
  console.log('✅ Cleanup done')

  // Test anon key (should only read)
  const anonClient = createClient(url, anonKey)

  const { error: anonInsertError } = await anonClient
    .from('prices')
    .insert({ product: 'TEST', region: 'test', price: 0, source: 'test' })

  if (anonInsertError) {
    console.log('✅ Anon INSERT correctly blocked:', anonInsertError.message)
  } else {
    console.error('❌ WARNING: Anon key can INSERT — RLS not configured!')
    await supabase.from('prices').delete().eq('source', 'test')
    process.exit(1)
  }

  console.log('\n🎉 All Supabase checks passed!')
}

verify().catch(console.error)
