import { config } from '../config.ts'
import type { GameState, IntroStep } from '../state.ts'
import { resetCall, updateCall } from './call.ts'
import { setPhase } from './ticker.ts'

/**
 * A safe rehearsal of the call: presses are judged exactly as they are during
 * the night, but a shrieky one costs nothing.
 */
export function updateIntro(state: GameState, calls: number[], dt: number): void {
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
        setIntroStep(state, 'fadeOut')
      }
      return

    case 'fadeOut':
      // Presses aren't read here, so a mash during the fade is simply dropped.
      if (state.intro.stepTime >= config.stageFadeTime) {
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

function setIntroStep(state: GameState, step: IntroStep): void {
  state.intro.step = step
  state.intro.stepTime = 0
}
