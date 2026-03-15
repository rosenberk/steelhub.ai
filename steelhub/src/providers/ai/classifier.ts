// src/providers/ai/classifier.ts
import Groq from 'groq-sdk'
import { Category, ClassificationResult } from '@/lib/types'
import { CATEGORIES } from '@/config/categories'

const SYSTEM_PROMPT = `You are a steel industry news classifier. Classify the given headline and snippet into exactly ONE of these categories:

1. hammadde (Raw Materials) — iron ore, coal, scrap, coke, DRI, pig iron
2. urun (Steel Products) — HRC, CRC, HDG, rebar, slab, billet, wire rod, coil, plate
3. tuketim (Consumption) — PMI, manufacturing, construction, automotive, demand, production
4. tasima (Shipping) — freight, BDI, Baltic, shipping, vessel, charter, dry bulk
5. vergi (Tariffs & Trade) — tariff, duty, CBAM, anti-dumping, safeguard, import tax, quota

Respond with ONLY a JSON object: {"category": "<id>", "confidence": <0.0-1.0>, "isRelevant": <true/false>}
Set isRelevant to false if the article is not about the steel industry.`

export async function classifyWithGroq(
  title: string,
  snippet: string
): Promise<ClassificationResult> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return classifyWithKeywords(title, snippet)

  const client = new Groq({ apiKey: groqKey })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const completion = await client.chat.completions.create(
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Title: ${title}\nSnippet: ${snippet || 'N/A'}` },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const text = completion.choices[0]?.message?.content
    if (!text) return classifyWithKeywords(title, snippet)

    const parsed = JSON.parse(text)
    const validCategories: Category[] = ['hammadde', 'urun', 'tuketim', 'tasima', 'vergi']
    if (!validCategories.includes(parsed.category)) {
      return classifyWithKeywords(title, snippet)
    }

    return {
      category: parsed.category as Category,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      isRelevant: parsed.isRelevant !== false,
    }
  } catch {
    clearTimeout(timeout)
    return classifyWithKeywords(title, snippet)
  }
}

export function classifyWithKeywords(
  title: string,
  snippet: string
): ClassificationResult {
  const text = `${title} ${snippet}`.toLowerCase()

  let bestCategory: Category = 'urun'
  let bestScore = 0

  for (const [catId, config] of Object.entries(CATEGORIES)) {
    const score = config.keywords.filter(kw => text.includes(kw.toLowerCase())).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = catId as Category
    }
  }

  return {
    category: bestCategory,
    confidence: bestScore > 0 ? Math.min(0.8, bestScore * 0.2) : 0.1,
    isRelevant: bestScore > 0,
  }
}
