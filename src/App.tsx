import { useEffect, useMemo } from 'react'
import { Scene } from './scene/Scene'
import { usePoints, useVizStore } from './store'
import { loadPopulationData } from './data/load'
import { enableAudio } from './audio/engine'
import './App.css'

const SOURCE_LABEL = {
  live: 'KTZH Bevölkerungsdaten',
  'drop-zone': 'population.json',
  sample: 'sample data',
  loading: 'loading…',
} as const

export default function App() {
  const points = usePoints()
  const years = useVizStore((s) => s.years)
  const year = useVizStore((s) => s.year)
  const source = useVizStore((s) => s.source)
  const hoveredId = useVizStore((s) => s.hoveredId)
  const selectedId = useVizStore((s) => s.selectedId)
  const audioEnabled = useVizStore((s) => s.audioEnabled)
  const setData = useVizStore((s) => s.setData)
  const setYear = useVizStore((s) => s.setYear)
  const setAudioEnabled = useVizStore((s) => s.setAudioEnabled)

  useEffect(() => {
    loadPopulationData().then(setData)
  }, [setData])

  const total = useMemo(
    () => points.reduce((sum, p) => sum + p.population, 0),
    [points],
  )
  const hovered = points.find((p) => p.id === hoveredId)
  const selected = points.find((p) => p.id === selectedId)
  const shown = hovered ?? selected

  return (
    <div className="app">
      <Scene />
      <header className="hud hud-top">
        <h1>demos</h1>
        <span className="sub">
          {points.length} Gemeinden · {total.toLocaleString('de-CH')} people
          {source === 'live' && ` · ${year}`} · {SOURCE_LABEL[source]}
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
      {years.length > 1 && (
        <div className="hud hud-year">
          <input
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <span className="year-label">{year}</span>
        </div>
      )}
      {shown && (
        <aside className="hud hud-info">
          <strong>{shown.name}</strong>
          <div>Bezirk {shown.region}</div>
          <div className="pop">{shown.population.toLocaleString('de-CH')} people</div>
        </aside>
      )}
    </div>
  )
}
