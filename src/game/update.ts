import { config } from './config.ts'
import {
  createState,
  randomIn,
  startIntro,
  type GameState,
  type IntroStep,
} from './state.ts'

/**
 * Advances the game one frame and returns the state to render - screen
 * transitions replace the state object. Never touches the DOM.
 */
export function tick(
  state: GameState,
  calls: number[],
  restart: boolean,
  dt: number,
): GameState {
  state.phaseTime += dt
  const advance = calls.length > 0 || restart

  switch (state.phase) {
    case 'title':
      return advance ? startIntro() : state

    case 'won':
    case 'lost':
      return advance && state.phaseTime >= config.resultLockout
        ? createState()
        : state

    case 'intro':
      updateIntro(state, calls, dt)
      return state

    case 'playing':
      updatePlaying(state, calls, dt)
      return state
  }
}

/**
 * A safe rehearsal of the call: presses are judged exactly as they are during
 * the night, but a shrieky one costs nothing.
 */
function updateIntro(state: GameState, calls: number[], dt: number): void {
  state.intro.stepTime += dt

  switch (state.intro.step) {
    case 'prompt':
      if (updateCall(state, calls, false)) {
        setIntroStep(state, 'animation')
      }
      return

    case 'animation':
      if (state.intro.stepTime >= config.introAnimationTime) {
        setIntroStep(state, 'description')
      }
      return

    case 'description':
      if (state.intro.stepTime >= introDescriptionTime()) {
        resetCall(state)
        setPhase(state, 'playing')
      }
      return
  }
}

/** Total on-screen life of the intro description, fades included. */
export function introDescriptionTime(): number {
  return config.introTextFadeIn + config.introTextHold + config.introTextFadeOut
}

function updatePlaying(state: GameState, calls: number[], dt: number): void {
  state.timeOfNight += dt
  if (state.timeOfNight >= config.nightDuration) {
    setPhase(state, 'won')
    return
  }

  updateParents(state, dt)

  // Crying only means anything while something is actually threatening the baby.
  if (state.threat.active && updateCall(state, calls, true)) {
    answerCall(state)
  }

  updateThreat(state, dt)
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

/**
 * Feeds presses into the call rhythm and reports whether a full call landed.
 * `annoy` is the only thing separating the night from the intro rehearsal.
 */
function updateCall(state: GameState, calls: number[], annoy: boolean): boolean {
  let completed = false

  for (const at of calls) {
    const last = state.call.lastPressAt
    const interval = at - last
    state.call.lastPressAt = at

    if (last === 0) {
      // First press of this call.
      state.call.presses = 1
      state.call.lastQuality = 'good'
    } else if (interval > config.maxInterval) {
      // The rhythm lapsed - this press starts a fresh call instead.
      state.call.presses = 1
      state.call.lastQuality = 'slow'
    } else {
      if (interval < config.minInterval) {
        // Still counts, but the baby is shrieking and the parents notice.
        state.call.lastQuality = 'fast'

        if (annoy) {
          state.parents.annoyance = Math.min(
            1,
            state.parents.annoyance + config.fastPressAnnoyance,
          )
        }
      } else {
        state.call.lastQuality = 'good'
      }

      state.call.presses += 1
    }

    if (state.call.presses >= config.callPresses) {
      completed = true
      resetCall(state)
    }
  }

  return completed
}

function answerCall(state: GameState): void {
  // If the parents have given up, the call goes unanswered and the monster keeps coming.
  if (!state.parents.available) return

  state.threat.active = false
  state.threat.proximity = 0
  state.threat.nextThreatIn = randomIn(config.threatInterval)
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

function resetCall(state: GameState): void {
  state.call.presses = 0
  state.call.lastPressAt = 0
}

function setIntroStep(state: GameState, step: IntroStep): void {
  state.intro.step = step
  state.intro.stepTime = 0
}

function setPhase(state: GameState, phase: GameState['phase']): void {
  state.phase = phase
  state.phaseTime = 0
}
