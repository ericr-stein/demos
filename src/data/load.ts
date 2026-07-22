import sample from './sample.json'
import coords from './zh-gemeinden.json'
import type { PopulationPoint } from './types'

export interface PopulationData {
  years: number[]
  byYear: Record<number, PopulationPoint[]>
  source: 'live' | 'drop-zone' | 'sample'
}

const GEMEINDE_COORDS: Record<string, number[]> = coords

/**
 * Live path: aggregate the imported KTZH dataset per year/municipality from
 * the generic fetch API and join the baked BFS-Nr → centroid lookup
 * (zh-gemeinden.json, sourced from Wikidata, covers dissolved municipalities).
 */
async function fromApi(): Promise<PopulationData | null> {
  try {
    const res = await fetch(
      '/api/data/ktzh_population?group_by=jahr,gemeinde_bfs_nr,gemeinde,bezirk&sum=anzahl&limit=6000',
    )
    if (!res.ok) return null
    const { rows } = (await res.json()) as {
      rows: { jahr: string; gemeinde_bfs_nr: string; gemeinde: string; bezirk: string; anzahl: string }[]
    }
    if (!rows?.length) return null
    const byYear: Record<number, PopulationPoint[]> = {}
    for (const r of rows) {
      const c = GEMEINDE_COORDS[r.gemeinde_bfs_nr]
      if (!c) continue
      ;(byYear[Number(r.jahr)] ??= []).push({
        id: Number(r.gemeinde_bfs_nr),
        region: r.bezirk,
        name: r.gemeinde,
        lon: c[0],
        lat: c[1],
        population: Number(r.anzahl),
      })
    }
    const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)
    return years.length > 0 ? { years, byYear, source: 'live' } : null
  } catch {
    return null
  }
}

/** Drop-zone path: a flat PopulationPoint[] at public/data/population.json. */
async function fromDropZone(): Promise<PopulationData | null> {
  try {
    const res = await fetch('/data/population.json')
    if (!res.ok) return null
    const points = (await res.json()) as PopulationPoint[]
    if (!Array.isArray(points) || points.length === 0) return null
    return { years: [0], byYear: { 0: points }, source: 'drop-zone' }
  } catch {
    return null
  }
}

export async function loadPopulationData(): Promise<PopulationData> {
  return (
    (await fromApi()) ??
    (await fromDropZone()) ?? {
      years: [0],
      byYear: { 0: sample as PopulationPoint[] },
      source: 'sample',
    }
  )
}
