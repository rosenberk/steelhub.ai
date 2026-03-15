// src/app/news/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { NewsCard } from '@/components/news-card'
import { Region, Category } from '@/lib/types'
import { REGIONS, ALL_REGIONS } from '@/config/regions'
import { CATEGORIES, ALL_CATEGORIES } from '@/config/categories'

interface NewsItem {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  region: Region
  country?: string
  confidence?: number
  publishedAt?: string
  fetchedAt: string
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [regionFilter, setRegionFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [countryFilter, setCountryFilter] = useState<string>('')

  const countries = regionFilter
    ? REGIONS[regionFilter as Region]?.countries ?? []
    : []

  useEffect(() => {
    const controller = new AbortController()

    async function fetchNews() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ limit: '50' })
        if (regionFilter) params.set('region', regionFilter)
        if (categoryFilter) params.set('category', categoryFilter)
        if (countryFilter) params.set('country', countryFilter)

        const res = await fetch(`/api/news?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setNews(json.data ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setNews([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchNews()
    return () => controller.abort()
  }, [regionFilter, categoryFilter, countryFilter])

  // Reset country when region changes
  useEffect(() => {
    setCountryFilter('')
  }, [regionFilter])

  const selectClass = 'text-xs bg-[#1e293b] text-[#94a3b8] border border-[#334155] rounded px-2 py-1.5 outline-none focus:border-[#38bdf8]'

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#e2e8f0]">News</h1>
        <div className="flex gap-2">
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={selectClass}>
            <option value="">All Regions</option>
            {ALL_REGIONS.map(r => (
              <option key={r} value={r}>{REGIONS[r].name}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORIES[c].nameEn}</option>
            ))}
          </select>
          {countries.length > 0 && (
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className={selectClass}>
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-full mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-[#1e293b] rounded-lg p-8 text-center border border-[#334155]">
          <p className="text-sm text-[#475569]">No news found matching your filters</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {news.map((item, i) => (
            <NewsCard
              key={`${item.title}-${i}`}
              title={item.title}
              url={item.url}
              snippet={item.snippet}
              source={item.source}
              category={item.category}
              confidence={item.confidence}
              publishedAt={item.publishedAt}
            />
          ))}
        </div>
      )}
    </PageLayout>
  )
}
