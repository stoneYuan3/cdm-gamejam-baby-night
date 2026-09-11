import { config } from '../config.ts'
import { randomIn, type AftermathStep, type GameState } from '../state.ts'
import { resetCall, updateCall } from './call.ts'
import { setPhase } from './ticker.ts'

export function updatePlaying(state: GameState, calls: number[], dt: number): void {
  // The night fades in from black first; none of that counts as night, and
  // presses during it are dropped. Only the post-fade slice of the crossing
  // frame is handed on, so no fade time leaks into the clock.
  const live = Math.min(dt, state.phaseTime - config.stageFadeTime)
  if (live <= 0) return

  state.timeOfNight += live
  if (state.timeOfNight >= config.nightDuration) {
    setPhase(state, 'won')
    return
  }

  updateParents(state, live)

  // Crying only means anything while something is actually threatening the baby.
  if (state.threat.active && updateCall(state, calls, true)) {
    answerCall(state)
  }

  if (state.aftermath.step !== 'none') {
    updateAftermath(state, live)
  } else {
    updateThreat(state, live)
  }
}

function updateParents(state: GameState, dt: number): void {
  if (!state.parents.available) return

  if (!state.threat.active) {
    state.parents.annoyance = Math.max(
      0,
      state.parents.annoyance - config.annoyanceDecay * dt,
    )
  }

  if (state.parents.annoyance >= 1) {
    state.parents.annoyance = 1
    state.parents.available = false
  }
}

function answerCall(state: GameState): void {
  // If the parents have given up, the call goes unanswered and the monster keeps coming.
  if (!state.parents.available) return

  state.threat.active = false
  state.threat.proximity = 0
  setAftermathStep(state, 'monsterGone')
}

function updateThreat(state: GameState, dt: number): void {
  if (state.threat.active) {
    state.threat.proximity += dt / state.threat.approachTime

    if (state.threat.proximity >= 1) {
      state.threat.proximity = 1
      state.loseReason = state.parents.available ? 'monster' : 'abandoned'
      setPhase(state, 'lost')
    }
    return
  }

  state.threat.nextThreatIn -= dt
  if (state.threat.nextThreatIn <= 0) {
    state.threat.active = true
    state.threat.proximity = 0
    state.threat.approachTime = randomIn(config.monsterApproachTime)
    resetCall(state)
  }
}

/**
 * The monster vanishes in smoke, then a parent checks on the baby, before the
 * calm countdown to the next monster starts. While either step is running,
 * updatePlaying skips updateThreat entirely, which is what keeps that
 * countdown frozen.
 */
function updateAftermath(state: GameState, dt: number): void {
  state.aftermath.stepTime += dt

  switch (state.aftermath.step) {
    case 'monsterGone':
      if (state.aftermath.stepTime >= config.monsterGoneTime) {
        setAftermathStep(state, 'parentIn')
      }
      return

    case 'parentIn':
      if (state.aftermath.stepTime >= config.parentInTime) {
        // Only now does the calm countdown to the next monster begin.
        state.threat.nextThreatIn = randomIn(config.threatInterval)
        setAftermathStep(state, 'none')
      }
      return

    case 'none':
      return
  }
}

function setAftermathStep(state: GameState, step: AftermathStep): void {
  state.aftermath.step = step
  state.aftermath.stepTime = 0
}
