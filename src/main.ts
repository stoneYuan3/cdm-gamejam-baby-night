import './style.css'
import { createInput } from './engine/input.ts'
import { startLoop } from './engine/loop.ts'
import { createState } from './game/state.ts'
import { tick } from './game/update/ticker.ts'
import { createScene } from './ui/scene.ts'
import { createSound } from './ui/sound.ts'
import { setupViewport } from './viewport.ts'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

document.querySelector<HTMLDivElement>('#app')!.outerHTML =
  '<div id="game-frame"></div>'

const gameFrame = document.querySelector<HTMLDivElement>('#game-frame')!

setupViewport(gameFrame, DESIGN_WIDTH, DESIGN_HEIGHT)

const scene = createScene(gameFrame)
const sound = createSound()
const input = createInput()
let state = createState()

startLoop((dt, now) => {
  state = tick(state, input.drainCalls(), input.takeRestart(), dt)
  scene.render(state, now)
  sound.update(state)
})
