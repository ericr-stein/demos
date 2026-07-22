/**
 * Marching squares: extracts constant-value contours ("isolines") from the
 * population grid — the green lines on Perozzo's stereogram, and the same
 * algorithm behind elevation lines on hiking maps.
 *
 * For every grid cell (4 corner values) and every contour level, we find the
 * edges the level crosses, linearly interpolate the crossing point, and emit
 * a line segment between the two crossings.
 */
import type { PopulationGrid } from '../../data/grid'

export interface IsolineSegment {
  /** grid-space endpoints: [yearIdx, ageIdx] fractions */
  a: [number, number]
  b: [number, number]
  level: number
}

export function marchingSquares(
  grid: PopulationGrid,
  levels: number[],
): IsolineSegment[] {
  const segs: IsolineSegment[] = []
  const { value } = grid
  const nY = value.length
  const nA = value[0].length

  // fraction along an edge where `level` sits between corner values v0→v1
  const t = (level: number, v0: number, v1: number) =>
    v1 === v0 ? 0.5 : (level - v0) / (v1 - v0)

  for (const level of levels) {
    for (let y = 0; y < nY - 1; y++) {
      for (let a = 0; a < nA - 1; a++) {
        const v00 = value[y][a] // corner (y, a)
        const v10 = value[y + 1][a] // corner (y+1, a)
        const v01 = value[y][a + 1] // corner (y, a+1)
        const v11 = value[y + 1][a + 1] // corner (y+1, a+1)

        // crossing points on each of the cell's four edges (or null)
        const top =
          v00 >= level !== v10 >= level
            ? ([y + t(level, v00, v10), a] as [number, number])
            : null
        const bottom =
          v01 >= level !== v11 >= level
            ? ([y + t(level, v01, v11), a + 1] as [number, number])
            : null
        const left =
          v00 >= level !== v01 >= level
            ? ([y, a + t(level, v00, v01)] as [number, number])
            : null
        const right =
          v10 >= level !== v11 >= level
            ? ([y + 1, a + t(level, v10, v11)] as [number, number])
            : null

        const pts = [top, bottom, left, right].filter(Boolean) as [
          number,
          number,
        ][]
        // 2 crossings = one segment; 4 = saddle cell, pair them simply
        if (pts.length === 2) segs.push({ a: pts[0], b: pts[1], level })
        else if (pts.length === 4) {
          segs.push({ a: pts[0], b: pts[2], level })
          segs.push({ a: pts[1], b: pts[3], level })
        }
      }
    }
  }
  return segs
}
