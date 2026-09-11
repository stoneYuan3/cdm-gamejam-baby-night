import { config } from '../config.ts'
import type { GameState } from '../state.ts'

/**
 * Feeds presses into the call rhythm and reports whether a full call landed.
 * Shared by the intro rehearsal and the real night call - `annoy` is the only
 * thing separating the two.
 */
export function updateCall(state: GameState, calls: number[], annoy: boolean): boolean {
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

export function resetCall(state: GameState): void {
  state.call.presses = 0
  state.call.lastPressAt = 0
}
