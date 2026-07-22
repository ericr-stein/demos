/**
 * Loads the (year × age) population grid that the Perozzo stereogram is
 * built from. One API aggregation gives count-of-people per year per
 * single-year age class; ages above MAX_AGE are folded into the top bucket.
 */
const MAX_AGE = 100

export interface PopulationGrid {
  years: number[] // x axis, ascending
  ages: number[] // z axis, 0..MAX_AGE
  /** value[yearIndex][ageIndex] = people of that age in that year */
  value: number[][]
  maxValue: number
}

export async function loadPopulationGrid(): Promise<PopulationGrid | null> {
  try {
    const res = await fetch(
      '/api/data/ktzh_population?group_by=jahr,einjahresaltersklasse&sum=anzahl&limit=10000',
    )
    if (!res.ok) return null
    const { rows } = (await res.json()) as {
      rows: { jahr: string; einjahresaltersklasse: string; anzahl: string }[]
    }
    if (!rows?.length) return null

    const years = [...new Set(rows.map((r) => Number(r.jahr)))].sort((a, b) => a - b)
    const ages = Array.from({ length: MAX_AGE + 1 }, (_, i) => i)
    const yearIndex = new Map(years.map((y, i) => [y, i]))
    const value = years.map(() => new Array(MAX_AGE + 1).fill(0))

    for (const r of rows) {
      const yi = yearIndex.get(Number(r.jahr))!
      const age = Math.min(Number(r.einjahresaltersklasse), MAX_AGE)
      value[yi][age] += Number(r.anzahl)
    }
    const maxValue = Math.max(...value.flat())
    return { years, ages, value, maxValue }
  } catch {
    return null
  }
}
