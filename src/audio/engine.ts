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
  if (!point) {
    lastId = null
    return
  }
  // log-scale population (~1k..400k) onto a normalized 0..1
  const norm =
    (Math.log10(Math.max(point.population, 1)) - 3) / (Math.log10(400_000) - 3)
  play(point.id, norm)
}

/** Generic sonification: any value against its scale maximum. */
export function sonifyValue(id: number, value: number, max: number): void {
  play(id, Math.sqrt(value / max))
}

function play(id: number, norm: number): void {
  if (!started || !synth || id === lastId) return
  lastId = id
  // 0..1 → MIDI 84 (small) .. 48 (large): bigger numbers sound lower
  const midi = 84 - Math.min(Math.max(norm, 0), 1) * 36
  synth.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), '16n')
}
