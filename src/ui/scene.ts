import { config } from '../game/config.ts'
import type { GameState } from '../game/state.ts'

const PRESS_FLASH = 0.15 // seconds the baby reacts to a press

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
    <div class="monster"></div>
    <div class="baby"></div>
    <div class="intro-anim"></div>
    <div class="intro-prompt">
      <p class="intro-line">press space 5 times to call for help</p>
      <div class="pips"></div>
    </div>
    <p class="intro-desc"></p>
    <div class="overlay"><p class="overlay-title"></p><p class="overlay-hint"></p></div>
    <div class="debug"></div>
  `

  const monster = frame.querySelector<HTMLElement>('.monster')!
  const baby = frame.querySelector<HTMLElement>('.baby')!
  const introAnim = frame.querySelector<HTMLElement>('.intro-anim')!
  const introPrompt = frame.querySelector<HTMLElement>('.intro-prompt')!
  const introDesc = frame.querySelector<HTMLElement>('.intro-desc')!
  const pips = frame.querySelector<HTMLElement>('.pips')!
  const overlay = frame.querySelector<HTMLElement>('.overlay')!
  const overlayTitle = frame.querySelector<HTMLElement>('.overlay-title')!
  const overlayHint = frame.querySelector<HTMLElement>('.overlay-hint')!
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

  return {
    render(state, now) {
      renderMonster(monster, state)
      renderBaby(baby, state, now)
      renderIntro(
        { anim: introAnim, prompt: introPrompt, desc: introDesc, pipEls },
        state,
      )
      renderOverlay(overlay, overlayTitle, overlayHint, state)

      if (config.debugOverlay) {
        debug.textContent = debugText(state)
      }
    },
  }
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

function renderBaby(el: HTMLElement, state: GameState, now: number): void {
  const awake = state.phase === 'playing' || state.phase === 'intro'
  const crying =
    awake &&
    state.call.lastPressAt > 0 &&
    now - state.call.lastPressAt < PRESS_FLASH

  el.classList.toggle('crying', crying)
  // A shriek reads differently from a steady cry, in the intro too - that's how
  // the rehearsal teaches pace without punishing it.
  el.classList.toggle('shrieking', crying && state.call.lastQuality === 'fast')
}

interface IntroEls {
  anim: HTMLElement
  prompt: HTMLElement
  desc: HTMLElement
  pipEls: HTMLElement[]
}

function renderIntro(els: IntroEls, state: GameState): void {
  const inIntro = state.phase === 'intro'
  const step = state.intro.step

  els.prompt.hidden = !inIntro || step !== 'prompt'
  els.anim.hidden = !inIntro || step !== 'animation'
  // The description is never `hidden` - an element coming out of display:none
  // can't transition, and it would snap to full opacity instead of fading in.

  if (inIntro && step === 'prompt') {
    els.pipEls.forEach((pip, i) => {
      pip.classList.toggle('lit', i < state.call.presses)
    })
  }

  // The description fades in, holds, then fades back out; the step ends when
  // the fade-out does (see introDescriptionTime in update.ts).
  if (inIntro && step === 'description') {
    const held = state.intro.stepTime < config.introTextFadeIn + config.introTextHold
    els.desc.classList.toggle('visible', held)
  } else {
    els.desc.classList.remove('visible')
  }
}

function renderOverlay(
  overlay: HTMLElement,
  title: HTMLElement,
  hint: HTMLElement,
  state: GameState,
): void {
  if (state.phase === 'playing' || state.phase === 'intro') {
    overlay.hidden = true
    return
  }

  overlay.hidden = false

  if (state.phase === 'title') {
    title.textContent = 'baby night'
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
