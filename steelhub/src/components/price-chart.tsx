// src/components/price-chart.tsx
'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { SteelProduct, Region } from '@/lib/types'
import { PRODUCTS } from '@/config/products'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface PriceChartProps {
  product: SteelProduct
  region: Region
}

export function PriceChart({ product, region }: PriceChartProps) {
  const [labels, setLabels] = useState<string[]>([])
  const [prices, setPrices] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchHistory() {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/prices?product=${product}&region=${region}&history=true`,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error()
        const json = await res.json()
        const data = json.data ?? []

        setLabels(data.map((d: { fetchedAt: string }) => {
          const date = new Date(d.fetchedAt)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }))
        setPrices(data.map((d: { price: number }) => d.price))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLabels([])
        setPrices([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchHistory()
    return () => controller.abort()
  }, [product, region])

  if (isLoading) {
    return (
      <div className="bg-[#1e293b] rounded-lg p-4 h-48 animate-pulse flex items-center justify-center">
        <span className="text-xs text-[#475569]">Loading chart...</span>
      </div>
    )
  }

  if (prices.length < 2) {
    return (
      <div className="bg-[#1e293b] rounded-lg p-4 h-48 flex items-center justify-center">
        <span className="text-xs text-[#475569]">Not enough data points for chart</span>
      </div>
    )
  }

  const config = PRODUCTS[product]

  return (
    <div className="bg-[#1e293b] rounded-lg p-4">
      <div className="text-xs text-[#94a3b8] mb-2">{config.name} — Price History</div>
      <Line
        data={{
          labels,
          datasets: [
            {
              data: prices,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#38bdf8',
              tension: 0.3,
              fill: true,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => `$${(ctx.parsed.y ?? 0).toLocaleString()} / ${config.defaultUnit}`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: '#475569', font: { size: 10 } },
              grid: { color: '#334155' },
            },
            y: {
              ticks: {
                color: '#475569',
                font: { size: 10 },
                callback: (v) => `$${v}`,
              },
              grid: { color: '#334155' },
            },
          },
        }}
        height={160}
      />
    </div>
  )
}
