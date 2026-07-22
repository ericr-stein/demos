/**
 * Transport-driven playback of the 3D walk.
 *
 * When audio is enabled, Tone.Transport is the MASTER clock: it fires one
 * step per 16th note with a sample-accurate `time`, sonifyStep() sounds it,
 * and the store's stepIndex is advanced so the glowing dot follows the
 * music. (Without audio, WalkDot.tsx falls back to its frame-based clock.)
 *
 * Tempo: 1 step = 16th note → steps/second = BPM / 15.
 * The UI speed values (4/8/16/32 sps) therefore map to 60/120/240/480 BPM.
 */
import * as Tone from 'tone'
import { audioStarted, sonifyStep } from './engine'
import { useVizStore } from '../store'

let repeatId: number | null = null

export function transportActive(): boolean {
  return repeatId !== null
}

export function applyTempo(stepsPerSecond: number): void {
  Tone.getTransport().bpm.value = stepsPerSecond * 15
}

/** Start (or resume) the walk on the Transport. Returns false if audio is
 *  not enabled yet — caller then relies on the visual fallback clock. */
export function startTransportWalk(): boolean {
  if (!audioStarted()) return false
  if (repeatId !== null) return true // already scheduled

  applyTempo(useVizStore.getState().stepsPerSecond)
  const transport = Tone.getTransport()

  repeatId = transport.scheduleRepeat((time) => {
    const { walk, stepIndex, setStepIndex, setPlaying } =
      useVizStore.getState()
    const next = stepIndex + 1
    if (next >= walk.length) {
      stopTransportWalk()
      setPlaying(false)
      return
    }
    sonifyStep(walk[next], time) // audio: sample-accurate
    setStepIndex(next) // visual: dot lerps toward the new step
  }, '16n')

  transport.start()
  return true
}

export function stopTransportWalk(): void {
  if (repeatId === null) return
  const transport = Tone.getTransport()
  transport.clear(repeatId)
  repeatId = null
  transport.pause()
}
