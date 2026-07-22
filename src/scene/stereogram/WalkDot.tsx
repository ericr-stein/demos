import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import { useVizStore } from '../../store'
import { sonifyStep } from '../../audio/engine'
import type { PopulationGrid } from '../../data/grid'

/**
 * The glowing dot that performs the 3D walk, plus the playback clock.
 *
 * Each frame while `playing`:
 *   1. advance a time accumulator by stepsPerSecond
 *   2. for every whole step crossed, fire sonifyStep (audio) and move the
 *      target position (visual) — one shared timeline, engine.ts decides
 *      what it sounds like
 *   3. lerp the dot toward its target so motion looks continuous even
 *      though the data is discrete
 *
 * The glow: the core's emissive color is pushed past 1.0 with
 * toneMapped=false, and the Bloom pass in Scene.tsx only picks up
 * colors that bright — so the dot and its comet trail bloom while the
 * rest of the scene stays crisp. A PointLight rides along so the
 * surface itself catches the shine.
 */
export function WalkDot({
  grid,
  pos,
}: {
  grid: PopulationGrid
  pos: (yi: number, ai: number, v: number) => THREE.Vector3
}) {
  const group = useRef<THREE.Group>(null)
  const acc = useRef(0)
  const walk = useVizStore((s) => s.walk)
  const playing = useVizStore((s) => s.playing)
  const stepIndex = useVizStore((s) => s.stepIndex)
  const stepsPerSecond = useVizStore((s) => s.stepsPerSecond)
  const setStepIndex = useVizStore((s) => s.setStepIndex)
  const setPlaying = useVizStore((s) => s.setPlaying)

  useFrame((_, delta) => {
    if (walk.length === 0 || !group.current) return

    let index = stepIndex
    if (playing) {
      acc.current += delta * stepsPerSecond
      const whole = Math.floor(acc.current)
      if (whole > 0) {
        acc.current -= whole
        for (let s = 1; s <= whole; s++) {
          const next = index + s
          if (next < walk.length) sonifyStep(walk[next]) // audio: every step
        }
        index = Math.min(index + whole, walk.length - 1)
        setStepIndex(index)
        if (index >= walk.length - 1) setPlaying(false) // end of the walk
      }
    }

    // visual: glide toward the current step's position, floating just
    // above the surface so the sphere never clips into it
    const step = walk[index]
    const yi = grid.years.indexOf(step.year)
    const target = pos(yi, step.age, step.count)
    target.y += 0.42
    group.current.position.lerp(target, Math.min(1, delta * 14))
  })

  return (
    <>
      {/* comet tail: Trail samples the moving mesh every frame and draws a
          tapering ribbon; the super-bright color makes the bloom pass
          light it up */}
      <Trail
        width={2.2}
        length={7}
        decay={1.2}
        attenuation={(t) => t * t}
        color={new THREE.Color(3.5, 2.2, 0.7)}
      >
        <group ref={group}>
          {/* emissive core — brighter than 1.0 so bloom catches it */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial
              color={new THREE.Color(4, 3, 1.1)}
              toneMapped={false}
            />
          </mesh>
          {/* the light that makes the surface glow around the dot */}
          <pointLight color="#ffd97a" intensity={40} distance={9} decay={2} />
        </group>
      </Trail>
    </>
  )
}
