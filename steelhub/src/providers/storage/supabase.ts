// src/providers/storage/supabase.ts
import { StorageProvider } from '@/providers/interfaces'
import {
  PriceData, PriceFilter, NewsItem, NewsFilter,
  SteelProduct, Region, ExchangeRateCache
} from '@/lib/types'
import { createServiceClient } from '@/lib/supabase'
import { supabase as anonClient } from '@/lib/supabase'

export class SupabaseStorageProvider implements StorageProvider {

  async savePrices(data: PriceData[]): Promise<void> {
    const supabase = createServiceClient()
    for (const item of data) {
      // Delete existing row for same product/region/country today, then insert
      // (avoids expression-based unique index issues with upsert)
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('prices')
        .delete()
        .eq('product', item.product)
        .eq('region', item.region)
        .eq('country', item.country || '')
        .gte('fetched_at', `${today}T00:00:00`)
        .lt('fetched_at', `${today}T23:59:59`)

      await supabase.from('prices').insert({
        product: item.product,
        region: item.region,
        country: item.country || null,
        price: item.price,
        currency: item.currency,
        unit: item.unit,
        source: item.source,
        fetched_at: item.fetchedAt.toISOString(),
      })
    }
  }

  async getPrices(filters: PriceFilter): Promise<PriceData[]> {
    let query = anonClient.from('prices').select('*')

    if (filters.product) query = query.eq('product', filters.product)
    if (filters.region) query = query.eq('region', filters.region)
    if (filters.country) query = query.eq('country', filters.country)
    if (filters.fromDate) query = query.gte('fetched_at', filters.fromDate.toISOString())
    if (filters.toDate) query = query.lte('fetched_at', filters.toDate.toISOString())

    query = query.order('fetched_at', { ascending: filters.ascending ?? false })
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(row => ({
      product: row.product as SteelProduct,
      region: row.region as Region,
      country: row.country,
      price: Number(row.price),
      currency: row.currency,
      unit: row.unit,
      source: row.source,
      fetchedAt: new Date(row.fetched_at),
    }))
  }

  async getLatestPrice(product: SteelProduct, region: Region): Promise<PriceData | null> {
    const results = await this.getPrices({ product, region, limit: 1 })
    return results[0] || null
  }

  async saveNews(items: NewsItem[]): Promise<void> {
    const supabase = createServiceClient()
    const rows = items.map(item => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      source: item.source,
      category: item.category,
      region: item.region,
      country: item.country || null,
      sentiment: item.sentiment,
      confidence: item.confidence,
      published_at: item.publishedAt?.toISOString(),
      fetched_at: item.fetchedAt.toISOString(),
    }))

    const { error } = await supabase.from('news').upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    if (error) throw error
  }

  async getNews(filters: NewsFilter): Promise<NewsItem[]> {
    let query = anonClient.from('news').select('*')

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.region) query = query.eq('region', filters.region)
    if (filters.country) query = query.eq('country', filters.country)
    if (filters.fromDate) query = query.gte('fetched_at', filters.fromDate.toISOString())
    if (filters.toDate) query = query.lte('fetched_at', filters.toDate.toISOString())

    query = query.order('fetched_at', { ascending: false })
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(row => ({
      title: row.title,
      url: row.url,
      snippet: row.snippet,
      source: row.source,
      category: row.category,
      region: row.region,
      country: row.country,
      sentiment: row.sentiment ? Number(row.sentiment) : undefined,
      confidence: row.confidence ? Number(row.confidence) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      fetchedAt: new Date(row.fetched_at),
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getLastSuccessful(type: string, region: string): Promise<Record<string, any> | null> {
    const { data } = await anonClient
      .from('last_successful')
      .select('payload, updated_at')
      .eq('data_type', type)
      .eq('region', region)
      .single()

    return data ? { ...data.payload, _updatedAt: data.updated_at } : null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async saveLastSuccessful(type: string, region: string, payload: Record<string, any>): Promise<void> {
    const supabase = createServiceClient()
    await supabase
      .from('last_successful')
      .upsert(
        { data_type: type, region, payload, updated_at: new Date().toISOString() },
        { onConflict: 'data_type,region' }
      )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveExchangeRates(_rates: ExchangeRateCache): Promise<void> {
    // Handled by exchange/rates.ts directly
  }

  async getExchangeRates(): Promise<ExchangeRateCache | null> {
    // Handled by exchange/rates.ts directly
    return null
  }
}
