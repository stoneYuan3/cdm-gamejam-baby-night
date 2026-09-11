import { config } from '../game/config.ts'
import type { AftermathStep, GameState } from '../game/state.ts'

// Seconds the monster sequence may wander from the monster's actual progress
// before it is snapped back into place.
const MAX_DRIFT = 0.1

const AMBIENCE = `${import.meta.env.BASE_URL}audio/ambienceSCARY.ogg`
const MONSTER_SEQ = `${import.meta.env.BASE_URL}audio/animationseq.ogg`
const BABY_AUDIO = `${import.meta.env.BASE_URL}audio/baby/`

export interface Sound {
  update(state: GameState): void
}

/**
 * Plays audio as a function of game state, the same way the scene draws it -
 * game logic never touches audio.
 */
export function createSound(): Sound {
  const ambience = load(AMBIENCE, config.volume.ambience)
  ambience.loop = true
  const monsterSeq = load(MONSTER_SEQ, config.volume.monsterSeq)
  const footsteps = load(`${BABY_AUDIO}footsteps.mp3`, config.volume.footsteps)

  const doorClose = load(`${BABY_AUDIO}doorclose.mp3`, config.volume.doorClose)

  const cryGood = [1, 2, 3, 4].map((n) =>
    load(`${BABY_AUDIO}babycry${n}.mp3`, config.volume.cryGood),
  )
  const cryMessedUp = load(`${BABY_AUDIO}babycry5.mp3`, config.volume.cryMessedUp)

  let lastPressAt = 0
  let wasAftermathStep: AftermathStep = 'none'

  return {
    update(state) {
      setPlaying(ambience, state.phase === 'playing')

      playCryOnNewPress(state)
      syncThreatAudio(state)

      // The parent-check animation ends with the door swinging shut - fires
      // exactly on that last frame, as the step hands back to 'none'.
      if (wasAftermathStep === 'parentIn' && state.aftermath.step === 'none') {
        doorClose.currentTime = 0
        doorClose.play().catch(() => {})
      }
      wasAftermathStep = state.aftermath.step
    },
  }

  function playCryOnNewPress(state: GameState): void {
    if (state.call.lastPressAt === lastPressAt) return
    const isNewPress = state.call.lastPressAt !== 0
    lastPressAt = state.call.lastPressAt
    if (!isNewPress) return

    // Only cry for presses that actually feed the call: the intro rehearsal,
    // or a real call while a monster is listening.
    const callMatters =
      (state.phase === 'intro' && state.intro.step === 'prompt') ||
      (state.phase === 'playing' && state.threat.active)
    if (!callMatters) return

    const messedUp = state.call.lastQuality === 'fast'
    const clip = messedUp
      ? cryMessedUp
      : cryGood[Math.floor(Math.random() * cryGood.length)]
    clip.currentTime = 0
    clip.play().catch(() => {})
  }

  function syncThreatAudio(state: GameState): void {
    const { active, proximity, approachTime } = state.threat

    // On a loss the monster has arrived and the sequence is already at its
    // end - let it ring out rather than cutting the last few milliseconds.
    if (state.phase === 'lost' && active) return

    if (state.phase !== 'playing' || !active) {
      stop(monsterSeq)
      stop(footsteps)
      return
    }

    // The approach time is rolled per monster, so both clips are stretched to
    // fit it: they start as the monster appears and end as it reaches the baby.
    for (const clip of [monsterSeq, footsteps]) {
      const duration = clip.duration
      if (!Number.isFinite(duration)) continue // metadata not loaded yet

      clip.playbackRate = duration / approachTime
      const expected = proximity * duration
      if (Math.abs(clip.currentTime - expected) > MAX_DRIFT) {
        // Catches up after a frame hitch (the loop clamps dt, the audio clock doesn't).
        clip.currentTime = expected
      }
      // If the clip beats the monster by a hair, don't let play() rewind it to the start.
      if (!clip.ended) setPlaying(clip, true)
    }
  }
}

function load(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  // Keeps the stretched monster sequence at its authored pitch.
  audio.preservesPitch = true
  audio.volume = volume
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
