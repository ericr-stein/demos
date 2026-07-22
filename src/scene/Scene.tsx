import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { PointField } from './PointField'
import { Stereogram } from './stereogram/Stereogram'
import { useVizStore } from '../store'

/** Reframe the camera when the view changes (user can orbit freely after). */
function CameraRig({ view }: { view: 'map' | 'stereogram' }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null
  useEffect(() => {
    if (view === 'stereogram') camera.position.set(34, 16, 40)
    else camera.position.set(0, 22, 34)
    controls?.target?.set(0, view === 'stereogram' ? 4 : 0, 0)
    controls?.update?.()
  }, [view, camera, controls])
  return null
}

export function Scene() {
  const view = useVizStore((s) => s.view)
  const grid = useVizStore((s) => s.grid)

  return (
    <Canvas camera={{ position: [0, 22, 34], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0b0e14']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[15, 30, 10]} intensity={1.2} />
      <Stars radius={200} depth={40} count={2000} factor={4} fade />
      <Grid
        args={[60, 60]}
        position={[0, -0.01, 0]}
        cellColor="#1c2333"
        sectionColor="#2a3450"
        fadeDistance={80}
        infiniteGrid
      />
      {view === 'map' && <PointField />}
      {view === 'stereogram' && grid && <Stereogram grid={grid} />}
      <CameraRig view={view} />
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.05} />
      {/* bloom only grabs colors brighter than 1.0 (toneMapped=false), i.e.
          the walk dot and its trail — the rest of the scene stays crisp */}
      <EffectComposer>
        <Bloom luminanceThreshold={1} intensity={0.85} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
