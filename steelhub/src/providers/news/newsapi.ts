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

      // Filter noise first, then classify in parallel to avoid Vercel 10s timeout
      const filtered = (json.articles ?? []).filter((article: { title?: string; description?: string }) => {
        const title = article.title || ''
        const snippet = article.description || ''
        return !isNoise(title, snippet)
      })

      const classifications = await Promise.all(
        filtered.map((article: { title?: string; description?: string }) =>
          classifyWithGroq(article.title || '', article.description || '')
        )
      )

      const articles: NewsItem[] = []
      for (let i = 0; i < filtered.length; i++) {
        const article = filtered[i]
        const classification = classifications[i]
        if (!classification.isRelevant) continue

        const title = article.title || ''
        const tier = getDomainTier(article.url || '')
        const confidenceBoost = tier === 1 ? 0.2 : tier === 2 ? 0.1 : 0

        articles.push({
          title,
          url: article.url || undefined,
          snippet: article.description || '',
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
