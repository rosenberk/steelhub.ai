'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { RegionView } from './region-view'
import { Region } from '@/lib/types'

export function DashboardLayout() {
  const [selectedRegion, setSelectedRegion] = useState<Region>('far-east')

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar
        selectedRegion={selectedRegion}
        onRegionSelect={setSelectedRegion}
      />
      <RegionView region={selectedRegion} />
    </div>
  )
}
