import type { GameState } from '../game/state.ts'

// Seconds the monster sequence may wander from the monster's actual progress
// before it is snapped back into place.
const MAX_DRIFT = 0.1

const AMBIENCE = `${import.meta.env.BASE_URL}audio/ambienceSCARY.ogg`
const MONSTER_SEQ = `${import.meta.env.BASE_URL}audio/animationseq.ogg`

export interface Sound {
  update(state: GameState): void
}

/**
 * Plays audio as a function of game state, the same way the scene draws it -
 * game logic never touches audio.
 */
export function createSound(): Sound {
  const ambience = load(AMBIENCE)
  ambience.loop = true
  const monsterSeq = load(MONSTER_SEQ)

  return {
    update(state) {
      setPlaying(ambience, state.phase === 'playing')

      const { active, proximity, approachTime } = state.threat

      // On a loss the monster has arrived and the sequence is already at its
      // end - let it ring out rather than cutting the last few milliseconds.
      if (state.phase === 'lost' && active) return

      if (state.phase !== 'playing' || !active) {
        stop(monsterSeq)
        return
      }

      // The approach time is rolled per monster, so the clip is stretched to
      // fit it: it starts as the monster appears and ends as it reaches the baby.
      const duration = monsterSeq.duration
      if (!Number.isFinite(duration)) return // metadata not loaded yet

      monsterSeq.playbackRate = duration / approachTime
      const expected = proximity * duration
      if (Math.abs(monsterSeq.currentTime - expected) > MAX_DRIFT) {
        // Catches up after a frame hitch (the loop clamps dt, the audio clock doesn't).
        monsterSeq.currentTime = expected
      }
      // If the clip beats the monster by a hair, don't let play() rewind it to the start.
      if (!monsterSeq.ended) setPlaying(monsterSeq, true)
    },
  }
}

function load(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  // Keeps the stretched monster sequence at its authored pitch.
  audio.preservesPitch = true
  return audio
}

function setPlaying(audio: HTMLAudioElement, playing: boolean): void {
  if (playing && audio.paused) {
    // Rejects only if the browser blocks autoplay; the title screen's space
    // press counts as the gesture that unlocks it, so this is just a safeguard.
    audio.play().catch(() => {})
  } else if (!playing && !audio.paused) {
    audio.pause()
  }
}

function stop(audio: HTMLAudioElement): void {
  setPlaying(audio, false)
  audio.currentTime = 0
}
