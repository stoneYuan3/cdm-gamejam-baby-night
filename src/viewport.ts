export function setupViewport(
  frame: HTMLElement,
  designWidth: number,
  designHeight: number,
): void {
  let scheduled = false

  const applyScale = () => {
    scheduled = false
    const scale = Math.min(
      window.innerWidth / designWidth,
      window.innerHeight / designHeight,
    )
    frame.style.transform = `translate(-50%, -50%) scale(${scale})`
  }

  const requestScale = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(applyScale)
  }

  window.addEventListener('resize', requestScale)
  window.addEventListener('orientationchange', requestScale)
  applyScale()
}
