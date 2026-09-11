import { config } from './config.ts'

export type Phase = 'title' | 'intro' | 'playing' | 'won' | 'lost'
export type LoseReason = 'monster' | 'abandoned'

/** Steps of the intro: practise the call, watch help arrive, read the setup, fade to black. */
export type IntroStep = 'prompt' | 'animation' | 'description' | 'fadeOut'

export type PressQuality = 'good' | 'fast' | 'slow'

export interface GameState {
  phase: Phase
  phaseTime: number // seconds spent in the current phase
  loseReason?: LoseReason
  timeOfNight: number
  intro: {
    step: IntroStep
    stepTime: number
  }
  threat: {
    active: boolean
    proximity: number // 0 = far away, 1 = reaches the baby
    approachTime: number // this monster's seconds to reach the baby, rolled on arrival
    nextThreatIn: number
  }
  call: {
    presses: number
    lastPressAt: number // loop-clock seconds; 0 = no press yet this call
    lastQuality: PressQuality | null
  }
  parents: {
    annoyance: number // 0..1
    available: boolean
  }
}

function freshState(phase: Phase): GameState {
  return {
    phase,
    phaseTime: 0,
    timeOfNight: 0,
    intro: {
      step: 'prompt',
      stepTime: 0,
    },
    threat: {
      active: false,
      proximity: 0,
      approachTime: randomIn(config.monsterApproachTime),
      nextThreatIn: randomIn(config.firstThreatDelay),
    },
    call: {
      presses: 0,
      lastPressAt: 0,
      lastQuality: null,
    },
    parents: {
      annoyance: 0,
      available: true,
    },
  }
}

/** A uniformly random number within a config range, e.g. `{ min: 4, max: 8 }`. */
export function randomIn(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min)
}

/** The title screen the game boots into and returns to after a result. */
export function createState(): GameState {
  return freshState('title')
}

/** The intro that runs before the night proper. */
export function startIntro(): GameState {
  return freshState('intro')
}
