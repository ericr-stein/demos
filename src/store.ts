import { create } from 'zustand'
import type { PopulationPoint } from './data/types'

interface VizState {
  points: PopulationPoint[]
  source: 'live' | 'sample' | 'loading'
  hoveredId: number | null
  selectedId: number | null
  audioEnabled: boolean
  setData: (points: PopulationPoint[], source: 'live' | 'sample') => void
  setHovered: (id: number | null) => void
  setSelected: (id: number | null) => void
  setAudioEnabled: (on: boolean) => void
}

export const useVizStore = create<VizState>((set) => ({
  points: [],
  source: 'loading',
  hoveredId: null,
  selectedId: null,
  audioEnabled: false,
  setData: (points, source) => set({ points, source }),
  setHovered: (id) => set({ hoveredId: id }),
  setSelected: (id) => set({ selectedId: id }),
  setAudioEnabled: (on) => set({ audioEnabled: on }),
}))
