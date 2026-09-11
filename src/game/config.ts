/** Every tunable number lives here. Gameplay code must not hardcode timings. */
export const config = {
  nightDuration: 60, // seconds of survival needed to reach dawn
  // Calm-time ranges in seconds, rolled fresh each time so monsters can't be timed.
  firstThreatDelay: { min: 3, max: 5 }, // before the first monster
  threatInterval: { min: 3, max: 5 }, // between monsters
  monsterApproachTime: { min: 3, max:5 }, // seconds from monster appearing to reaching the baby

  callPresses: 5, // space presses needed to summon the parents
  minInterval: 0.4, // faster than this = noisy crying
  maxInterval: 1.2, // slower than this = the call falls apart

  fastPressAnnoyance: 0.5, // annoyance added per too-fast press
  annoyanceDecay: 0.02, // annoyance recovered per second, calm only

  resultLockout: 1.2, // seconds the win/lose result ignores input, so an
  // in-flight mash can't skip it straight back to the title

  // Intro: practise the call once, with no annoyance cost, before the night starts.
  introAnimationTime: 1.6, // "parents arrive": door opens, then holds on its last frame
  introDoorFrameTime: 0.25, // seconds per door frame; keep 3x this <= introAnimationTime
  introTextFadeIn: 0.5,
  introTextHold: 2, // description stays fully visible this long
  introTextFadeOut: 0.5,
  stageFadeTime: 1, // seconds for the intro's fade to black and the night's fade back in

  debugOverlay: true, // dev-only readout; set false before submitting

  // 0..1 per clip. An <audio> element can't go above 1.0, so relative volume
  // is the only mixing lever - footsteps stays loudest, everything else is
  // turned down so footsteps reads clearly over it.
  volume: {
    ambience: 0.75,
    monsterSeq: 0.75,
    footsteps: 1,
    doorOpen: 0.75,
    doorClose: 0.75,
    cryGood: 0.3, // a normal-paced call
    cryMessedUp: 1, // too-fast press - the louder, more shrieking cry
  },
}
