// src/providers/price/scraper.ts
import * as cheerio from 'cheerio'
import { PriceProvider } from '@/providers/interfaces'
import { SteelProduct, Region, PriceData } from '@/lib/types'
import { PRODUCTS } from '@/config/products'
import { normalizePrice } from '@/lib/normalizer'
import { getExchangeRates } from '@/providers/exchange/rates'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const TE_BASE = 'https://tradingeconomics.com'

export class ScraperPriceProvider implements PriceProvider {
  name = 'scraperapi-tradingeconomics'

  async isAvailable(): Promise<boolean> {
    return !!SCRAPER_API_KEY
  }

  async getPrice(product: SteelProduct, region: Region): Promise<PriceData | null> {
    const config = PRODUCTS[product]
    if (!config.teUrl || !SCRAPER_API_KEY) return null

    try {
      const targetUrl = `${TE_BASE}${config.teUrl}`
      const apiUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=true`

      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) return null

      const html = await res.text()
      const price = this.parsePrice(html, product)

      if (!price) return null

      const rates = await getExchangeRates()
      const normalized = normalizePrice(price, config.defaultUnit, 'USD', rates)

      return {
        product,
        region,
        price: normalized.value,
        currency: 'USD',
        unit: config.defaultUnit,
        source: this.name,
        fetchedAt: new Date(),
      }
    } catch (err) {
      console.error(`ScraperAPI error for ${product}:`, err)
      return null
    }
  }

  private parsePrice(html: string, product: SteelProduct): number | null {
    const $ = cheerio.load(html)

    // TradingEconomics shows the main price in #p element or .te-pv
    const priceText =
      $('#p').text().trim() ||
      $('[id="p"]').text().trim() ||
      $('.te-pv').first().text().trim()

    if (!priceText) {
      // Fallback: look for price in table rows
      const rows = $('table tr')
      for (let i = 0; i < rows.length; i++) {
        const cells = $(rows[i]).find('td')
        const text = cells.first().text().trim()
        if (text.toLowerCase().includes(product.toLowerCase())) {
          const priceCell = $(cells[1]).text().trim()
          const num = parseFloat(priceCell.replace(/[^0-9.]/g, ''))
          if (!isNaN(num) && num > 0) return num
        }
      }
      return null
    }

    const num = parseFloat(priceText.replace(/[^0-9.]/g, ''))
    return isNaN(num) || num <= 0 ? null : num
  }
}
