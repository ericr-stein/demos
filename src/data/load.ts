import sample from './sample.json'
import type { PopulationPoint } from './types'

/**
 * Loads population data. Drop a real dataset at public/data/population.json
 * (same shape as src/data/sample.json) and it is picked up on next page load;
 * otherwise the bundled sample is used.
 */
export async function loadPopulationData(): Promise<{
  points: PopulationPoint[]
  source: 'live' | 'sample'
}> {
  try {
    const res = await fetch('/data/population.json')
    if (res.ok) {
      const points = (await res.json()) as PopulationPoint[]
      if (Array.isArray(points) && points.length > 0) {
        return { points, source: 'live' }
      }
    }
  } catch {
    // no live dataset yet — fall through to sample
  }
  return { points: sample as PopulationPoint[], source: 'sample' }
}
