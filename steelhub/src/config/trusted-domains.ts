// src/config/trusted-domains.ts

// Tier 1: Steel industry sources (confidence +0.2)
export const TIER_1_DOMAINS = [
  'argusmedia.com', 'spglobal.com', 'platts.com',
  'steelorbis.com', 'kallanish.com', 'mysteel.net',
  'bigmint.co', 'steelonthenet.com', 'worldsteel.org',
  'fastmarkets.com', 'crugroup.com', 'metalexpert.com',
]

// Tier 2: Financial/news (confidence +0.1)
export const TIER_2_DOMAINS = [
  'reuters.com', 'bloomberg.com', 'ft.com',
  'tradingeconomics.com', 'investing.com',
  'steelmint.com', 'worldsteelprices.com',
  'gmk.center', 'metalinfo.ru',
]

export const ALL_TRUSTED_DOMAINS = [...TIER_1_DOMAINS, ...TIER_2_DOMAINS]

export function getDomainTier(url: string): 1 | 2 | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    if (TIER_1_DOMAINS.some(d => hostname.includes(d))) return 1
    if (TIER_2_DOMAINS.some(d => hostname.includes(d))) return 2
    return null
  } catch {
    return null
  }
}

// Noise keywords — articles containing these are filtered out
export const NOISE_KEYWORDS = [
  'minecraft', 'game', 'recipe', 'movie', 'song',
  'stainless steel watch', 'steel guitar', 'steel wool',
  'man of steel', 'steel curtain', 'nerves of steel',
  'real steel', 'steel magnolias', 'steel drum',
  'stainless steel tumbler', 'steel toe boots',
]

export function isNoise(title: string, snippet: string = ''): boolean {
  const text = `${title} ${snippet}`.toLowerCase()
  return NOISE_KEYWORDS.some(kw => text.includes(kw))
}
