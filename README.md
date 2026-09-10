# baby-night

Pure TypeScript, DOM-based web game (no canvas, no game-engine libraries) built with Vite.

Built for a hackathon-style game jam, due **2026-09-11 1pm**.

## Game concept

Somewhat similar to Five Nights at Freddy's. Art is 3D environment + 2D characters,
animated as serial PNG sequences. The baby is asleep and having a nightmare, trying to
survive until dawn.

- In the nightmare, the baby may see a monster approaching.
- To call for help from the parents (in the dream), the player presses the space key 5
  times — but the *pace* of presses matters, not just the count:
  - **Too fast:** the baby makes loud, noisy cries that eventually annoy the parents, so
    they stop coming → lose.
  - **Too slow:** the monster reaches the baby before help arrives → lose.
  - **Steady pace, kept up until dawn:** win.
- Other hazard/interaction types (e.g. hunger) are planned as additional scenarios after
  the core monster/call-for-help loop is working — not yet implemented.

## Viewport: fixed 16:9 letterboxed frame

The game's art is authored at a fixed 16:9 aspect ratio, so instead of writing responsive
layout for every possible window/screen shape, all game content renders inside a single
DOM element locked to a fixed design resolution, which is then uniformly scaled to fit
whatever window it's shown in. Everything outside that frame is solid-color letterbox/pillarbox
bars.

- **Design resolution:** 1920x1080 (16:9). All game DOM should be positioned in this
  coordinate space (e.g. absolute pixel `top`/`left` values from 0-1920 / 0-1080), the same
  way you'd lay out sprites for a fixed-resolution canvas engine.
- **`#game-frame`** ([src/style.css](src/style.css)) is the root element: fixed
  `width: 1920px; height: 1080px`, `position: absolute; top: 50%; left: 50%`, with
  `transform-origin: center`. All game content is built inside it.
- **[src/viewport.ts](src/viewport.ts)** (`setupViewport`) computes
  `scale = min(innerWidth / 1920, innerHeight / 1080)` and sets
  `#game-frame`'s `transform` to `translate(-50%, -50%) scale(${scale})`, recalculating on
  `resize` and `orientationchange` (rAF-throttled). The `translate(-50%,-50%)` centers the
  frame on the viewport; `transform-origin: center` is what keeps that center point fixed
  as `scale` changes — using `top left` instead would only center correctly at `scale: 1`
  and drift as the window is resized.
- **Letterbox color:** `html, body` background, controlled by the `--letterbox-bg` CSS
  variable in [src/style.css](src/style.css) (currently black). `html, body` also use
  `height: 100dvh; overflow: hidden` so there's never a scrollbar or mobile browser-chrome
  jump.
- **[src/main.ts](src/main.ts)** replaces the default `#app` div with `#game-frame` and
  calls `setupViewport(gameFrame, 1920, 1080)` once on startup — this is the only wiring
  needed; new game code should just append into `#game-frame`.

No max-scale clamp is applied — DOM/CSS scaling doesn't pixelate the way raster canvas art
does, so the frame can scale up freely on large screens. If pixel-art-style assets get added
later and start looking soft/blurry when scaled up, revisit this.

## Development

```
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview a production build
```
