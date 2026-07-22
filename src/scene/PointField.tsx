import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { usePoints, useVizStore } from '../store'
import { sonifyPoint } from '../audio/engine'

const BASE_COLOR = new THREE.Color('#335c67')
const HOT_COLOR = new THREE.Color('#e09f3e')
const HOVER_COLOR = new THREE.Color('#fff3b0')

/**
 * Instanced column field: lon → x, lat → z, population → column height + color.
 * One draw call regardless of dataset size. Extents and the population scale
 * are computed across ALL years so columns stay put and heights stay
 * comparable while scrubbing the year slider.
 */
export function PointField() {
  const points = usePoints()
  const byYear = useVizStore((s) => s.byYear)
  const hoveredId = useVizStore((s) => s.hoveredId)
  const setHovered = useVizStore((s) => s.setHovered)
  const setSelected = useVizStore((s) => s.setSelected)
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const bounds = useMemo(() => {
    const all = Object.values(byYear).flat()
    if (all.length === 0) return null
    const lats = all.map((p) => p.lat)
    const lons = all.map((p) => p.lon)
    return {
      latMin: Math.min(...lats),
      latSpan: Math.max(Math.max(...lats) - Math.min(...lats), 1e-6),
      lonMin: Math.min(...lons),
      lonSpan: Math.max(Math.max(...lons) - Math.min(...lons), 1e-6),
      popMax: Math.max(...all.map((p) => p.population), 1),
    }
  }, [byYear])

  const layout = useMemo(() => {
    if (!bounds || points.length === 0) return null
    const span = 40 // world units across the wider axis
    return points.map((p) => {
      // sqrt scaling keeps small municipalities visible next to Zürich city
      const t = Math.sqrt(p.population / bounds.popMax)
      return {
        x: ((p.lon - bounds.lonMin) / bounds.lonSpan - 0.5) * span,
        z: -((p.lat - bounds.latMin) / bounds.latSpan - 0.5) *
          span * (bounds.latSpan / bounds.lonSpan) * 1.4, // ~cos(47°) aspect
        height: 0.25 + t * 12,
        t,
      }
    })
  }, [bounds, points])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !layout) return
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    layout.forEach((l, i) => {
      m.makeScale(1, l.height, 1)
      m.setPosition(l.x, l.height / 2, l.z)
      mesh.setMatrixAt(i, m)
      c.copy(BASE_COLOR).lerp(HOT_COLOR, l.t)
      if (points[i].id === hoveredId) c.copy(HOVER_COLOR)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [layout, points, hoveredId])

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const point =
      e.instanceId !== undefined ? points[e.instanceId] ?? null : null
    setHovered(point?.id ?? null)
    sonifyPoint(point)
  }

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId !== undefined) setSelected(points[e.instanceId]?.id ?? null)
  }

  if (!layout) return null

  return (
    <instancedMesh
      ref={meshRef}
      key={points.length}
      args={[undefined, undefined, points.length]}
      onPointerMove={onMove}
      onPointerOut={() => {
        setHovered(null)
        sonifyPoint(null)
      }}
      onClick={onClick}
    >
      <boxGeometry args={[0.35, 1, 0.35]} />
      <meshStandardMaterial roughness={0.35} metalness={0.1} />
    </instancedMesh>
  )
}
