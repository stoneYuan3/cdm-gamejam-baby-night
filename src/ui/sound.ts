import type { GameState } from '../game/state.ts'

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
  const ambience = load(AMBIENCE)
  ambience.loop = true
  const monsterSeq = load(MONSTER_SEQ)
  const footsteps = load(`${BABY_AUDIO}footsteps.mp3`)

  const doorOpen = load(`${BABY_AUDIO}dooropen.mp3`)
  const doorClose = load(`${BABY_AUDIO}doorclose.mp3`)
  // Parents leave shortly after arriving - chain the close off the open clip
  // ending rather than guessing a delay.
  doorOpen.addEventListener('ended', () => doorClose.play().catch(() => {}))

  const cryGood = [1, 2, 3, 4].map((n) => load(`${BABY_AUDIO}babycry${n}.mp3`))
  const cryMessedUp = load(`${BABY_AUDIO}babycry5.mp3`)

  let lastPressAt = 0
  let wasThreatActive = false

  return {
    update(state) {
      setPlaying(ambience, state.phase === 'playing')

      playCryOnNewPress(state)
      syncThreatAudio(state)

      // The threat clears only when the parents actually answer the call
      // (a loss leaves it active), so this edge means help just arrived.
      if (wasThreatActive && !state.threat.active && state.phase === 'playing') {
        doorOpen.currentTime = 0
        doorOpen.play().catch(() => {})
      }
      wasThreatActive = state.threat.active
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

    const messedUp =
      state.call.lastQuality === 'fast' || state.call.lastQuality === 'slow'
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
