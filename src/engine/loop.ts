const MAX_DT = 0.1

export function startLoop(onTick: (dt: number, now: number) => void): void {
  let last = performance.now()

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, MAX_DT)
    last = now
    onTick(dt, now / 1000)
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
