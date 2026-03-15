// src/providers/news/newsapi.ts
import { NewsProvider } from '../interfaces'
import { NewsItem, Category, Region } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'
import { REGIONS } from '@/config/regions'
import { getDomainTier, isNoise } from '@/config/trusted-domains'
import { classifyWithGroq } from '../ai/classifier'

export class NewsAPIProvider implements NewsProvider {
  name = 'newsapi'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEWSAPI_KEY || ''
  }

  async searchNews(category: Category, region: Region): Promise<NewsItem[]> {
    if (!this.apiKey) return []

    const regionConfig = REGIONS[region]
    const keywords = CATEGORIES[category].keywords.slice(0, 3).join(' OR ')
    const countries = regionConfig.countries.slice(0, 3).join(' OR ')
    const query = `(${keywords}) AND (${countries} OR steel)`

    try {
      const url = new URL('https://newsapi.org/v2/everything')
      url.searchParams.set('q', query)
      url.searchParams.set('language', 'en')
      url.searchParams.set('sortBy', 'publishedAt')
      url.searchParams.set('pageSize', '10')
      url.searchParams.set('apiKey', this.apiKey)

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'SteelHub/1.0' },
      })

      if (!res.ok) {
        console.error(`NewsAPI error: ${res.status}`)
        return []
      }

      const json = await res.json()
      const articles: NewsItem[] = []

      for (const article of json.articles ?? []) {
        const title = article.title || ''
        const snippet = article.description || ''

        // Filter noise
        if (isNoise(title, snippet)) continue

        // Classify
        const classification = await classifyWithGroq(title, snippet)
        if (!classification.isRelevant) continue

        // Domain tier confidence boost
        const tier = getDomainTier(article.url || '')
        const confidenceBoost = tier === 1 ? 0.2 : tier === 2 ? 0.1 : 0

        articles.push({
          title,
          url: article.url || undefined,
          snippet,
          source: article.source?.name || undefined,
          category: classification.category,
          region,
          sentiment: undefined,
          confidence: Math.min(1, classification.confidence + confidenceBoost),
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
          fetchedAt: new Date(),
        })
      }

      return articles
    } catch (err) {
      console.error('NewsAPI fetch error:', err)
      return []
    }
  }
}
