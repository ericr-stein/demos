import * as Tone from 'tone'
import type { PopulationPoint } from '../data/types'
import type { WalkStep } from './walk'

/**
 * Sonification engine. Tone.js requires a user gesture before the
 * AudioContext may start, so enableAudio() must be called from a click
 * handler. Instruments are built ONCE here — never inside sonifyStep.
 *
 * Timing model: while the walk plays with audio on, Tone.Transport is the
 * MASTER clock (see player.ts) — sonifyStep receives a sample-accurate
 * `time` and must pass it to every triggerAttackRelease. The visual dot
 * follows the Transport-driven step index, not the other way round.
 */

// pentatonic-ish pool, low → high; norm picks the index (design: E.)
const NOTE_POOL = [
  'C3', 'D3', 'E3', 'G3', 'A3',
  'C4', 'D4', 'E4', 'G4', 'A4',
  'C5', 'D5', 'E5', 'G5', 'A5',
  'C6', 'D6', 'E6', 'G6', 'A6',
]

let polySynth: Tone.PolySynth | null = null
let pingPong: Tone.PingPongDelay | null = null
let kickSynth: Tone.MembraneSynth | null = null
let snareSynth: Tone.MembraneSynth | null = null
let started = false
let lastId: number | null = null

export function audioStarted(): boolean {
  return started
}

export async function enableAudio(): Promise<void> {
  if (started) return
  await Tone.start()

  pingPong = new Tone.PingPongDelay('8n.', 0.2).toDestination()

  polySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.15, sustain: 0.1, release: 0.05 },
  })
  // dry path plus a delayed path in parallel
  polySynth.toDestination()
  polySynth.connect(pingPong)
  polySynth.volume.value = -12

  kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 },
  }).toDestination()

  snareSynth = new Tone.MembraneSynth({
    pitchDecay: 0.012,
    octaves: 2,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.04 },
  }).toDestination()

  started = true
}

/** norm 0..1 → a note from the pool (bigger population = higher index). */
function noteFor(norm: number): string {
  const index = Math.round(
    Math.min(Math.max(norm, 0), 1) * (NOTE_POOL.length - 1),
  )
  return NOTE_POOL[index]
}

/**
 * ── SONIFICATION OF THE 3D WALK ─────────────────────────────────────────
 *
 * Called once per step. While Tone.Transport drives playback, `time` is
 * the sample-accurate moment this step must sound — ALWAYS pass it to
 * triggerAttackRelease. (The rAF fallback calls this without `time`;
 * Tone then plays "now", which is fine for the silent-degraded path.)
 *
 * Musical grid (walk.ts): 100 steps per year, one step per 16th note,
 * so step.age % 4 is the beat-within-bar and yearStart marks each
 * 25-bar phrase.
 */
export function sonifyStep(step: WalkStep, time?: number): void {
  if (!started || !polySynth) return

  // melody: population → pitch
  polySynth.triggerAttackRelease(noteFor(step.norm), '16n', time)

  // backbeat over the 4-step bar: kick on 1, snare on 3
  const stepInBar = step.age % 4
  if (stepInBar === 0) kickSynth?.triggerAttackRelease('C1', '16n', time)
  if (stepInBar === 2) snareSynth?.triggerAttackRelease('G2', '32n', time)
}

// ── hover sonification (map columns / stereogram surface) ──
export function sonifyPoint(point: PopulationPoint | null): void {
  if (!point) {
    lastId = null
    return
  }
  const norm =
    (Math.log10(Math.max(point.population, 1)) - 3) / (Math.log10(400_000) - 3)
  hoverPing(point.id, 1 - Math.min(Math.max(norm, 0), 1))
}

/** Generic hover sonification: any value against its scale maximum. */
export function sonifyValue(id: number, value: number, max: number): void {
  hoverPing(id, Math.sqrt(value / max))
}

function hoverPing(id: number, norm: number): void {
  if (!started || !polySynth || id === lastId) return
  lastId = id
  polySynth.triggerAttackRelease(noteFor(norm), '16n')
}
