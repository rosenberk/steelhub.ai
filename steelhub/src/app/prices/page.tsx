// src/app/prices/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { PriceResponse, SteelProduct, Region, StaleLevel } from '@/lib/types'
import { PRODUCTS } from '@/config/products'
import { REGIONS } from '@/config/regions'

type SortKey = 'product' | 'region' | 'price' | 'updatedAt'
type SortDir = 'asc' | 'desc'

export default function PricesPage() {
  const [prices, setPrices] = useState<PriceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('product')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    async function fetchPrices() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/prices?limit=200')
        if (!res.ok) throw new Error()
        const json = await res.json()
        setPrices(json.data ?? [])
      } catch {
        setPrices([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchPrices()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...prices].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'product': return dir * a.product.localeCompare(b.product)
      case 'region': return dir * a.region.localeCompare(b.region)
      case 'price': return dir * (a.price - b.price)
      case 'updatedAt': return dir * (new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
      default: return 0
    }
  })

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const staleDot = (level: StaleLevel) => {
    const color = level === 'fresh' ? 'bg-[#4ade80]' : level === 'day-old' ? 'bg-[#fbbf24]' : 'bg-[#f87171]'
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
  }

  return (
    <PageLayout>
      <h1 className="text-xl font-semibold text-[#e2e8f0] mb-4">All Prices</h1>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#1e293b] rounded" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155] text-[#64748b] text-xs">
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('product')}>
                  Product{sortIcon('product')}
                </th>
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('region')}>
                  Region{sortIcon('region')}
                </th>
                <th className="text-right py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('price')}>
                  Price (USD){sortIcon('price')}
                </th>
                <th className="text-left py-2 px-3">Unit</th>
                <th className="text-left py-2 px-3">Source</th>
                <th className="text-left py-2 px-3 cursor-pointer hover:text-[#94a3b8]" onClick={() => handleSort('updatedAt')}>
                  Updated{sortIcon('updatedAt')}
                </th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={`${p.product}-${p.region}-${i}`} className="border-b border-[#334155]/50 hover:bg-[#1e293b] transition-colors">
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{PRODUCTS[p.product as SteelProduct]?.name || p.product}</td>
                  <td className="py-2.5 px-3 text-[#94a3b8]">{REGIONS[p.region as Region]?.name || p.region}</td>
                  <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-mono">
                    ${p.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 px-3 text-[#64748b]">{p.unit}</td>
                  <td className="py-2.5 px-3 text-[#64748b]">{p.source}</td>
                  <td className="py-2.5 px-3 text-[#64748b]">{new Date(p.fetchedAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-center">{staleDot(p.staleLevel)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#475569]">No price data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}
