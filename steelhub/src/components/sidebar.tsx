'use client'

import { LayoutDashboard, DollarSign, Newspaper } from 'lucide-react'
import { REGIONS, DAILY_REGIONS, WEEKLY_REGIONS } from '@/config/regions'
import { Region } from '@/lib/types'

interface SidebarProps {
  selectedRegion: Region
  onRegionSelect: (region: Region) => void
}

export function Sidebar({ selectedRegion, onRegionSelect }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-[220px] bg-[#1e293b] p-5 flex-col border-r border-[#334155] flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="text-[#38bdf8] font-bold text-lg mb-6 tracking-wide">
        SteelHub
      </div>

      {/* Nav Links */}
      <nav className="mb-4">
        <div className="px-3 py-2 rounded-md bg-[#0f172a] text-[#e2e8f0] text-[13px] mb-1 flex items-center gap-2 cursor-pointer">
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </div>
        <div className="px-3 py-2 rounded-md text-[#64748b] text-[13px] mb-1 flex items-center gap-2 cursor-pointer hover:bg-[#0f172a] hover:text-[#94a3b8]">
          <DollarSign className="w-4 h-4" /> Prices
        </div>
        <div className="px-3 py-2 rounded-md text-[#64748b] text-[13px] mb-1 flex items-center gap-2 cursor-pointer hover:bg-[#0f172a] hover:text-[#94a3b8]">
          <Newspaper className="w-4 h-4" /> News
        </div>
      </nav>

      {/* Divider */}
      <div className="border-t border-[#334155] my-4" />

      {/* Daily Regions */}
      <div className="text-[10px] text-[#475569] uppercase tracking-[1.5px] mb-2 px-3">
        Daily
      </div>
      {DAILY_REGIONS.map(regionId => {
        const region = REGIONS[regionId]
        const isActive = selectedRegion === regionId
        return (
          <button
            key={regionId}
            onClick={() => onRegionSelect(regionId)}
            className={`w-full text-left px-3 py-1.5 text-xs mb-0.5 border-l-2 rounded-r transition-colors ${
              isActive
                ? 'text-[#38bdf8] bg-[#0f172a] border-[#38bdf8]'
                : 'text-[#94a3b8] border-transparent hover:text-[#e2e8f0] hover:bg-[#0f172a]'
            }`}
          >
            {region.name}
          </button>
        )
      })}

      {/* Weekly Regions */}
      <div className="text-[10px] text-[#475569] uppercase tracking-[1.5px] mb-2 mt-4 px-3">
        Weekly
      </div>
      {WEEKLY_REGIONS.map(regionId => {
        const region = REGIONS[regionId]
        const isActive = selectedRegion === regionId
        return (
          <button
            key={regionId}
            onClick={() => onRegionSelect(regionId)}
            className={`w-full text-left px-3 py-1.5 text-xs mb-0.5 border-l-2 rounded-r transition-colors ${
              isActive
                ? 'text-[#38bdf8] bg-[#0f172a] border-[#38bdf8]'
                : 'text-[#475569] border-transparent hover:text-[#94a3b8] hover:bg-[#0f172a]'
            }`}
          >
            {region.name}
          </button>
        )
      })}

      {/* Footer */}
      <div className="mt-auto text-[10px] text-[#334155]">
        Anti-Gravity Studio
      </div>
    </aside>
  )
}
