'use client'

import { PriceCard } from './price-card'
import { PRODUCTS, ALL_PRODUCTS } from '@/config/products'
import { CATEGORIES } from '@/config/categories'
import { PriceResponse } from '@/lib/types'

interface PriceGridProps {
  prices: PriceResponse[]
  isLoading: boolean
}

const GRID_CLASSES = 'grid grid-cols-2 min-[768px]:grid-cols-3 min-[1100px]:grid-cols-5 gap-3'

export function PriceGrid({ prices, isLoading }: PriceGridProps) {
  if (isLoading) {
    return (
      <div className={GRID_CLASSES}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-[#1e293b] rounded-lg p-3.5 border-l-[3px] border-[#334155] animate-pulse">
            <div className="h-3 bg-[#334155] rounded w-16 mb-3" />
            <div className="h-6 bg-[#334155] rounded w-20 mb-2" />
            <div className="h-3 bg-[#334155] rounded w-12" />
          </div>
        ))}
      </div>
    )
  }

  const priceMap = new Map(prices.map(p => [p.product, p]))

  const rawMaterials = ALL_PRODUCTS.filter(p => PRODUCTS[p].category === 'hammadde')
  const steelProducts = ALL_PRODUCTS.filter(p => PRODUCTS[p].category === 'urun')

  const renderSection = (categoryId: 'hammadde' | 'urun', products: typeof ALL_PRODUCTS) => (
    <div className="mb-4">
      <h3 className="text-xs text-[#64748b] uppercase tracking-wider mb-2">
        {CATEGORIES[categoryId].nameEn}
      </h3>
      <div className={GRID_CLASSES}>
        {products.map(productId => {
          const entry = priceMap.get(productId)
          const config = PRODUCTS[productId]
          return (
            <PriceCard
              key={productId}
              product={config.name}
              price={entry?.price ?? null}
              unit={entry?.unit ?? config.defaultUnit}
              change={null}
              staleLevel={entry?.staleLevel ?? 'baseline'}
            />
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      {renderSection('hammadde', rawMaterials)}
      {renderSection('urun', steelProducts)}
    </div>
  )
}
