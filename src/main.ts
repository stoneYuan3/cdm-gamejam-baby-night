import './style.css'
import { setupViewport } from './viewport.ts'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

document.querySelector<HTMLDivElement>('#app')!.outerHTML =
  '<div id="game-frame"></div>'

const gameFrame = document.querySelector<HTMLDivElement>('#game-frame')!

setupViewport(gameFrame, DESIGN_WIDTH, DESIGN_HEIGHT)
