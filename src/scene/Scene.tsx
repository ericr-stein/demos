import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import { PointField } from './PointField'
import { Stereogram } from './stereogram/Stereogram'
import { useVizStore } from '../store'

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
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  )
}
