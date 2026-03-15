// src/components/news-card.tsx
'use client'

import { Category } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'

interface NewsCardProps {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  confidence?: number
  publishedAt?: string
  compact?: boolean
}

const CATEGORY_COLORS: Record<Category, string> = {
  hammadde: 'bg-[#38bdf8]/20 text-[#38bdf8]',
  urun: 'bg-[#4ade80]/20 text-[#4ade80]',
  tuketim: 'bg-[#fbbf24]/20 text-[#fbbf24]',
  tasima: 'bg-[#a78bfa]/20 text-[#a78bfa]',
  vergi: 'bg-[#f87171]/20 text-[#f87171]',
}

export function NewsCard({ title, url, snippet, source, category, publishedAt, compact }: NewsCardProps) {
  const timeAgo = publishedAt ? getTimeAgo(publishedAt) : null
  const categoryLabel = CATEGORIES[category]?.nameEn || category

  const titleElement = url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-[#38bdf8] transition-colors">
      {title}
    </a>
  ) : (
    <span>{title}</span>
  )

  if (compact) {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-[#334155] last:border-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e2e8f0] leading-tight">{titleElement}</div>
          <div className="flex items-center gap-2 mt-1">
            {source && <span className="text-[10px] text-[#38bdf8]">{source}</span>}
            {timeAgo && <span className="text-[10px] text-[#475569]">{timeAgo}</span>}
          </div>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`}>
          {categoryLabel}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155] hover:border-[#475569] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-[#e2e8f0] leading-tight">{titleElement}</h3>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[category]}`}>
          {categoryLabel}
        </span>
      </div>
      {snippet && <p className="text-xs text-[#64748b] line-clamp-2 mb-2">{snippet}</p>}
      <div className="flex items-center gap-2">
        {source && <span className="text-[10px] text-[#38bdf8]">{source}</span>}
        {timeAgo && <span className="text-[10px] text-[#475569]">{timeAgo}</span>}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
