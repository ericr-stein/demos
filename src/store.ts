import { create } from 'zustand'
import type { PopulationPoint } from './data/types'
import type { PopulationData } from './data/load'
import type { PopulationGrid } from './data/grid'

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
  setGrid: (grid) => set({ grid }),
  setStereoHover: (stereoHover) => set({ stereoHover }),
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
