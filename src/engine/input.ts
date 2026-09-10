export interface Input {
  /** Space presses since the last drain, as loop-clock seconds. */
  drainCalls(): number[]
  /** True once if restart was requested since the last check. */
  takeRestart(): boolean
}

export function createInput(): Input {
  let calls: number[] = []
  let restart = false

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return

    if (e.code === 'Space') {
      e.preventDefault()
      calls.push(performance.now() / 1000)
    } else if (e.code === 'KeyR') {
      restart = true
    }
  })

  return {
    drainCalls() {
      const drained = calls
      calls = []
      return drained
    },
    takeRestart() {
      const requested = restart
      restart = false
      return requested
    },
  }
}
