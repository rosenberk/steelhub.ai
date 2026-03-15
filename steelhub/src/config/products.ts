// src/config/products.ts
import { SteelProduct, ProductConfig } from '@/lib/types'

export const PRODUCTS: Record<SteelProduct, ProductConfig> = {
  HRC: {
    id: 'HRC',
    name: 'Hot Rolled Coil',
    category: 'urun',
    yahooSymbol: 'HRC=F',
    teUrl: '/commodity/steel',
    defaultUnit: 'NT',
  },
  CRC: {
    id: 'CRC',
    name: 'Cold Rolled Coil',
    category: 'urun',
    teUrl: '/commodity/cold-rolled-steel',
    defaultUnit: 'MT',
  },
  HDG: {
    id: 'HDG',
    name: 'Hot-Dip Galvanized',
    category: 'urun',
    defaultUnit: 'MT',
  },
  Rebar: {
    id: 'Rebar',
    name: 'Steel Rebar',
    category: 'urun',
    teUrl: '/commodity/steel-rebar',
    defaultUnit: 'MT',
  },
  Slab: {
    id: 'Slab',
    name: 'Steel Slab',
    category: 'urun',
    defaultUnit: 'MT',
  },
  Billet: {
    id: 'Billet',
    name: 'Steel Billet',
    category: 'urun',
    teUrl: '/commodity/steel-billet',
    defaultUnit: 'MT',
  },
  PPGI: {
    id: 'PPGI',
    name: 'Pre-Painted Galvanized',
    category: 'urun',
    defaultUnit: 'MT',
  },
  Scrap: {
    id: 'Scrap',
    name: 'Steel Scrap (HMS)',
    category: 'hammadde',
    teUrl: '/commodity/steel-scrap',
    defaultUnit: 'MT',
  },
  IronOre: {
    id: 'IronOre',
    name: 'Iron Ore 62% Fe',
    category: 'hammadde',
    yahooSymbol: 'TIO=F',
    teUrl: '/commodity/iron-ore',
    defaultUnit: 'MT',
  },
  CokingCoal: {
    id: 'CokingCoal',
    name: 'Coking Coal',
    category: 'hammadde',
    yahooSymbol: 'MTF=F',
    teUrl: '/commodity/coal',
    defaultUnit: 'MT',
  },
}

export const YAHOO_PRODUCTS = Object.values(PRODUCTS).filter(p => p.yahooSymbol)
export const TE_PRODUCTS = Object.values(PRODUCTS).filter(p => p.teUrl)
export const ALL_PRODUCTS: SteelProduct[] = Object.keys(PRODUCTS) as SteelProduct[]
