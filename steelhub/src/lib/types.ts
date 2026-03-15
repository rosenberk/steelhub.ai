// src/lib/types.ts

// === Regions ===
export type Region =
  | 'far-east' | 'asia' | 'cis' | 'eu'
  | 'africa' | 'north-america' | 'south-america'

export type RegionPriority = 'high' | 'medium' | 'low'

export interface RegionConfig {
  id: Region
  name: string
  countries: string[]
  priority: RegionPriority
  updateFrequency: 'daily' | 'weekly'
}

// === Categories ===
export type Category = 'hammadde' | 'urun' | 'tuketim' | 'tasima' | 'vergi'

export interface CategoryConfig {
  id: Category
  name: string
  nameEn: string
  keywords: string[]
}

// === Products ===
export type SteelProduct =
  | 'HRC' | 'CRC' | 'HDG' | 'Rebar' | 'Slab' | 'Billet' | 'PPGI'
  | 'Scrap' | 'IronOre' | 'CokingCoal'

export interface ProductConfig {
  id: SteelProduct
  name: string
  category: Category
  yahooSymbol?: string
  teUrl?: string
  defaultUnit: 'MT' | 'NT'
}

// === Price Data ===
export interface PriceData {
  product: SteelProduct
  region: Region
  country?: string
  price: number
  currency: string
  unit: string
  source: string
  fetchedAt: Date
}

export interface NormalizedPrice {
  value: number
  originalValue: number
  originalUnit: string
  originalCurrency: string
  conversionRate: number
}

export interface PriceFilter {
  product?: SteelProduct
  region?: Region
  country?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  ascending?: boolean
}

// === News Data ===
export interface NewsItem {
  title: string
  url?: string
  snippet?: string
  source?: string
  category: Category
  region: Region
  country?: string
  sentiment?: number
  confidence?: number
  publishedAt?: Date
  fetchedAt: Date
}

export interface NewsFilter {
  category?: Category
  region?: Region
  country?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
}

// === Classification ===
export interface ClassificationResult {
  category: Category
  confidence: number
  isRelevant: boolean
}

// === Exchange Rates ===
export interface ExchangeRateCache {
  base: string
  rates: Record<string, number>
  fetchedAt: Date
}

// === Stale Data ===
export type StaleLevel = 'fresh' | 'day-old' | 'stale' | 'very-stale' | 'baseline'

export function getStaleLevel(fetchedAt: Date): StaleLevel {
  const hoursOld = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)
  if (hoursOld < 24) return 'fresh'
  if (hoursOld < 72) return 'day-old'
  if (hoursOld < 168) return 'stale'
  return 'very-stale'
}

// === API Response Types ===
export interface PriceResponse {
  product: SteelProduct
  region: Region
  country?: string
  price: number
  currency: string
  unit: string
  source: string
  fetchedAt: string  // ISO string after JSON serialization
  staleLevel: StaleLevel
}
