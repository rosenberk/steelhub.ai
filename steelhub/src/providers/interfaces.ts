// src/providers/interfaces.ts
import {
  SteelProduct, Region, PriceData, PriceFilter,
  NewsItem, NewsFilter, Category, ClassificationResult,
  ExchangeRateCache
} from '@/lib/types'

export interface PriceProvider {
  name: string
  getPrice(product: SteelProduct, region: Region): Promise<PriceData | null>
  isAvailable(): Promise<boolean>
}

export interface NewsProvider {
  name: string
  searchNews(category: Category, region: Region): Promise<NewsItem[]>
}

export interface AIParser {
  categorize(headline: string, snippet: string): Promise<ClassificationResult>
}

export interface StorageProvider {
  savePrices(data: PriceData[]): Promise<void>
  getPrices(filters: PriceFilter): Promise<PriceData[]>
  getLatestPrice(product: SteelProduct, region: Region): Promise<PriceData | null>
  saveNews(items: NewsItem[]): Promise<void>
  getNews(filters: NewsFilter): Promise<NewsItem[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLastSuccessful(type: string, region: string): Promise<Record<string, any> | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveLastSuccessful(type: string, region: string, data: Record<string, any>): Promise<void>
  saveExchangeRates(rates: ExchangeRateCache): Promise<void>
  getExchangeRates(): Promise<ExchangeRateCache | null>
}
