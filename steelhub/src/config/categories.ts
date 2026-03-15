// src/config/categories.ts
import { Category, CategoryConfig } from '@/lib/types'

export const CATEGORIES: Record<Category, CategoryConfig> = {
  hammadde: {
    id: 'hammadde',
    name: 'Hammadde',
    nameEn: 'Raw Materials',
    keywords: [
      'scrap', 'ore', 'coal', 'coke', 'pig iron', 'DRI',
      'sponge iron', 'iron ore', 'coking coal', 'HMS',
      'shredded scrap', 'heavy melting'
    ],
  },
  urun: {
    id: 'urun',
    name: 'Çelik Ürünü',
    nameEn: 'Steel Products',
    keywords: [
      'HRC', 'CRC', 'HDG', 'slab', 'billet', 'rebar', 'PPGI',
      'hot rolled', 'cold rolled', 'galvanized', 'wire rod',
      'steel coil', 'steel plate', 'steel sheet'
    ],
  },
  tuketim: {
    id: 'tuketim',
    name: 'Tüketim',
    nameEn: 'Consumption',
    keywords: [
      'PMI', 'manufacturing', 'construction', 'automotive',
      'demand', 'production', 'output', 'capacity',
      'steel consumption', 'steel demand'
    ],
  },
  tasima: {
    id: 'tasima',
    name: 'Taşımacılık',
    nameEn: 'Shipping',
    keywords: [
      'freight', 'BDI', 'shipping', 'vessel', 'Capesize',
      'Panamax', 'Baltic', 'container', 'bulk carrier',
      'charter rate', 'dry bulk'
    ],
  },
  vergi: {
    id: 'vergi',
    name: 'Vergiler/Ticaret',
    nameEn: 'Tariffs & Trade',
    keywords: [
      'tariff', 'duty', 'CBAM', 'anti-dumping', 'safeguard',
      'import tax', 'export ban', 'trade policy', 'Section 232',
      'countervailing', 'quota'
    ],
  },
}

export const ALL_CATEGORIES: Category[] = Object.keys(CATEGORIES) as Category[]
