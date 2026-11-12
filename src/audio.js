// All sounds are synthesised with the Web Audio API, so there are no audio
// files. Browsers only allow sound after a user gesture, so init() is called
// from the first key press, click or tap.
//
// Sound is on when the game loads; M or the speaker button in the HUD
// switches it off (and on again) for that session.
let ctx = null;
let master = null;
let engine = null;
let muted = false;

function now() { return ctx.currentTime; }

function tone({ type = 'triangle', freq = 440, to = null, start = 0, length = 0.15, volume = 0.3, slide = false }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  const t0 = now() + start;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) {
    if (slide) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
    else osc.frequency.setValueAtTime(to, t0 + length / 2);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

let noiseBuffer = null;
function noise({ start = 0, length = 0.2, volume = 0.2, cutoff = 800 }) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  const t0 = now() + start;
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + length + 0.05);
}

const SOUNDS = {
  // Driving through a blue bar: a happy rising chime.
  repair: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, start: i * 0.07, length: 0.25, volume: 0.25 }));
  },
  // A star: a quick bright blip.
  star: () => tone({ type: 'square', freq: 880, to: 1320, length: 0.12, volume: 0.12 }),
  // Red bar: a soft falling thud with a puff, never harsh.
  oops: () => {
    tone({ type: 'sawtooth', freq: 160, to: 60, length: 0.3, volume: 0.2, slide: true });
    noise({ length: 0.3, volume: 0.15, cutoff: 500 });
  },
  // Bumping into a T-Rex: a thud and a cartoon boing.
  bonk: () => {
    tone({ type: 'sine', freq: 140, to: 70, length: 0.15, volume: 0.3, slide: true });
    tone({ freq: 300, to: 700, start: 0.04, length: 0.25, volume: 0.15, slide: true });
  },
  // Toilet lid flips open: a plastic clack.
  lid: () => {
    tone({ type: 'square', freq: 900, to: 500, length: 0.06, volume: 0.1, slide: true });
    noise({ length: 0.04, volume: 0.12, cutoff: 3000 });
  },
  // A poo pops up: a silly bloop and a little raspberry.
  poo: () => {
    tone({ type: 'sine', freq: 700, to: 180, start: 0.08, length: 0.18, volume: 0.25, slide: true });
    tone({ type: 'sawtooth', freq: 85, to: 60, start: 0.3, length: 0.35, volume: 0.1, slide: true });
    noise({ start: 0.3, length: 0.3, volume: 0.08, cutoff: 350 });
  },
  // Pee in the toilet: a little tinkle.
  pee: () => {
    [1568, 1319, 1480, 1175, 1397].forEach((f, i) => tone({ type: 'sine', freq: f, start: 0.08 + i * 0.07, length: 0.08, volume: 0.1 }));
  },
  // A T-Rex on the toilet gets a fright: a squeak.
  eek: () => {
    tone({ type: 'sine', freq: 600, to: 1400, length: 0.15, volume: 0.15, slide: true });
    tone({ type: 'sine', freq: 900, to: 1700, start: 0.12, length: 0.15, volume: 0.12, slide: true });
  },
  // Smashing a road toilet: a crash and some porcelain clinks.
  smash: () => {
    noise({ length: 0.35, volume: 0.25, cutoff: 4000 });
    tone({ type: 'sine', freq: 160, to: 70, length: 0.15, volume: 0.25, slide: true });
    [2600, 3300, 2900, 3700, 3100].forEach((f, i) => tone({ type: 'sine', freq: f, start: 0.05 + i * 0.06 + Math.random() * 0.03, length: 0.07, volume: 0.06 }));
  },
  // The press is about to come down: beep beep beep.
  pressWarn: () => {
    for (let i = 0; i < 3; i++) tone({ type: 'square', freq: 880, start: i * 0.35, length: 0.12, volume: 0.07 });
  },
  // The press hits the road: a heavy thump.
  slam: () => {
    tone({ type: 'sine', freq: 110, to: 40, length: 0.3, volume: 0.35, slide: true });
    noise({ length: 0.25, volume: 0.2, cutoff: 400 });
  },
  // The car got squashed: a crunch and a sad slide down.
  crush: () => {
    noise({ length: 0.4, volume: 0.25, cutoff: 1800 });
    tone({ freq: 500, to: 120, start: 0.2, length: 0.8, volume: 0.15, slide: true });
  },
  // Kicking a cone away: a light plastic tok.
  kick: () => {
    tone({ freq: 620, to: 260, length: 0.1, volume: 0.2, slide: true });
    noise({ length: 0.06, volume: 0.1, cutoff: 2500 });
  },
  // Parked: a little jingle.
  park: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, start: i * 0.1, length: 0.35, volume: 0.25 }));
    tone({ freq: 1568, start: 0.55, length: 0.6, volume: 0.25 });
  },
  // New upgrade for the car: a fanfare.
  unlock: () => {
    [392, 523, 659, 784].forEach((f, i) => tone({ type: 'square', freq: f, start: i * 0.12, length: 0.2, volume: 0.12 }));
    [1047, 1319].forEach((f, i) => tone({ type: 'square', freq: f, start: 0.5 + i * 0.15, length: 0.5, volume: 0.12 }));
  },
  // Start of a level: a friendly double note.
  go: () => {
    tone({ freq: 659, length: 0.12, volume: 0.2 });
    tone({ freq: 880, start: 0.12, length: 0.25, volume: 0.2 });
  },
};

function createEngine() {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 70;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  // A slow wobble that makes a broken engine sputter.
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 9;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(gain.gain);
  osc.connect(filter).connect(gain).connect(master);
  osc.start();
  lfo.start();
  return { osc, gain, lfoGain };
}

// Two-tone ambulance siren: a square wave flips the pitch between two notes.
function createSiren() {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 510;
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 1.25;
  const depth = ctx.createGain();
  depth.gain.value = 70; // 440 and 580 Hz
  lfo.connect(depth).connect(osc.frequency);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain).connect(master);
  osc.start();
  lfo.start();
  return gain;
}
let sirenGain = null;

export const audio = {
  init() {
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume(); // also 'interrupted' on iOS
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    engine = createEngine();
    sirenGain = createSiren();
  },
  play(name) {
    if (!ctx || muted) return;
    SOUNDS[name]?.();
  },
  // Call every frame. speed 0 (standing) to 1 (full speed); stage 0 broken,
  // 1 repaired, 2 shiny. The pitch rises with the speed.
  engine(speed, stage) {
    if (!engine) return;
    const t = ctx.currentTime;
    const on = speed > 0.02;
    const target = on ? (stage === 0 ? 0.10 : 0.07) * (0.6 + 0.4 * speed) : 0;
    engine.gain.gain.setTargetAtTime(target, t, 0.08);
    engine.lfoGain.gain.setTargetAtTime(stage === 0 && on ? 0.06 : 0, t, 0.05);
    const freq = stage === 0 ? 55 : stage === 1 ? 85 : 100;
    engine.osc.frequency.setTargetAtTime(freq * (1 + 0.5 * speed), t, 0.15);
  },
  // Call every frame. level 0 is silent, 1 is an ambulance on screen.
  siren(level) {
    if (!sirenGain) return;
    sirenGain.gain.setTargetAtTime(level * 0.08, ctx.currentTime, 0.1);
  },
  toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
    if (!muted) this.play('star'); // a blip, so you hear that sound is on
    return muted;
  },
  get muted() { return muted; },
};
