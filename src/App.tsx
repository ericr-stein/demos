import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { useVizStore } from './store'
import { loadPopulationData } from './data/load'
import { enableAudio } from './audio/engine'
import './App.css'

export default function App() {
  const points = useVizStore((s) => s.points)
  const source = useVizStore((s) => s.source)
  const hoveredId = useVizStore((s) => s.hoveredId)
  const selectedId = useVizStore((s) => s.selectedId)
  const audioEnabled = useVizStore((s) => s.audioEnabled)
  const setData = useVizStore((s) => s.setData)
  const setAudioEnabled = useVizStore((s) => s.setAudioEnabled)

  useEffect(() => {
    loadPopulationData().then(({ points, source }) => setData(points, source))
  }, [setData])

  const hovered = points.find((p) => p.id === hoveredId)
  const selected = points.find((p) => p.id === selectedId)
  const shown = hovered ?? selected

  return (
    <div className="app">
      <Scene />
      <header className="hud hud-top">
        <h1>demos</h1>
        <span className="sub">
          population field · {points.length} points · {source} data
        </span>
        <button
          className={audioEnabled ? 'audio on' : 'audio'}
          onClick={async () => {
            await enableAudio()
            setAudioEnabled(true)
          }}
          disabled={audioEnabled}
        >
          {audioEnabled ? '♪ audio on — hover the field' : 'enable audio'}
        </button>
      </header>
      {shown && (
        <aside className="hud hud-info">
          <strong>{shown.name}</strong>
          <div>{shown.region}</div>
          <div className="pop">{shown.population.toLocaleString('de-CH')} people</div>
        </aside>
      )}
    </div>
  )
}
