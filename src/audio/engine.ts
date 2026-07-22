import * as Tone from 'tone'
import type { PopulationPoint } from '../data/types'

/**
 * Minimal sonification engine. Tone.js requires a user gesture before the
 * AudioContext may start, so enable() must be called from a click handler.
 *
 * Current mapping (stub, to be refined once real data lands):
 *   population → pitch (larger population = lower note, log-scaled)
 */
let synth: Tone.Synth | null = null
let started = false
let lastId: number | null = null

export async function enableAudio(): Promise<void> {
  if (started) return
  await Tone.start()
  synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.2 },
  }).toDestination()
  synth.volume.value = -12
  started = true
}

export function sonifyPoint(point: PopulationPoint | null): void {
  if (!started || !synth || !point || point.id === lastId) {
    if (!point) lastId = null
    return
  }
  lastId = point.id
  // log-scale population (~1k..400k) onto MIDI 84 (small) .. 48 (large)
  const norm =
    (Math.log10(point.population) - 3) / (Math.log10(400_000) - 3)
  const midi = 84 - Math.min(Math.max(norm, 0), 1) * 36
  synth.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), '16n')
}
