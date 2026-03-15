'use client'

import { StaleLevel } from '@/lib/types'

interface PriceCardProps {
  product: string
  price: number | null
  unit: string
  change: number | null
  staleLevel: StaleLevel
  onClick?: () => void
}

export function PriceCard({ product, price, unit, change, staleLevel, onClick }: PriceCardProps) {
  const isAvailable = price !== null && price > 0
  const isBaseline = staleLevel === 'baseline'

  if (!isAvailable) {
    return (
      <div
        className={`bg-[#1e293b] rounded-lg p-3.5 border-l-[3px] border-[#334155] ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="text-[11px] text-[#475569] mb-1.5">{product}</div>
        <div className="text-xl font-semibold text-[#475569]">N/A</div>
        <div className="text-[11px] text-[#475569] mt-1">—</div>
      </div>
    )
  }

  const changeColor = change === null || change === 0
    ? 'text-[#64748b]'
    : change > 0
      ? 'text-[#4ade80]'
      : 'text-[#f87171]'

  const arrow = change === null || change === 0
    ? ''
    : change > 0
      ? '▲ '
      : '▼ '

  const changeText = change === null
    ? '—'
    : `${arrow}${Math.abs(change).toFixed(1)}%`

  return (
    <div
      className={`bg-[#1e293b] rounded-lg p-3.5 border-l-[3px] border-[#38bdf8] hover:bg-[#253449] transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="text-[11px] text-[#64748b] mb-1.5">{product}</div>
      <div className="text-xl font-semibold text-[#e2e8f0]">
        ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        <span className="text-xs font-normal text-[#64748b] ml-1">/{unit}</span>
      </div>
      <div className={`text-[11px] mt-1 ${changeColor}`}>
        {changeText}
        {isBaseline && <span className="text-[#475569] ml-1">(baseline)</span>}
      </div>
    </div>
  )
}
