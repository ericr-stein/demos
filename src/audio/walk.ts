/**
 * ── THE 3D WALK ─────────────────────────────────────────────────────────
 *
 * The playback timeline for the stereogram: starting at (first year, age 0),
 * walk the age line 0 → 99, hop to the next year, walk again — through to
 * the last year. One WalkStep per (year, age) cell, in playback order.
 *
 * Ages stop at 99 ON PURPOSE: 100 steps per year = 25 bars of 4/4, so each
 * year is a clean musical phrase. The surface still shows the 100+ bucket;
 * the walk just doesn't sound it.
 *
 * This is THE data contract for sonification. The glowing dot, the HUD and
 * the sound engine all consume the same precomputed array, so audio and
 * visuals can never drift apart.
 *
 * For the Tone.js side: implement `sonifyStep(step)` in engine.ts —
 * see example-integration.ts for a fuller, commented starting point.
 */
import type { PopulationGrid } from '../data/grid'

export interface WalkStep {
  /** position in the timeline, 0 .. walk.length-1 */
  index: number
  /** calendar year of this step, e.g. 2014 */
  year: number
  /** age class 0..99 (the 100+ bucket is excluded — see header comment) */
  age: number
  /** birth year of the people at this step (year − age) */
  born: number
  /** how many people of this age lived in this year */
  count: number
  /** count normalized against the whole grid's maximum → 0..1, ready to map
   *  onto pitch / gain / filter cutoff without knowing absolute numbers */
  norm: number
  /** true on every age-0 step — the start of a new year's line. Handy for
   *  accents: a percussion hit, a chord change, announcing the year, … */
  yearStart: boolean
}

export function buildWalk(grid: PopulationGrid): WalkStep[] {
  const steps: WalkStep[] = []
  for (let yi = 0; yi < grid.years.length; yi++) {
    for (let ai = 0; ai < grid.ages.length; ai++) {
      if (grid.ages[ai] > 99) continue // 100 steps/year → 25 bars of 4/4
      const count = grid.value[yi][ai]
      steps.push({
        index: steps.length,
        year: grid.years[yi],
        age: grid.ages[ai],
        born: grid.years[yi] - grid.ages[ai],
        count,
        norm: count / grid.maxValue,
        yearStart: ai === 0,
      })
    }
  }
  return steps
}
