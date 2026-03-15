// src/config/regions.ts
import { Region, RegionConfig } from '@/lib/types'

export const REGIONS: Record<Region, RegionConfig> = {
  'far-east': {
    id: 'far-east',
    name: 'Far East',
    countries: ['China', 'Vietnam', 'Japan', 'South Korea', 'Malaysia'],
    priority: 'high',
    updateFrequency: 'daily',
  },
  'asia': {
    id: 'asia',
    name: 'Asia',
    countries: ['India', 'Turkey', 'Saudi Arabia', 'UAE', 'Iran'],
    priority: 'high',
    updateFrequency: 'daily',
  },
  'cis': {
    id: 'cis',
    name: 'CIS',
    countries: ['Russia', 'Ukraine', 'Kazakhstan'],
    priority: 'high',
    updateFrequency: 'daily',
  },
  'eu': {
    id: 'eu',
    name: 'EU',
    countries: ['Germany', 'Italy', 'France', 'Spain', 'Poland', 'Netherlands'],
    priority: 'high',
    updateFrequency: 'daily',
  },
  'africa': {
    id: 'africa',
    name: 'Africa',
    countries: ['Egypt', 'Algeria', 'South Africa', 'Morocco'],
    priority: 'medium',
    updateFrequency: 'weekly',
  },
  'north-america': {
    id: 'north-america',
    name: 'North America',
    countries: ['USA', 'Canada', 'Mexico'],
    priority: 'medium',
    updateFrequency: 'weekly',
  },
  'south-america': {
    id: 'south-america',
    name: 'South America',
    countries: ['Brazil', 'Chile', 'Argentina'],
    priority: 'low',
    updateFrequency: 'weekly',
  },
}

export const DAILY_REGIONS: Region[] = Object.values(REGIONS)
  .filter(r => r.updateFrequency === 'daily')
  .map(r => r.id)

export const WEEKLY_REGIONS: Region[] = Object.values(REGIONS)
  .filter(r => r.updateFrequency === 'weekly')
  .map(r => r.id)

export const ALL_REGIONS: Region[] = Object.keys(REGIONS) as Region[]
