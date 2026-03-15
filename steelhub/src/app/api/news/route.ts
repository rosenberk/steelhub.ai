// src/app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createStorageProvider } from '@/providers/factory'
import { Category, Region } from '@/lib/types'

export async function GET(request: NextRequest) {
  const storage = createStorageProvider()

  const region = request.nextUrl.searchParams.get('region') as Region | null
  const category = request.nextUrl.searchParams.get('category') as Category | null
  const country = request.nextUrl.searchParams.get('country')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

  const news = await storage.getNews({
    region: region || undefined,
    category: category || undefined,
    country: country || undefined,
    limit: Math.min(limit, 100),
  })

  return NextResponse.json({ data: news })
}
