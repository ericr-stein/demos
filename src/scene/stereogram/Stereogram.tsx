import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import { useVizStore } from '../../store'
import { sonifyValue } from '../../audio/engine'
import type { PopulationGrid } from '../../data/grid'
import { marchingSquares } from './isolines'
import { WalkDot } from './WalkDot'

/**
 * Perozzo stereogram (1879): a population surface over year × age.
 *
 *   x — year         (the "march of time")
 *   z — age 0..100   (receding into the scene)
 *   y — people of that age in that year
 *
 * The three classic line families:
 *   red    year profiles   = population pyramid of a single year
 *   blue   cohort lines    = everyone born in year b, at age = year − b;
 *                            they only ever descend → visible survivorship
 *   green  isolines        = contours of constant population count
 */
const X_SPAN = 26
const Z_SPAN = 42
const HEIGHT = 11
const LIFT = 0.04 // lines float a hair above the surface to avoid z-fighting

const ISOLINE_LEVELS = [2_000, 5_000, 10_000, 15_000, 20_000]

export function Stereogram({ grid }: { grid: PopulationGrid }) {
  const setStereoHover = useVizStore((s) => s.setStereoHover)
  const nY = grid.years.length
  const nA = grid.ages.length

  // grid indices → world space
  const pos = useMemo(() => {
    return (yi: number, ai: number, v: number) =>
      new THREE.Vector3(
        (yi / (nY - 1) - 0.5) * X_SPAN,
        (v / grid.maxValue) * HEIGHT,
        (ai / (nA - 1) - 0.5) * Z_SPAN,
      )
  }, [grid, nY, nA])

  // ── the surface: one vertex per grid node, two triangles per cell ──
  const surface = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(nY * nA * 3)
    const colors = new Float32Array(nY * nA * 3)
    const low = new THREE.Color('#2a3550')
    const high = new THREE.Color('#e8d9b0')
    const c = new THREE.Color()
    for (let yi = 0; yi < nY; yi++) {
      for (let ai = 0; ai < nA; ai++) {
        const i = yi * nA + ai
        const v = grid.value[yi][ai]
        const p = pos(yi, ai, v)
        positions.set([p.x, p.y, p.z], i * 3)
        c.copy(low).lerp(high, Math.sqrt(v / grid.maxValue))
        colors.set([c.r, c.g, c.b], i * 3)
      }
    }
    const index: number[] = []
    for (let yi = 0; yi < nY - 1; yi++) {
      for (let ai = 0; ai < nA - 1; ai++) {
        const a = yi * nA + ai
        index.push(a, a + 1, a + nA, a + 1, a + nA + 1, a + nA)
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setIndex(index)
    geo.computeVertexNormals()
    return geo
  }, [grid, nY, nA, pos])

  // ── skirt walls + floor: close the surface into a solid block, so the
  // shape reads as a mountain. The walls are data too: the age-0 wall is
  // births per year, the first/last-year walls are population pyramids. ──
  const walls = useMemo(() => {
    const strips: [number, number][][] = [
      grid.years.map((_, yi) => [yi, 0]), // age-0 edge (births)
      grid.years.map((_, yi) => [yi, nA - 1]), // oldest-age edge
      grid.ages.map((_, ai) => [0, ai]), // first-year pyramid
      grid.ages.map((_, ai) => [nY - 1, ai]), // last-year pyramid
    ]
    const positions: number[] = []
    for (const strip of strips) {
      for (let k = 0; k < strip.length - 1; k++) {
        const [y0, a0] = strip[k]
        const [y1, a1] = strip[k + 1]
        const t0 = pos(y0, a0, grid.value[y0][a0])
        const t1 = pos(y1, a1, grid.value[y1][a1])
        const b0 = pos(y0, a0, 0)
        const b1 = pos(y1, a1, 0)
        // two triangles per quad: t0-t1-b0, t1-b1-b0
        positions.push(...t0, ...t1, ...b0, ...t1, ...b1, ...b0)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3),
    )
    geo.computeVertexNormals()
    return geo
  }, [grid, nY, nA, pos])

  // ── red year profiles: the surface sliced at each year ──
  const yearProfiles = useMemo(
    () =>
      grid.years.map((_, yi) =>
        grid.ages.map((_, ai) =>
          pos(yi, ai, grid.value[yi][ai]).setY(
            pos(yi, ai, grid.value[yi][ai]).y + LIFT,
          ),
        ),
      ),
    [grid, pos],
  )

  // ── blue cohort lines: age = year − birthyear, one polyline per cohort ──
  const cohorts = useMemo(() => {
    const out: { birth: number; pts: THREE.Vector3[] }[] = []
    const y0 = grid.years[0]
    for (let birth = y0 - 100; birth <= grid.years[nY - 1]; birth++) {
      const pts: THREE.Vector3[] = []
      for (let yi = 0; yi < nY; yi++) {
        const age = grid.years[yi] - birth
        if (age >= 0 && age < nA) {
          const p = pos(yi, age, grid.value[yi][age])
          pts.push(p.setY(p.y + LIFT))
        }
      }
      if (pts.length >= 2) out.push({ birth, pts })
    }
    return out
  }, [grid, nY, nA, pos])

  // ── green isolines via marching squares, drawn at their exact level ──
  const isolineGeo = useMemo(() => {
    const segs = marchingSquares(grid, ISOLINE_LEVELS)
    const positions = new Float32Array(segs.length * 6)
    segs.forEach((s, i) => {
      const a = pos(s.a[0], s.a[1], s.level)
      const b = pos(s.b[0], s.b[1], s.level)
      positions.set([a.x, a.y + LIFT, a.z, b.x, b.y + LIFT, b.z], i * 6)
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [grid, pos])

  // hover: world x/z → nearest grid node
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const yi = Math.round(((e.point.x / X_SPAN) + 0.5) * (nY - 1))
    const ai = Math.round(((e.point.z / Z_SPAN) + 0.5) * (nA - 1))
    if (yi < 0 || yi >= nY || ai < 0 || ai >= nA) return
    const count = grid.value[yi][ai]
    setStereoHover({ year: grid.years[yi], age: grid.ages[ai], count })
    // discovery mode only — while the walk plays, the walk owns the sound
    if (!useVizStore.getState().playing)
      sonifyValue(yi * 1000 + ai, count, grid.maxValue)
  }

  return (
    <group>
      <mesh geometry={surface} onPointerMove={onMove}
        onPointerOut={() => setStereoHover(null)}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide}
          roughness={0.75} metalness={0.05} />
      </mesh>

      <mesh geometry={walls}>
        <meshStandardMaterial color="#8f815f" side={THREE.DoubleSide}
          roughness={0.85} metalness={0.05} />
      </mesh>
      {/* floor sealing the block's underside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[X_SPAN, Z_SPAN]} />
        <meshStandardMaterial color="#6f6449" roughness={0.9} />
      </mesh>

      {yearProfiles.map((pts, i) => (
        <Line key={grid.years[i]} points={pts} color="#e05b4b"
          lineWidth={1.6} transparent opacity={0.9} />
      ))}

      {cohorts.map(({ birth, pts }) => (
        <Line key={birth} points={pts} color="#5b8fe0"
          lineWidth={birth % 10 === 0 ? 1.4 : 0.6}
          transparent opacity={birth % 10 === 0 ? 0.95 : 0.4} />
      ))}

      <lineSegments geometry={isolineGeo}>
        <lineBasicMaterial color="#4bc47f" transparent opacity={0.9} />
      </lineSegments>

      {/* the 3D walk: glowing dot + playback clock (see WalkDot.tsx) */}
      <WalkDot grid={grid} pos={pos} />

      {/* axis labels */}
      {grid.years.filter((y) => y % 5 === 0).map((y) => {
        const yi = grid.years.indexOf(y)
        return (
        <Text key={y} position={pos(yi, nA - 1, 0).add(new THREE.Vector3(0, 0, 2))}
          fontSize={1.1} color="#8fa1c4" rotation={[-Math.PI / 2, 0, 0]}>
          {String(y)}
        </Text>
        )
      })}
      {grid.ages.filter((a) => a % 10 === 0).map((a) => (
        <Text key={a} position={pos(0, a, 0).add(new THREE.Vector3(-2.2, 0, 0))}
          fontSize={0.8} color="#8fa1c4" rotation={[-Math.PI / 2, 0, 0]}>
          {a === 100 ? '100+' : String(a)}
        </Text>
      ))}
    </group>
  )
}
