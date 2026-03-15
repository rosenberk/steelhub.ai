// src/app/api/cron/all/route.ts
// Vercel Hobby allows only 1 cron job. This endpoint triggers all tasks.
// GitHub Actions calls individual endpoints instead (no timeout issue).

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  // Vercel cron sends the secret automatically
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // This is a lightweight trigger — just fetch one high-priority region
  // to keep the Supabase DB alive (prevents 1-week inactivity pause)
  const baseUrl = request.nextUrl.origin
  const headers = { 'Authorization': `Bearer ${cronSecret}` }

  try {
    await fetch(`${baseUrl}/api/cron/exchange-rates`, {
      method: 'POST', headers,
    })

    await fetch(`${baseUrl}/api/cron/prices?region=far-east`, {
      method: 'POST', headers,
    })

    await fetch(`${baseUrl}/api/cron/news?region=far-east`, {
      method: 'POST',
      headers,
    })

    return NextResponse.json({ ok: true, message: 'Vercel cron keepalive done' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
