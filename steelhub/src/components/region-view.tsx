'use client'

import { useEffect, useState } from 'react'
import { PriceGrid } from './price-grid'
import { NewsList } from './news-list'
import { PriceChart } from './price-chart'
import { REGIONS } from '@/config/regions'
import { Region, PriceResponse, SteelProduct } from '@/lib/types'

interface RegionViewProps {
  region: Region
}

export function RegionView({ region }: RegionViewProps) {
  const [prices, setPrices] = useState<PriceResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<SteelProduct | null>(null)

  const config = REGIONS[region]

  useEffect(() => {
    const controller = new AbortController()

    async function fetchPrices() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/prices?region=${region}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setPrices(json.data ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchPrices()
    return () => controller.abort()
  }, [region])

  // Determine freshness from most recent price
  const latestFetchedAt = prices.length > 0
    ? new Date(Math.max(...prices.map(p => new Date(p.fetchedAt).getTime())))
    : null

  const freshness = latestFetchedAt
    ? getTimeSince(latestFetchedAt)
    : null

  const dotColor = !latestFetchedAt
    ? 'bg-[#475569]'
    : getDotColor(latestFetchedAt)

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Region Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#e2e8f0]">{config.name}</h1>
          <p className="text-xs text-[#64748b] mt-1">{config.countries.join(', ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-[7px] h-[7px] rounded-full ${dotColor}`} />
          <span className="text-xs text-[#64748b]">
            {freshness ? `Updated ${freshness}` : 'No data'}
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[#1e293b] border border-[#f87171]/30 rounded-lg p-4 mb-4 text-sm text-[#f87171]">
          Failed to load prices: {error}
        </div>
      )}

      {/* Price Grid */}
      <PriceGrid prices={prices} isLoading={isLoading} onProductSelect={(p) => {
        setSelectedProduct(prev => prev === p ? null : p)
      }} />

      {selectedProduct && (
        <div className="mt-4">
          <PriceChart product={selectedProduct} region={region} />
        </div>
      )}

      {/* News (placeholder) */}
      <NewsList region={region} />
    </div>
  )
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getDotColor(date: Date): string {
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60)
  if (hours < 24) return 'bg-[#4ade80]'   // fresh — green
  if (hours < 72) return 'bg-[#fbbf24]'   // day-old — yellow
  return 'bg-[#f87171]'                     // stale — red
}
