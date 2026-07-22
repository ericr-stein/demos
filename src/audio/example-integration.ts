/**
 * ── EXAMPLE: integrating Tone.js with the 3D walk ───────────────────────
 *
 * This file is NOT imported anywhere — it's a copy-paste reference for
 * building a richer sonification. To use it, move the ideas (or the whole
 * body) into `sonifyStep` / `enableAudio` in engine.ts.
 *
 * Design used here:
 *   • a mellow synth carries the population curve: norm → pitch,
 *     bigger cohorts = lower + louder
 *   • a lowpass filter opens with population, so peaks sound "brighter"
 *   • every yearStart fires a soft membrane "tick" and nudges the
 *     pitch scale, so you hear the years pass
 *   • values are smoothed with rampTo to avoid zipper noise at 24 steps/s
 */
import * as Tone from 'tone'
import type { WalkStep } from './walk'

// ── build the instrument graph ONCE (call this from enableAudio) ──
const filter = new Tone.Filter(800, 'lowpass').toDestination()
const voice = new Tone.Synth({
  oscillator: { type: 'amsine' },
  envelope: { attack: 0.01, decay: 0.08, sustain: 0.4, release: 0.15 },
}).connect(filter)
voice.volume.value = -14

const tick = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 4,
}).toDestination()
tick.volume.value = -18

// pentatonic scale keeps arbitrary data from sounding like a tuning error
const SCALE = [0, 3, 5, 7, 10]
function quantize(midi: number): number {
  const base = Math.floor(midi / 12) * 12
  const semis = midi - base
  const nearest = SCALE.reduce((a, b) =>
    Math.abs(b - semis) < Math.abs(a - semis) ? b : a,
  )
  return base + nearest
}

export function exampleSonifyStep(step: WalkStep): void {
  // 1 — the year boundary: percussion accent, one per year
  if (step.yearStart) {
    tick.triggerAttackRelease('C2', '16n')
  }

  // 2 — population → pitch: norm 0..1 mapped onto ~3 octaves, descending
  //     (big cohorts rumble, empty old-age tail whistles)
  const midi = quantize(84 - Math.sqrt(step.norm) * 36)
  voice.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), '32n')

  // 3 — population → brightness: filter opens up to 4kHz on the peaks.
  //     rampTo smooths between steps → no zipper noise
  filter.frequency.rampTo(400 + step.norm * 3600, 0.04)

  // 4 — ideas to try next:
  //     • step.born % 10 === 0 → arpeggio marking decade cohorts
  //     • map step.age to stereo pan (Tone.Panner): young left, old right
  //     • a second voice playing the PREVIOUS year's value at the same
  //       age → you hear cohort survivorship as an interval
}
