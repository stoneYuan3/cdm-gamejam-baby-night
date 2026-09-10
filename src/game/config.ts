/** Every tunable number lives here. Gameplay code must not hardcode timings. */
export const config = {
  nightDuration: 180, // seconds of survival needed to reach dawn
  firstThreatDelay: 6, // calm time before the first monster
  threatInterval: 12, // calm time between monsters
  monsterApproachTime: 6, // seconds from monster appearing to reaching the baby

  callPresses: 5, // space presses needed to summon the parents
  minInterval: 0.35, // faster than this = noisy crying
  maxInterval: 1.2, // slower than this = the call falls apart

  fastPressAnnoyance: 0.15, // annoyance added per too-fast press
  annoyanceDecay: 0.02, // annoyance recovered per second, calm only

  resultLockout: 1.2, // seconds the win/lose result ignores input, so an
  // in-flight mash can't skip it straight back to the title

  // Intro: practise the call once, with no annoyance cost, before the night starts.
  introAnimationTime: 1.6, // placeholder "parents arrive" animation
  introTextFadeIn: 0.5,
  introTextHold: 2, // description stays fully visible this long
  introTextFadeOut: 0.5,

  debugOverlay: true, // dev-only readout; set false before submitting
}
