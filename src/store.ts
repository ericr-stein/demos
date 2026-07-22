import { create } from 'zustand'
import type { PopulationPoint } from './data/types'
import type { PopulationData } from './data/load'
import type { PopulationGrid } from './data/grid'
import { buildWalk, type WalkStep } from './audio/walk'

export interface StereoHover {
  year: number
  age: number
  count: number
}

interface VizState {
  view: 'map' | 'stereogram'
  grid: PopulationGrid | null
  stereoHover: StereoHover | null
  setView: (view: 'map' | 'stereogram') => void
  setGrid: (grid: PopulationGrid | null) => void
  setStereoHover: (h: StereoHover | null) => void
  // ── 3D walk playback ──
  walk: WalkStep[]
  playing: boolean
  stepIndex: number
  stepsPerSecond: number
  setPlaying: (on: boolean) => void
  setStepIndex: (i: number) => void
  setSpeed: (sps: number) => void
  byYear: Record<number, PopulationPoint[]>
  years: number[]
  year: number
  source: PopulationData['source'] | 'loading'
  hoveredId: number | null
  selectedId: number | null
  audioEnabled: boolean
  setData: (data: PopulationData) => void
  setYear: (year: number) => void
  setHovered: (id: number | null) => void
  setSelected: (id: number | null) => void
  setAudioEnabled: (on: boolean) => void
}

export const useVizStore = create<VizState>((set) => ({
  view: 'map',
  grid: null,
  stereoHover: null,
  setView: (view) => set({ view }),
  // building the walk here keeps timeline + grid in perfect sync
  setGrid: (grid) => set({ grid, walk: grid ? buildWalk(grid) : [] }),
  setStereoHover: (stereoHover) => set({ stereoHover }),
  walk: [],
  playing: false,
  stepIndex: 0,
  stepsPerSecond: 4, // 1 step = 16th note → BPM = sps × 15, so 4 = 60 BPM
  setPlaying: (playing) => set({ playing }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
  setSpeed: (stepsPerSecond) => set({ stepsPerSecond }),
  byYear: {},
  years: [],
  year: 0,
  source: 'loading',
  hoveredId: null,
  selectedId: null,
  audioEnabled: false,
  setData: ({ byYear, years, source }) =>
    set({ byYear, years, source, year: years[years.length - 1] }),
  setYear: (year) => set({ year }),
  setHovered: (id) => set({ hoveredId: id }),
  setSelected: (id) => set({ selectedId: id }),
  setAudioEnabled: (on) => set({ audioEnabled: on }),
}))

export const usePoints = () =>
  useVizStore((s) => s.byYear[s.year] ?? EMPTY_POINTS)
const EMPTY_POINTS: PopulationPoint[] = []
