'use client'

import { Newspaper } from 'lucide-react'

export function NewsList() {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-[#94a3b8] mb-3">Latest News</h3>
      <div className="bg-[#1e293b] rounded-lg p-6 text-center border border-[#334155]">
        <Newspaper className="w-8 h-8 text-[#475569] mx-auto mb-2" />
        <p className="text-sm text-[#475569]">No news available for this region</p>
        <p className="text-xs text-[#334155] mt-1">News integration coming in Sprint 3</p>
      </div>
    </div>
  )
}
