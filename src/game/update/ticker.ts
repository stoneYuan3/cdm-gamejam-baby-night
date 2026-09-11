import { config } from '../config.ts'
import { createState, startIntro, type GameState } from '../state.ts'
import { updateIntro } from './intro.ts'
import { updatePlaying } from './play.ts'

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

/** Moves to a new phase and resets its clock. Shared by every phase's update. */
export function setPhase(state: GameState, phase: GameState['phase']): void {
  state.phase = phase
  state.phaseTime = 0
}
