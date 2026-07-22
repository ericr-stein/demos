import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useVizStore } from '../store'
import { sonifyPoint } from '../audio/engine'

const BASE_COLOR = new THREE.Color('#4f8fea')
const HOT_COLOR = new THREE.Color('#f2b134')
const HOVER_COLOR = new THREE.Color('#ffffff')

/**
 * Instanced column field: lon → x, lat → z, population → column height + color.
 * One draw call regardless of dataset size.
 */
export function PointField() {
  const points = useVizStore((s) => s.points)
  const hoveredId = useVizStore((s) => s.hoveredId)
  const setHovered = useVizStore((s) => s.setHovered)
  const setSelected = useVizStore((s) => s.setSelected)
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const layout = useMemo(() => {
    if (points.length === 0) return null
    const lats = points.map((p) => p.lat)
    const lons = points.map((p) => p.lon)
    const pops = points.map((p) => p.population)
    const latMin = Math.min(...lats)
    const latMax = Math.max(...lats)
    const lonMin = Math.min(...lons)
    const lonMax = Math.max(...lons)
    const popMax = Math.max(...pops)
    const span = 40 // world units across the wider axis
    const lonSpan = Math.max(lonMax - lonMin, 1e-6)
    const latSpan = Math.max(latMax - latMin, 1e-6)
    return points.map((p) => {
      const t = p.population / popMax
      return {
        x: ((p.lon - lonMin) / lonSpan - 0.5) * span,
        z: ((p.lat - latMin) / latSpan - 0.5) * span * (latSpan / lonSpan),
        height: 0.3 + t * 10,
        t,
      }
    })
  }, [points])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !layout) return
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    layout.forEach((l, i) => {
      m.makeScale(1, l.height, 1)
      m.setPosition(l.x, l.height / 2, l.z)
      mesh.setMatrixAt(i, m)
      const hovered = points[i].id === hoveredId
      c.copy(BASE_COLOR).lerp(HOT_COLOR, Math.sqrt(l.t))
      if (hovered) c.copy(HOVER_COLOR)
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
