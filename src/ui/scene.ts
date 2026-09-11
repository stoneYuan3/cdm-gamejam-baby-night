import { config } from '../game/config.ts'
import type { GameState } from '../game/state.ts'

const PRESS_FLASH = 0.15 // seconds the baby reacts to a press
const SHAKE_MAX = 24 // px of room shake as the monster reaches the baby (see .room inset)
const CLAP_DURATION = 1.2 // seconds the parents-answered clap plays before returning to idle
const CLAP_FRAME_TIME = 0.18 // seconds per clap frame (Clap1/Clap2 alternate)

// BASE_URL keeps these public/ paths valid if the build is served from a subfolder.
const ROOM_CLOSED = `${import.meta.env.BASE_URL}art/room/room-closed.png`
const ROOM_OPEN = `${import.meta.env.BASE_URL}art/room/room-open.png`
const TITLE_ART = `${import.meta.env.BASE_URL}art/main.png`
// Intro: the door opening as the parents arrive. The filenames contain spaces.
const DOOR_FRAMES = [1, 2, 3].map(
  (n) => `${import.meta.env.BASE_URL}art/room/tutorial/door%20open%20frame${n}.png`,
)
const FENCE = `${import.meta.env.BASE_URL}art/room/tutorial/fence.png`

const BABY_ART = `${import.meta.env.BASE_URL}art/baby/`

// P1/P2/P3 are the game's escalating annoyance stages - the background art
// (loaded separately) gets more messed up alongside them.
type BabyStage = 'P1' | 'P2' | 'P3'
const BABY_STAGES: BabyStage[] = ['P1', 'P2', 'P3']

function babyStage(annoyance: number): BabyStage {
  if (annoyance < 1 / 3) return 'P1'
  if (annoyance < 2 / 3) return 'P2'
  return 'P3'
}

export interface Scene {
  render(state: GameState, now: number): void
}

/**
 * Owns every DOM node inside the frame. Elements are created once here and only
 * their styles/classes change per frame - game logic never touches the DOM.
 *
 * Everything below is placeholder geometry in the 1920x1080 design space,
 * waiting to be swapped for serial-PNG sprites.
 */
export function createScene(frame: HTMLElement): Scene {
  frame.innerHTML = `
    <div class="room"></div>
    <img class="intro-fence" src="${FENCE}" alt="">
    <div class="monster"></div>
    <div class="baby"></div>
    <div class="intro-prompt">
      <p class="intro-line">press space 5 times to call for help</p>
      <div class="pips"></div>
    </div>
    <p class="intro-desc"></p>
    <div class="overlay-bg bg"></div>
    <div class="overlay"><p class="overlay-title"></p><p class="overlay-hint"></p></div>
    <div class="fade"></div>
    <div class="debug"></div>
  `

  const overlayBg = frame.querySelector<HTMLElement>('.overlay-bg')!
  const room = frame.querySelector<HTMLElement>('.room')!
  const monster = frame.querySelector<HTMLElement>('.monster')!
  const baby = frame.querySelector<HTMLElement>('.baby')!
  const fence = frame.querySelector<HTMLElement>('.intro-fence')!
  const introPrompt = frame.querySelector<HTMLElement>('.intro-prompt')!
  const introDesc = frame.querySelector<HTMLElement>('.intro-desc')!
  const pips = frame.querySelector<HTMLElement>('.pips')!
  const overlay = frame.querySelector<HTMLElement>('.overlay')!
  const overlayTitle = frame.querySelector<HTMLElement>('.overlay-title')!
  const overlayHint = frame.querySelector<HTMLElement>('.overlay-hint')!
  const fade = frame.querySelector<HTMLElement>('.fade')!
  const debug = frame.querySelector<HTMLElement>('.debug')!

  // PLACEHOLDER COPY - rewrite once the story beat is settled.
  introDesc.textContent = 'the night is long. keep calm, and they will come.'

  // config stays the single source of truth for the fade timings.
  frame.style.setProperty('--intro-fade-in', `${config.introTextFadeIn}s`)
  frame.style.setProperty('--intro-fade-out', `${config.introTextFadeOut}s`)

  const pipEls = Array.from({ length: config.callPresses }, () => {
    const pip = document.createElement('span')
    pip.className = 'pip'
    pips.append(pip)
    return pip
  })

  debug.hidden = !config.debugOverlay

  overlayBg.style.backgroundImage = `url("${TITLE_ART}")`

  // Every room image is its own layer and only its opacity changes. Swapping a
  // CSS background-image instead paints nothing until the new PNG is decoded,
  // flashing the frame's background colour through for a frame or two.
  const roomImgs = new Map(
    [ROOM_CLOSED, ROOM_OPEN, ...DOOR_FRAMES].map((src) => {
      const img = document.createElement('img')
      img.className = 'room-img'
      img.src = src
      img.alt = ''
      room.append(img)
      return [src, img] as const
    }),
  )

  // Baby poses stay CSS background-image swaps rather than layers - warm the
  // cache instead so the first swap to each one doesn't flash empty.
  for (const stage of BABY_STAGES) {
    new Image().src = `${BABY_ART}Baby_OnFloor_${stage}_Idle.png`
    new Image().src = `${BABY_ART}Baby_OnFloor_${stage}_Up.png`
    new Image().src = `${BABY_ART}Baby_OnFloor_${stage}_Down.png`
    new Image().src = `${BABY_ART}Baby_OnFloor_${stage}_Clap1.png`
    new Image().src = `${BABY_ART}Baby_OnFloor_${stage}_Clap2.png`
  }
  new Image().src = `${BABY_ART}Baby_InBed_Cry_Up.png`
  new Image().src = `${BABY_ART}Baby_InBed_Cry_Down.png`

  let wasThreatActive = false
  let answeredAt = -Infinity

  return {
    render(state, now) {
      renderRoom(room, roomImgs, state, now)
      renderMonster(monster, state)

      if (wasThreatActive && !state.threat.active && state.phase === 'playing') {
        answeredAt = now
      }
      wasThreatActive = state.threat.active

      renderBaby(baby, state, now, answeredAt)
      renderIntro(
        { fence, prompt: introPrompt, desc: introDesc, pipEls },
        state,
      )
      renderOverlay(overlay, overlayBg, overlayTitle, overlayHint, state)
      renderFade(fade, state)

      if (config.debugOverlay) {
        debug.textContent = debugText(state)
      }
    },
  }
}

function renderRoom(
  el: HTMLElement,
  imgs: ReadonlyMap<string, HTMLElement>,
  state: GameState,
  now: number,
): void {
  const { active, proximity } = state.threat
  const danger = active && state.phase === 'playing' ? proximity : 0

  const shown = roomImage(state)
  for (const [src, img] of imgs) img.classList.toggle('shown', src === shown)

  // Squared: a faint tremor early in the approach, violent right at the end.
  const amp = SHAKE_MAX * danger * danger
  // Layered sines instead of Math.random() - the same rumble at any frame rate.
  const x = amp * (0.6 * Math.sin(now * 61) + 0.4 * Math.sin(now * 83))
  const y = amp * (0.6 * Math.sin(now * 71) + 0.4 * Math.sin(now * 47))

  el.style.transform = `translate(${x}px, ${y}px)`
  el.style.setProperty('--danger', String(danger))
}

function roomImage(state: GameState): string {
  if (state.phase === 'intro') {
    switch (state.intro.step) {
      case 'prompt':
        return DOOR_FRAMES[0]
      case 'animation': {
        // Plays through once and stops on the last frame - no loop.
        const i = Math.floor(state.intro.stepTime / config.introDoorFrameTime)
        return DOOR_FRAMES[Math.min(i, DOOR_FRAMES.length - 1)]
      }
      case 'description':
      case 'fadeOut':
        return DOOR_FRAMES[DOOR_FRAMES.length - 1]
    }
  }

  // The door stands open while a monster approaches.
  return state.phase === 'playing' && state.threat.active ? ROOM_OPEN : ROOM_CLOSED
}

function renderMonster(el: HTMLElement, state: GameState): void {
  const { active, proximity } = state.threat
  const visible = active && state.phase === 'playing'

  el.style.opacity = visible ? String(lerp(0.45, 1, proximity)) : '0'
  el.style.transform = `translate(-50%, -50%) translateY(${lerp(
    -180,
    260,
    proximity,
  )}px) scale(${lerp(0.35, 1.7, proximity)})`
}

function renderBaby(
  el: HTMLElement,
  state: GameState,
  now: number,
  answeredAt: number,
): void {
  el.classList.toggle('intro', state.phase === 'intro')

  if (state.phase === 'intro') {
    // The tutorial rests on Cry_Down and flashes up to Cry_Up on each press,
    // rather than alternating - Down reads as the idle state.
    const pressed =
      state.call.lastPressAt > 0 && now - state.call.lastPressAt < PRESS_FLASH
    el.style.backgroundImage = `url("${BABY_ART}Baby_InBed_Cry_${pressed ? 'Up' : 'Down'}.png")`
    el.classList.remove('shrieking')
    return
  }

  const crying =
    state.call.lastPressAt > 0 && now - state.call.lastPressAt < PRESS_FLASH
  const clapping = now - answeredAt < CLAP_DURATION

  const stage = babyStage(state.parents.annoyance)
  let file: string
  if (clapping) {
    // Alternates Clap1/Clap2 for the celebration once the parents answer.
    const frame = Math.floor((now - answeredAt) / CLAP_FRAME_TIME) % 2
    file = `Baby_OnFloor_${stage}_Clap${frame + 1}.png`
  } else if (crying) {
    // Up for the first half of the press flash, Down for the second - the
    // arms always raise before lowering, rather than alternating by press.
    const raised = now - state.call.lastPressAt < PRESS_FLASH / 2
    file = `Baby_OnFloor_${stage}_${raised ? 'Up' : 'Down'}.png`
  } else {
    file = `Baby_OnFloor_${stage}_Idle.png`
  }
  el.style.backgroundImage = `url("${BABY_ART}${file}")`

  // A shriek reads differently from a steady cry - that's how the rehearsal
  // teaches pace without punishing it.
  el.classList.toggle('shrieking', crying && state.call.lastQuality === 'fast')
}

interface IntroEls {
  fence: HTMLElement
  prompt: HTMLElement
  desc: HTMLElement
  pipEls: HTMLElement[]
}

function renderIntro(els: IntroEls, state: GameState): void {
  const inIntro = state.phase === 'intro'
  const step = state.intro.step

  els.prompt.hidden = !inIntro || step !== 'prompt'
  els.fence.hidden = !inIntro
  // The description is never `hidden` - an element coming out of display:none
  // can't transition, and it would snap to full opacity instead of fading in.

  if (inIntro && step === 'prompt') {
    els.pipEls.forEach((pip, i) => {
      pip.classList.toggle('lit', i < state.call.presses)
    })
  }

  // The description fades in, holds, then fades back out; the step ends when
  // the fade-out does (see introDescriptionTime in game/update/intro.ts).
  if (inIntro && step === 'description') {
    const held = state.intro.stepTime < config.introTextFadeIn + config.introTextHold
    els.desc.classList.toggle('visible', held)
  } else {
    els.desc.classList.remove('visible')
  }
}

function renderOverlay(
  overlay: HTMLElement,
  bg: HTMLElement,
  title: HTMLElement,
  hint: HTMLElement,
  state: GameState,
): void {
  // The title art already carries the game's name, so the title text steps
  // aside and the hint drops below the logo (see .overlay.on-art).
  const onArt = state.phase === 'title'
  bg.hidden = !onArt
  overlay.classList.toggle('on-art', onArt)
  title.hidden = onArt

  if (state.phase === 'playing' || state.phase === 'intro') {
    overlay.hidden = true
    return
  }

  overlay.hidden = false

  if (state.phase === 'title') {
    hint.textContent = 'press space to fall asleep'
    return
  }

  if (state.phase === 'won') {
    title.textContent = 'dawn'
    hint.textContent = 'you made it through the night'
    return
  }

  title.textContent = 'the nightmare got you'
  hint.textContent =
    state.loseReason === 'abandoned'
      ? 'you cried too much - nobody came'
      : 'nobody came in time'
}

/** Black cut between the intro and the night: out over the door, back in on the room. */
function renderFade(el: HTMLElement, state: GameState): void {
  let opacity = 0

  if (state.phase === 'intro' && state.intro.step === 'fadeOut') {
    opacity = clamp01(state.intro.stepTime / config.stageFadeTime)
  } else if (state.phase === 'playing') {
    opacity = 1 - clamp01(state.phaseTime / config.stageFadeTime)
  }

  el.style.opacity = String(opacity)
}

function debugText(state: GameState): string {
  const { threat, call, parents } = state
  return [
    `phase ${state.phase}${state.phase === 'intro' ? ':' + state.intro.step : ''}`,
    `night ${state.timeOfNight.toFixed(1)}/${config.nightDuration}`,
    threat.active
      ? `monster ${threat.proximity.toFixed(2)}`
      : `calm ${threat.nextThreatIn.toFixed(1)}`,
    `presses ${call.presses}/${config.callPresses} ${call.lastQuality ?? '-'}`,
    `annoyance ${parents.annoyance.toFixed(2)}${parents.available ? '' : ' GONE'}`,
  ].join('   ')
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp01(t)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
