// src/components/news-list.tsx
'use client'

import { useEffect, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { NewsCard } from './news-card'
import { Region, Category } from '@/lib/types'
import { REGIONS } from '@/config/regions'

interface NewsItem {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  confidence?: number
  publishedAt?: string
  fetchedAt: string
}

interface NewsListProps {
  region: Region
}

export function NewsList({ region }: NewsListProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string>('')

  const countries = REGIONS[region].countries

  useEffect(() => {
    const controller = new AbortController()

    async function fetchNews() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ region, limit: '5' })
        if (selectedCountry) params.set('country', selectedCountry)
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
  }, [region, selectedCountry])

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#94a3b8]">Latest News</h3>
        <select
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value)}
          className="text-xs bg-[#1e293b] text-[#94a3b8] border border-[#334155] rounded px-2 py-1 outline-none focus:border-[#38bdf8]"
        >
          <option value="">All Countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#1e293b] rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-[#334155] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#334155] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-[#1e293b] rounded-lg p-6 text-center border border-[#334155]">
          <Newspaper className="w-8 h-8 text-[#475569] mx-auto mb-2" />
          <p className="text-sm text-[#475569]">No news available for this region</p>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] px-4">
          {news.map((item, i) => (
            <NewsCard
              key={`${item.title}-${i}`}
              title={item.title}
              url={item.url}
              source={item.source}
              category={item.category}
              publishedAt={item.publishedAt}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}
