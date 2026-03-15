// src/providers/news/brave.ts
import { NewsProvider } from '../interfaces'
import { NewsItem, Category, Region } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'
import { REGIONS } from '@/config/regions'
import { getDomainTier, isNoise } from '@/config/trusted-domains'
import { classifyWithGroq } from '../ai/classifier'

export class BraveSearchProvider implements NewsProvider {
  name = 'brave'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.BRAVE_API_KEY || ''
  }

  async searchNews(category: Category, region: Region): Promise<NewsItem[]> {
    if (!this.apiKey) return []

    const regionConfig = REGIONS[region]
    const keywords = CATEGORIES[category].keywords.slice(0, 2).join(' ')
    const country = regionConfig.countries[0]
    const query = `${keywords} steel ${country}`

    try {
      const url = new URL('https://api.search.brave.com/res/v1/news/search')
      url.searchParams.set('q', query)
      url.searchParams.set('count', '10')
      url.searchParams.set('freshness', 'pd')

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      })

      if (!res.ok) {
        console.error(`Brave Search error: ${res.status}`)
        return []
      }

      const json = await res.json()

      // Filter noise first, then classify in parallel to avoid Vercel 10s timeout
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (json.results ?? []).filter((result: any) => {
        return !isNoise(result.title || '', result.description || '')
      })

      const classifications = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filtered.map((result: any) =>
          classifyWithGroq(result.title || '', result.description || '')
        )
      )

      const articles: NewsItem[] = []
      for (let i = 0; i < filtered.length; i++) {
        const result = filtered[i]
        const classification = classifications[i]
        if (!classification.isRelevant) continue

        const title = result.title || ''
        const tier = getDomainTier(result.url || '')
        const confidenceBoost = tier === 1 ? 0.2 : tier === 2 ? 0.1 : 0

        articles.push({
          title,
          url: result.url || undefined,
          snippet: result.description || '',
          source: result.meta_url?.hostname || undefined,
          category: classification.category,
          region,
          sentiment: undefined,
          confidence: Math.min(1, classification.confidence + confidenceBoost),
          publishedAt: undefined, // Brave returns relative time strings, not parseable dates
          fetchedAt: new Date(),
        })
      }

      return articles
    } catch (err) {
      console.error('Brave Search error:', err)
      return []
    }
  }
}
