import { useEffect, useMemo } from 'react'
import { Scene } from './scene/Scene'
import { usePoints, useVizStore } from './store'
import { loadPopulationData } from './data/load'
import { loadPopulationGrid } from './data/grid'
import { enableAudio } from './audio/engine'
import {
  applyTempo,
  startTransportWalk,
  stopTransportWalk,
  transportActive,
} from './audio/player'
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
  const view = useVizStore((s) => s.view)
  const grid = useVizStore((s) => s.grid)
  const stereoHover = useVizStore((s) => s.stereoHover)
  const hoveredId = useVizStore((s) => s.hoveredId)
  const selectedId = useVizStore((s) => s.selectedId)
  const audioEnabled = useVizStore((s) => s.audioEnabled)
  const setData = useVizStore((s) => s.setData)
  const setYear = useVizStore((s) => s.setYear)
  const setView = useVizStore((s) => s.setView)
  const setGrid = useVizStore((s) => s.setGrid)
  const setAudioEnabled = useVizStore((s) => s.setAudioEnabled)
  const walk = useVizStore((s) => s.walk)
  const playing = useVizStore((s) => s.playing)
  const stepIndex = useVizStore((s) => s.stepIndex)
  const stepsPerSecond = useVizStore((s) => s.stepsPerSecond)
  const setPlaying = useVizStore((s) => s.setPlaying)
  const setStepIndex = useVizStore((s) => s.setStepIndex)
  const setSpeed = useVizStore((s) => s.setSpeed)
  const selectedCohort = useVizStore((s) => s.selectedCohort)
  const selectCohort = useVizStore((s) => s.selectCohort)

  useEffect(() => {
    loadPopulationData().then(setData)
    loadPopulationGrid().then(setGrid)
  }, [setData, setGrid])

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
          {view === 'map'
            ? `${points.length} Gemeinden · ${total.toLocaleString('de-CH')} people${
                source === 'live' ? ` · ${year}` : ''
              }`
            : `population by year × age · ${
                grid
                  ? `${grid.years[0]}–${grid.years[grid.years.length - 1]}`
                  : '…'
              }`}
          {' · '}
          {SOURCE_LABEL[source]}
        </span>
        {grid && (
          <button
            className="view-toggle"
            onClick={() => setView(view === 'map' ? 'stereogram' : 'map')}
          >
            {view === 'map' ? '▲ stereogram' : '● map'}
          </button>
        )}
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

      {view === 'stereogram' && walk.length > 0 && (
        <div className="hud hud-year">
          <button
            className="transport"
            onClick={() => {
              if (playing) {
                stopTransportWalk()
                setPlaying(false)
              } else {
                if (stepIndex >= walk.length - 1) setStepIndex(0)
                startTransportWalk() // no-op false if audio off → rAF fallback
                setPlaying(true)
              }
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            className="transport"
            onClick={() => {
              stopTransportWalk()
              setStepIndex(0)
              startTransportWalk()
              setPlaying(true)
            }}
          >
            ↺
          </button>
          <input
            type="range"
            className="bpm"
            min={40}
            max={100}
            step={1}
            value={Math.round(stepsPerSecond * 15)}
            onChange={(e) => {
              const sps = Number(e.target.value) / 15 // BPM → steps/second
              setSpeed(sps)
              if (transportActive()) applyTempo(sps)
            }}
          />
          <span className="year-label bpm-label">
            {Math.round(stepsPerSecond * 15)} bpm
          </span>
          {selectedCohort !== null && (
            <button
              className="transport cohort-chip"
              title="back to walking the years"
              onClick={() => {
                stopTransportWalk()
                selectCohort(null)
              }}
            >
              cohort {selectedCohort} ✕
            </button>
          )}
          <span className="year-label">
            {walk[stepIndex].year} · age {walk[stepIndex].age} ·{' '}
            {walk[stepIndex].count.toLocaleString('de-CH')}
          </span>
        </div>
      )}

      {view === 'map' && years.length > 1 && (
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

      {view === 'map' && shown && (
        <aside className="hud hud-info">
          <strong>{shown.name}</strong>
          <div>Bezirk {shown.region}</div>
          <div className="pop">{shown.population.toLocaleString('de-CH')} people</div>
        </aside>
      )}

      {view === 'stereogram' && (
        <aside className="hud hud-info">
          {stereoHover ? (
            <>
              <strong>
                {stereoHover.age === 100 ? '100+' : stereoHover.age} year olds
                in {stereoHover.year}
              </strong>
              <div>born ~{stereoHover.year - stereoHover.age}</div>
              <div className="pop">
                {stereoHover.count.toLocaleString('de-CH')} people
              </div>
            </>
          ) : (
            <>
              <strong>Perozzo stereogram</strong>
              <div><span className="k red">red</span> year profiles (pyramids)</div>
              <div><span className="k blue">blue</span> cohorts — born same year</div>
              <div><span className="k green">green</span> isolines — equal count</div>
            </>
          )}
        </aside>
      )}
    </div>
  )
}
