// The course: the car starts at the bottom, broken, and drives up. Blue bars
// repair it, red bars and bumping into a T-Rex hurt it a little, cones get
// kicked away. At the top is a parking lot that finishes the level. The point
// is to feel the car getting better, so setbacks are small, a hint always
// shows the next blue bar, and stars unlock upgrades that stay.
import { input } from '../input.js';
import { WIDTH, HEIGHT } from '../renderer.js';
import { audio } from '../audio.js';
import { loadSave, writeSave } from '../save.js';
import {
  INK, CAR_W, CAR_H, roundRect, circle, fillStroke,
  drawCar, drawTrex, drawCone, drawTree, drawFlower, drawBar, drawStar, drawCheck, drawCross,
  drawArrow, drawWrench, drawTwinkle, drawSpeaker, drawAmbulance, AMBULANCE_H,
  drawToilet, TOILET_W, TOILET_H, drawToiletSide, TOILET_SEAT, drawPoo, drawStink, drawDrop, drawShard,
  drawPress, drawPressFloor,
} from '../draw.js';

const SPEED = 58;
const BROKEN_SPEED = 0.85;
const ROAD = { x0: 44, x1: 212 };
const ROW_GAP = 46;
const GAP_W = 40;
const LOT = { x0: 60, x1: 196, y0: 30, y1: 76, spaces: 4 };
const HALF_W = CAR_W / 2;
const HALF_H = CAR_H / 2;
const STAGES = 3; // 0 broken, 1 repaired, 2 shiny
const SOUND_BUTTON = { x: WIDTH - 10, y: 9, r: 6 }; // top right of the HUD

// Driving feel: up speeds the car up over about half a second, letting go
// rolls it to a stop, down brakes harder and then reverses slowly. Steering
// reacts quickly so aiming with the arrow keys stays easy.
const DRIVE = { accel: 110, brake: 220, coast: 80, reverseAccel: 80, reverse: 0.6, steer: 0.85, steerAccel: 360 };

// From level 5 a press stamps down on part of the road, in place of a row of
// bars. Drive under it while it is up, or around it through the free lane.
// Caught underneath, the car is squashed and starts again from the start
// line (stars are kept). Fair for young players: a long warning (lights,
// trembling, beeps), always a free lane, and only a real overlap counts.
const PRESS = {
  from: 5, lift: 28, clear: 6, halfH: 12, forgive: 5,
  warn: 1.2, slam: 0.12, down: 0.8, rise: 0.9, // seconds; time up depends on the level
  crushTime: 2.2,
};

// T-Rexes wander across the road. Bumping into one costs one repair step, the
// T-Rex gets dizzy and an ambulance comes to pick it up.
const DINO = {
  speed: [14, 24], wait: [1, 4], pause: [0.6, 1.6],
  surprise: 0.35,   // chance per second of stopping in the middle of the road
  turnBack: 0.35,   // chance it walks back after stopping
  wander: 4,        // how far up or down a crossing drifts
  grass: { left: ROAD.x0 - 20, right: ROAD.x1 + 20 }, // where it waits
  hitW: 8, hitH: 11, // half size of its body for bumping
  // When the car is right in front of it, it stops, turns around after a
  // moment and hesitates before walking on.
  notice: 8, turnDelay: 0.5, hesitate: [1.8, 3.2],
  // Now and then one suddenly has to go: it hurries to the nearest grass,
  // squats and leaves a poo there.
  urge: 0.15,       // chance per second while crossing the road
  hurrySpeed: 48, squat: 1.6, maxPoos: 10,
};
const AMBULANCE = { speed: 85, leaveSpeed: 120, load: 0.8, turn: 0.7 };

// A toilet stands in every parking space but one, so the player has to find
// the free space. Driving against one flips its lid open; some have a poo inside.
// From level 3 toilets also stand on the road; the car smashes them to pieces
// and drives on, no harm done.
const ROAD_TOILETS = { from: 3, max: 4, shards: 16, puddle: 5 };

// Some hold pee, and sometimes a T-Rex sits on one, which is drawn from the
// side; bumping it gives it a fright.
const TOILET = {
  y: LOT.y0 + 19, pooChance: 0.5, peeChance: 0.45, dinoChance: 0.4,
  openTime: 2.5, lidSpeed: 6, startle: 0.9, dinoScale: 0.8,
};

// Upgrades the car keeps forever, unlocked by total stars.
export const UPGRADES = [
  { key: 'stripes', stars: 6 },
  { key: 'roofLight', stars: 14 },
  { key: 'spoiler', stars: 24 },
  { key: 'goldRims', stars: 36 },
  { key: 'flag', stars: 50 },
];

const PAL = {
  grass: '#6cc24a', grassLight: '#80d45c', grassDark: '#5aae3f',
  flower: ['#ff8fb1', '#ffffff', '#ffd34d', '#b388ff'],
  road: '#525b6e', roadLight: '#5c667a', curb: '#d9dee6', curbDark: '#9aa3b2',
  lot: '#8a94a6', lotLine: '#f4f6f9',
  shadow: 'rgba(20,24,40,0.3)',
  confetti: ['#ffd34d', '#3ddc84', '#4fa8ff', '#ff8fb1', '#ffffff'],
  hud: 'rgba(20,24,40,0.72)',
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cones never stop the car (that was annoying): it kicks them away, and they
// fly off spinning and hopping until they slide to a stop.
const KICK = { speed: 85, hop: 70, gravity: 260, bounce: 0.45, airDrag: 0.5, groundDrag: 3, cooldown: 0.25 };

// Each level adds one idea: 1 bars, 2 cones to kick away, 3 toilets to smash,
// 4 a T-Rex walking across the road, 5 a press, then more of each.
function makeCourse(level) {
  const rand = rng(level * 7919 + 17);
  const rows = Math.min(4 + Math.floor(level / 2), 12);
  const redChance = Math.min(0.25 + level * 0.06, 0.5);
  const lines = [];
  const cones = [];
  const coneRows = new Set();
  const firstY = LOT.y1 + 48;
  const minSeg = 30;

  // Presses use their own random sequence, so the rest of a level stays as
  // it was before presses existed. Each takes the place of a row of bars.
  const pressRand = rng(level * 104729 + 3);
  const presses = [];
  if (level >= PRESS.from) {
    const count = level < 9 ? 1 : level < 13 ? 2 : 3;
    for (let n = 0; n < count; n++) {
      for (let tries = 0; tries < 12; tries++) {
        const row = 1 + Math.floor(pressRand() * (rows - 2));
        const left = pressRand() < 0.5;
        if (presses.some((p) => Math.abs(p.row - row) < 3)) continue;
        const width = 96 + Math.min(level - PRESS.from, 8) * 4; // the free lane narrows a little
        const x0 = left ? ROAD.x0 : ROAD.x1 - width;
        const up = Math.max(2.2, 3.4 - (level - PRESS.from) * 0.1);
        const cycle = up + PRESS.warn + PRESS.slam + PRESS.down + PRESS.rise;
        presses.push({
          row, x0, x1: x0 + width, cx: x0 + width / 2, hw: width / 2, y: firstY + row * ROW_GAP,
          posts: [x0 - 3, x0 + width + 3], up, cycle, phase: pressRand() * cycle, mode: 'up', lift: PRESS.lift,
        });
        break;
      }
    }
  }
  const pressRows = new Set(presses.map((p) => p.row));
  // The space between rows i and i + 1 is too close to a press for cones,
  // T-Rexes and road toilets.
  const nearPress = (i) => pressRows.has(i) || pressRows.has(i + 1);

  for (let i = 0; i < rows; i++) {
    const y = firstY + i * ROW_GAP;
    const gapX = ROAD.x0 + 6 + minSeg + Math.floor(rand() * (ROAD.x1 - ROAD.x0 - 12 - 2 * minSeg - GAP_W));
    // Every row has at least one blue bar, so repair is always ahead.
    const blueLeft = rand() < 0.5;
    const otherRed = rand() < redChance;
    const left = blueLeft ? 'blue' : otherRed ? 'red' : 'blue';
    const right = blueLeft ? (otherRed ? 'red' : 'blue') : 'blue';
    if (!pressRows.has(i)) {
      lines.push({ x0: ROAD.x0 + 6, x1: gapX, y, color: left });
      lines.push({ x0: gapX + GAP_W, x1: ROAD.x1 - 6, y, color: right });
    }

    if (level >= 2 && i < rows - 1 && rand() < Math.min(0.25 + level * 0.07, 0.8)) {
      const count = 1 + Math.floor(rand() * Math.min(2 + level / 3, 4));
      const cx = ROAD.x0 + 24 + rand() * (ROAD.x1 - ROAD.x0 - 48);
      const keep = !nearPress(i); // still draw the numbers, so later rows stay the same
      if (keep) coneRows.add(i);
      for (let c = 0; c < count; c++) {
        const cone = {
          x: cx + (rand() - 0.5) * 40, y: y + 16 + rand() * (ROW_GAP - 30),
          vx: 0, vy: 0, z: 0, vz: 0, angle: 0, spin: 0, moving: false, cool: 0,
        };
        if (keep) cones.push(cone);
      }
    }
  }
  const length = firstY + rows * ROW_GAP + 44;

  const rexes = [];
  const rexCount = level < 4 ? 0 : level < 8 ? 1 : level < 12 ? 2 : 3;
  const usedRows = new Set();
  const rexRows = rows - 2; // never the first or last row
  for (let n = 0; n < rexCount && rexRows > 0; n++) {
    let i = 1 + Math.floor(rand() * rexRows);
    // Prefer a row without cones, so it does not walk through them.
    const next = (j) => 1 + (j % rexRows);
    const tests = [
      (j) => usedRows.has(j) || coneRows.has(j) || nearPress(j),
      (j) => usedRows.has(j) || nearPress(j),
      (j) => usedRows.has(j),
    ];
    for (const taken of tests) {
      for (let k = 0; k < rexRows && taken(i); k++) i = next(i);
      if (!taken(i)) break;
    }
    usedRows.add(i);
    const left = rand() < 0.5;
    const wait = rand() * 3;
    const y = firstY + i * ROW_GAP + ROW_GAP / 2 + 14; // feet
    rexes.push({
      x: left ? DINO.grass.left : DINO.grass.right, y, homeY: y, targetY: y,
      facing: left ? 1 : -1, bobPhase: rand() * 6.28,
      state: 'wait', timer: wait, speed: 0, step: 0,
    });
  }

  const trees = [];
  const flowers = [];
  const tufts = [];
  // Keep the grass where a T-Rex waits free of trees, on both sides.
  const nearRex = (y) => rexes.some((r) => Math.abs(r.y - 14 - y) < 30);
  for (let y = 0; y < length; y += 22) {
    for (const [lo, hi] of [[6, ROAD.x0 - 12], [ROAD.x1 + 12, WIDTH - 6]]) {
      const tx = lo + rand() * (hi - lo);
      const ty = y + rand() * 14;
      const r = 4.5 + rand() * 3;
      const overlaps = trees.some((o) => Math.hypot(o.x - tx, o.y - ty) < o.r + r + 1);
      if (rand() < 0.55 && !nearRex(ty) && !overlaps) trees.push({ x: tx, y: ty, r });
      for (let f = 0; f < 2; f++) {
        flowers.push({ x: lo + rand() * (hi - lo), y: y + rand() * 22, c: PAL.flower[Math.floor(rand() * PAL.flower.length)] });
      }
      tufts.push({ x: lo + rand() * (hi - lo), y: y + rand() * 22, r: 3 + rand() * 5 });
    }
  }
  // Last, so the rest of the level stays the same as before toilets existed.
  const freeSpace = Math.floor(rand() * LOT.spaces);
  const spaceW = (LOT.x1 - LOT.x0) / LOT.spaces;
  const toilets = [];
  for (let s = 0; s < LOT.spaces; s++) {
    const poo = rand() < TOILET.pooChance;
    if (s === freeSpace) continue;
    toilets.push({ x: LOT.x0 + spaceW * (s + 0.5), y: TOILET.y, poo, open: 0, timer: 0, dino: null, startle: 0 });
  }
  if (!toilets.some((t) => t.poo)) toilets[Math.floor(rand() * toilets.length)].poo = true;
  for (const toilet of toilets) toilet.pee = rand() < TOILET.peeChance;
  if (rand() < TOILET.dinoChance) {
    const toilet = toilets[Math.floor(rand() * toilets.length)];
    toilet.dino = { facing: rand() < 0.5 ? 1 : -1, phase: rand() * 10 };
  }

  // Between two rows of bars, away from T-Rex rows, cones and each other.
  const roadToilets = [];
  if (level >= ROAD_TOILETS.from) {
    const count = Math.min(1 + Math.floor((level - ROAD_TOILETS.from) / 2), ROAD_TOILETS.max);
    for (let n = 0; n < count; n++) {
      for (let tries = 0; tries < 8; tries++) {
        const i = Math.floor(rand() * (rows - 1));
        const x = ROAD.x0 + 16 + rand() * (ROAD.x1 - ROAD.x0 - 32);
        const y = firstY + i * ROW_GAP + ROW_GAP / 2;
        const clear = !usedRows.has(i) && !nearPress(i) && !pressRows.has(i + 2) // clear of the beam too
          && !cones.some((cone) => Math.hypot(cone.x - x, cone.y - y) < 18)
          && !roadToilets.some((t) => Math.hypot(t.x - x, t.y - y) < 30);
        if (clear) { roadToilets.push({ x, y, angle: (rand() - 0.5) * 0.6, broken: false }); break; }
      }
    }
  }

  return {
    level, lines, cones, rexes, trees, flowers, tufts, length, freeSpace, toilets, roadToilets, presses,
    puddles: [],   // left by smashed road toilets
    grassPoos: [], // dropped by T-Rexes while playing
  };
}

export function createCourseScene({ startNearLot = false, startNearRex = false, startNearPress = false, level = null } = {}) {
  const saved = loadSave();
  const state = {
    level: level ?? saved?.level ?? 1,
    stars: saved?.stars ?? 0,
    car: { x: WIDTH / 2, y: 0, stage: 0 },
    passed: new Set(saved?.passed ?? []),
    moved: false,
    unlocks: saved?.unlocks ?? 0, // how many upgrades were celebrated
  };
  let course = makeCourse(state.level);
  state.car.y = course.length - 18;
  if (saved?.car && saved.level === state.level && level === null) {
    const stage = saved.car.stage ?? (saved.car.broken === false ? 1 : 0); // v2 saves had `broken`
    state.car = { x: saved.car.x, y: saved.car.y, stage };
  }
  if (startNearLot) state.car = { x: WIDTH / 2, y: LOT.y1 + 70, stage: 0 };
  if (startNearRex && course.rexes[0]) state.car = { x: WIDTH / 2, y: course.rexes[0].y + 40, stage: 0 };
  if (startNearPress && course.presses[0]) state.car = { x: WIDTH / 2, y: course.presses[0].y + 50, stage: 0 };

  let feedback = null;      // { kind: 'check'|'cross'|'star', x, y, t, big }
  let particles = [];
  let shake = 0;
  let finish = null;        // { t, stars } while celebrating a parked car
  let banner = null;        // { t, key } while showing a new upgrade
  let intro = 1.6;          // level number shown at the start
  let fade = 0;
  let time = 0;
  let saveTimer = 0;
  let smokeTimer = 0;
  let hurtCooldown = 0;
  let touching = new Set();
  let ambulances = [];
  let crushed = null;       // { t } while the squashed car is shown

  function upgrades() {
    const u = {};
    for (const up of UPGRADES) if (state.stars >= up.stars) u[up.key] = true;
    return u;
  }

  function save() {
    writeSave({
      level: state.level, stars: state.stars, car: state.car,
      passed: [...state.passed], unlocks: state.unlocks,
    });
  }
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  function burst(x, y, colors, n = 12, speed = 40, life = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const s = speed * (0.5 + Math.random() * 0.7);
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: life * (0.7 + Math.random() * 0.5),
        color: colors[i % colors.length], size: 1.5 + Math.random() * 1.5, gravity: true,
      });
    }
  }

  function addStars(n, x, y) {
    const before = state.stars;
    state.stars += n;
    audio.play('star');
    for (let i = 0; i < n; i++) {
      particles.push({
        x: x + (i - (n - 1) / 2) * 10, y, vx: 0, vy: -22, t: 1.1, star: true, size: 3.5, color: '#ffd34d',
      });
    }
    // Did this cross an upgrade threshold?
    const reached = UPGRADES.filter((u) => state.stars >= u.stars).length;
    if (reached > state.unlocks && before < UPGRADES[reached - 1].stars) {
      state.unlocks = reached;
      banner = { t: 3, key: UPGRADES[reached - 1].key };
      audio.play('unlock');
    }
    save();
  }

  function repair(x, y) {
    const { car } = state;
    if (car.stage < STAGES - 1) car.stage += 1;
    burst(x, y, ['#ffffff', '#ffd34d', '#9df0c0'], 18, 55);
    feedback = { kind: 'check', x, y, t: 0.9, big: true };
    audio.play('repair');
  }

  function hurt(x, y, sound = 'oops') {
    const { car } = state;
    if (hurtCooldown > 0) return;
    hurtCooldown = 0.8;
    if (car.stage > 0) car.stage -= 1;
    burst(x, y, ['#8a94a6', '#5c667a', '#b9c2d0'], 10, 35);
    feedback = { kind: 'cross', x, y, t: 0.7, big: false };
    shake = 0.2;
    audio.play(sound);
  }

  function startLevel(level) {
    state.level = level;
    state.passed = new Set();
    course = makeCourse(level);
    state.car = { x: WIDTH / 2, y: course.length - 18, stage: 0 };
    state.moved = false;
    touching = new Set();
    ambulances = [];
    finish = null;
    intro = 1.6;
    audio.play('go');
    save();
  }

  function parkingSpaceAt(x) {
    const w = (LOT.x1 - LOT.x0) / LOT.spaces;
    const i = Math.floor((x - LOT.x0) / w);
    if (i < 0 || i >= LOT.spaces) return null;
    return { index: i, center: LOT.x0 + w * (i + 0.5) };
  }

  // The space the car is in, if it is far enough in and close enough to the
  // middle to park.
  function parkableSpace() {
    const { car } = state;
    const space = parkingSpaceAt(car.x);
    return space && car.y < LOT.y1 - 12 && Math.abs(car.x - space.center) <= 8 ? space : null;
  }

  function tryPark() {
    const { car } = state;
    const space = parkableSpace();
    if (space) {
      car.x = space.center; // snap neatly into the space
      const earned = 1 + car.stage;
      finish = { t: 3, stars: earned };
      audio.play('park');
      addStars(earned, car.x, car.y - 14);
    } else if (car.y < LOT.y1 + 30) {
      // Close, but not in a space yet: just a nudge, no cross.
      feedback = { kind: 'arrow', x: car.x, y: car.y, t: 0.8 };
    }
  }

  function moveCar(dt) {
    const { car } = state;
    const prev = { x: car.x, y: car.y };
    car.vx ??= 0;
    car.vy ??= 0;
    const up = input.isDown('up');
    const down = input.isDown('down');
    const steer = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    const max = car.stage === 0 ? SPEED * BROKEN_SPEED : SPEED;

    // Forward is up the road, so vy < 0. Speed up, brake, reverse or roll.
    let ay;
    if (up && !down) ay = car.vy > 0 ? -DRIVE.brake : -DRIVE.accel;
    else if (down && !up) ay = car.vy < 0 ? DRIVE.brake : DRIVE.reverseAccel;
    else ay = -Math.sign(car.vy) * Math.min(DRIVE.coast, Math.abs(car.vy) / dt);
    car.vy = Math.min(Math.max(car.vy + ay * dt, -max), max * DRIVE.reverse);
    const steerStep = DRIVE.steerAccel * dt;
    car.vx += Math.min(Math.max(steer * max * DRIVE.steer - car.vx, -steerStep), steerStep);

    const speed = Math.hypot(car.vx, car.vy);
    audio.engine(Math.min(1, speed / SPEED), car.stage); // pitch follows the speed
    if (up || down || steer) state.moved = true;
    if (speed < 0.01) return;
    const dx = car.vx / speed, dy = car.vy / speed; // driving direction, for kicks
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    const stop = () => { car.x = prev.x; car.y = prev.y; car.vx = 0; car.vy = 0; };

    const x = Math.min(Math.max(car.x, ROAD.x0 + HALF_W), ROAD.x1 - HALF_W);
    if (x !== car.x) { car.x = x; car.vx = 0; }
    const y = Math.min(Math.max(car.y, LOT.y0 + HALF_H + 2), course.length - HALF_H);
    if (y !== car.y) { car.y = y; car.vy = 0; }
    const insideLotX = car.x > LOT.x0 + HALF_W && car.x < LOT.x1 - HALF_W;
    if (car.y - HALF_H < LOT.y1 && !insideLotX) {
      if (prev.y - HALF_H >= LOT.y1) { car.y = LOT.y1 + HALF_H; car.vy = 0; }
      else { car.x = prev.x; car.vx = 0; }
    }
    for (const toilet of course.toilets) {
      if (Math.abs(car.x - toilet.x) >= HALF_W + TOILET_W / 2) continue;
      if (Math.abs(car.y - toilet.y) >= HALF_H + TOILET_H / 2) continue;
      stop();
      bumpToilet(toilet);
    }
    // The posts always, the block while it is (nearly) down. Only moving in
    // deeper is stopped, so a car caught at the edge can still back out.
    for (const press of course.presses) {
      const boxes = press.posts.map((px) => [px, 2.5]);
      if (press.lift < PRESS.clear) boxes.push([press.cx, press.hw]);
      const deeper = boxes.some(([bx, hw]) => {
        const d = depth(car.x, car.y, bx, press.y, hw, PRESS.halfH);
        return d > 0 && d > depth(prev.x, prev.y, bx, press.y, hw, PRESS.halfH);
      });
      if (deeper) { stop(); break; }
    }

    const band = 5;
    const lo = Math.min(prev.y, car.y) - band;
    const hi = Math.max(prev.y, car.y) + band;
    const now = new Set();
    course.lines.forEach((line, i) => {
      if (line.y < lo || line.y > hi) return;
      if (car.x + HALF_W <= line.x0 || car.x - HALF_W >= line.x1) return;
      now.add(i);
      if (touching.has(i)) return;
      if (line.color === 'red') {
        hurt(car.x, line.y);
      } else {
        repair(car.x, line.y);
        if (!state.passed.has(i)) {
          state.passed.add(i);
          addStars(1, car.x, line.y - 10);
        }
      }
    });
    touching = now;

    for (const cone of course.cones) {
      if (cone.cool > 0 || cone.z > 3) continue;
      if (Math.abs(cone.x - car.x) < 8 && Math.abs(cone.y - car.y) < 11) kickCone(cone, dx, dy);
    }
    for (const toilet of course.roadToilets) {
      if (toilet.broken) continue;
      if (Math.abs(car.x - toilet.x) >= HALF_W + TOILET_W / 2) continue;
      if (Math.abs(car.y - toilet.y) >= HALF_H + TOILET_H / 2) continue;
      smashToilet(toilet, dx, dy);
    }
  }

  // How deep the car at (x, y) is inside a box centred on (bx, by) with half
  // sizes hw and hh; 0 or less when it is outside.
  function depth(x, y, bx, by, hw, hh) {
    return Math.min(hw + HALF_W - Math.abs(x - bx), hh + HALF_H - Math.abs(y - by));
  }

  // --------------------------------------------------------------- presses
  // Up, then a warning, then it slams down, stays down a moment and rises.
  function pressPhase(press) {
    let t = (time + press.phase) % press.cycle;
    for (const [mode, length] of [['up', press.up], ['warn', PRESS.warn], ['slam', PRESS.slam], ['down', PRESS.down]]) {
      if (t < length) return { mode, k: t / length };
      t -= length;
    }
    return { mode: 'rise', k: Math.min(1, t / PRESS.rise) };
  }

  function updatePresses() {
    const camY = cameraY();
    for (const press of course.presses) {
      const { mode, k } = pressPhase(press);
      press.lift = mode === 'up' ? PRESS.lift
        : mode === 'warn' ? PRESS.lift - 3 * k // creeps down a little
        : mode === 'slam' ? (PRESS.lift - 3) * (1 - k) * (1 - k)
        : mode === 'down' ? 0
        : PRESS.lift * k * k * (3 - 2 * k);
      const onScreen = press.y - camY > -20 && press.y - camY < HEIGHT + 70;
      if (mode !== press.mode && onScreen) {
        if (mode === 'warn') audio.play('pressWarn');
        if (mode === 'down') audio.play('slam');
      }
      press.mode = mode;
    }
  }

  function checkPresses() {
    const { car } = state;
    for (const press of course.presses) {
      if (press.mode !== 'slam' && press.mode !== 'down') continue;
      if (press.lift >= PRESS.clear) continue;
      if (depth(car.x, car.y, press.cx, press.y, press.hw, PRESS.halfH) <= PRESS.forgive) continue;
      crushed = { t: PRESS.crushTime };
      car.stage = 0;
      car.vx = car.vy = 0;
      shake = 0.35;
      burst(car.x, car.y, ['#8a94a6', '#5c667a', '#ffffff', '#ffd34d'], 16, 50);
      audio.play('crush');
      return;
    }
  }

  // After being squashed: back to the start line, stars and used bars kept.
  function backToStart() {
    crushed = null;
    state.car = { x: WIDTH / 2, y: course.length - 18, stage: 0, vx: 0, vy: 0 };
    state.moved = false;
    touching = new Set();
    hurtCooldown = 0;
    intro = 1.6;
    audio.play('go');
    save();
  }

  // Porcelain shards fly everywhere (mostly the way the car drives), water
  // splashes, and a puddle stays for a few seconds.
  function smashToilet(toilet, mx, my) {
    toilet.broken = true;
    for (let i = 0; i < ROAD_TOILETS.shards; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      particles.push({
        x: toilet.x + (Math.random() - 0.5) * 10, y: toilet.y + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * speed + mx * 40, vy: Math.sin(a) * speed + my * 40,
        t: 1.4 + Math.random() * 0.8, drag: 2.5, shard: true, size: 1.6 + Math.random() * 2.2,
        angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 24, color: Math.random() < 0.8 ? '#ffffff' : '#eef2f7',
      });
    }
    burst(toilet.x, toilet.y, ['#9fd3ff', '#cfeaff', '#ffffff'], 14, 50, 0.6);
    particles.push({ x: toilet.x, y: toilet.y - 4, vx: 0, vy: 0, t: 0.3, twinkle: true, size: 9, color: '#ffffff' });
    course.puddles.push({ x: toilet.x, y: toilet.y + 2, age: 0 });
    shake = Math.max(shake, 0.12);
    audio.play('smash');
  }

  // Away from the car, mostly the way it drives, with a hop and a spin.
  function kickCone(cone, mx, my) {
    const { car } = state;
    const ax = cone.x - car.x, ay = cone.y - car.y;
    const al = Math.hypot(ax, ay) || 1;
    const kx = mx + (ax / al) * 0.8, ky = my + (ay / al) * 0.8;
    const kl = Math.hypot(kx, ky) || 1;
    const speed = KICK.speed * (0.85 + Math.random() * 0.3);
    cone.vx = (kx / kl) * speed;
    cone.vy = (ky / kl) * speed;
    cone.vz = KICK.hop * (0.8 + Math.random() * 0.4);
    cone.spin = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6);
    cone.moving = true;
    cone.cool = KICK.cooldown;
    burst(cone.x, cone.y, ['#ff8a4a', '#ffffff', '#d9dee6'], 8, 35, 0.4);
    particles.push({ x: cone.x, y: cone.y - 4, vx: 0, vy: 0, t: 0.25, twinkle: true, size: 5, color: '#ffffff' });
    audio.play('kick');
  }

  function updateCones(dt) {
    for (const cone of course.cones) {
      if (cone.cool > 0) cone.cool -= dt;
      if (!cone.moving) continue;
      cone.x += cone.vx * dt;
      cone.y += cone.vy * dt;
      const drag = Math.exp(-(cone.z > 0 ? KICK.airDrag : KICK.groundDrag) * dt);
      cone.vx *= drag;
      cone.vy *= drag;
      cone.vz -= KICK.gravity * dt;
      cone.z += cone.vz * dt;
      if (cone.z <= 0) {
        cone.z = 0;
        cone.vz = cone.vz < -25 ? -cone.vz * KICK.bounce : 0;
      }
      cone.angle += cone.spin * dt;
      cone.spin *= Math.exp(-(cone.z > 0 ? 0.5 : 4) * dt);
      if (cone.x < 4 || cone.x > WIDTH - 4) {
        cone.x = Math.min(Math.max(cone.x, 4), WIDTH - 4);
        cone.vx = -cone.vx * 0.5;
      }
      if (cone.z === 0 && cone.vz === 0 && Math.hypot(cone.vx, cone.vy) < 2) cone.moving = false;
    }
  }

  // ------------------------------------------------------------- toilets
  function bumpToilet(toilet) {
    if (toilet.dino) {
      if (toilet.startle <= 0) audio.play('eek');
      toilet.startle = TOILET.startle;
      return;
    }
    if (toilet.timer <= 0 && toilet.open < 0.2) {
      audio.play('lid');
      if (toilet.poo) audio.play('poo');
      else if (toilet.pee) audio.play('pee');
    }
    toilet.timer = TOILET.openTime; // stays open while the car keeps pushing
  }

  function updateToilets(dt) {
    for (const toilet of course.toilets) {
      if (toilet.startle > 0) toilet.startle -= dt;
      if (toilet.timer > 0) toilet.timer -= dt;
      const target = toilet.timer > 0 ? 1 : 0;
      const step = TOILET.lidSpeed * dt;
      toilet.open += Math.max(-step, Math.min(step, target - toilet.open));
    }
  }

  // ------------------------------------------------- T-Rexes and ambulances
  const between = ([lo, hi]) => lo + Math.random() * (hi - lo);
  const STANDING = ['wait', 'pause', 'hesitate'];
  const upright = (rex) => rex.state === 'walk' || rex.state === 'squat' || STANDING.includes(rex.state);

  // Is the car just in front of this T-Rex, in the way it is walking?
  function carAhead(rex) {
    const { car } = state;
    if (Math.abs(car.y - (rex.y - 13)) > HALF_H + DINO.hitH + 2) return false;
    const gap = (car.x - (rex.x + rex.facing * 3)) * rex.facing - (HALF_W + DINO.hitW);
    return gap > -(HALF_W + DINO.hitW) && gap < DINO.notice;
  }

  // Wait on the grass, cross to the other side, sometimes stop halfway and
  // look around, sometimes change its mind and walk back. A car in the way
  // makes it stop, turn around and hesitate.
  function updateRexes(dt) {
    for (const poo of course.grassPoos) poo.age += dt;
    for (const rex of course.rexes) {
      if (rex.state === 'squat') {
        rex.timer -= dt;
        if (!rex.pooped && rex.timer < DINO.squat * 0.45) { rex.pooped = true; dropPoo(rex); }
        if (rex.timer <= 0) { rex.state = 'wait'; rex.timer = between(DINO.wait); }
        continue;
      }
      if (rex.state === 'hesitate' && rex.turnIn > 0) {
        rex.turnIn -= dt;
        if (rex.turnIn <= 0) rex.facing = -rex.facing;
      }
      if (STANDING.includes(rex.state)) {
        rex.timer -= dt;
        if (rex.timer > 0) continue;
        if (rex.state === 'wait') rex.facing = rex.x < WIDTH / 2 ? 1 : -1; // to the other side
        else if (rex.state === 'pause' && Math.random() < DINO.turnBack) rex.facing = -rex.facing;
        rex.speed = rex.hurry ? DINO.hurrySpeed : between(DINO.speed);
        rex.targetY = rex.homeY + (Math.random() * 2 - 1) * DINO.wander;
        rex.state = 'walk';
      } else if (rex.state === 'walk') {
        if (carAhead(rex)) {
          rex.state = 'hesitate';
          rex.timer = between(DINO.hesitate);
          rex.turnIn = DINO.turnDelay;
          continue;
        }
        rex.x += rex.facing * rex.speed * dt;
        rex.y += (rex.targetY - rex.y) * Math.min(1, dt);
        rex.step += dt * rex.speed * 0.45;
        const goal = rex.facing > 0 ? DINO.grass.right : DINO.grass.left;
        const onRoad = rex.x > ROAD.x0 && rex.x < ROAD.x1;
        if ((goal - rex.x) * rex.facing <= 0) {
          rex.x = goal;
          if (rex.hurry) {
            rex.hurry = false;
            rex.state = 'squat';
            rex.timer = DINO.squat;
            rex.pooped = false;
          } else {
            rex.state = 'wait';
            rex.timer = between(DINO.wait);
          }
        } else if (onRoad && !rex.hurry && course.grassPoos.length < DINO.maxPoos && Math.random() < DINO.urge * dt) {
          rex.hurry = true;
          rex.facing = rex.x < WIDTH / 2 ? -1 : 1; // nearest grass
          rex.speed = DINO.hurrySpeed;
        } else if (onRoad && !rex.hurry && Math.random() < DINO.surprise * dt) {
          rex.state = 'pause';
          rex.timer = between(DINO.pause);
        }
      }
    }
  }

  // Behind it, just past the tip of its tail.
  function dropPoo(rex) {
    const poo = { x: rex.x - rex.facing * 15, y: rex.y + 3, age: 0, phase: Math.random() * 10 };
    course.grassPoos.push(poo);
    const y = poo.y - cameraY();
    if (y > -10 && y < HEIGHT + 10) audio.play('poo');
  }

  function checkRexBumps() {
    const { car } = state;
    for (const rex of course.rexes) {
      if (!upright(rex)) continue;
      if (Math.abs(car.x - (rex.x + rex.facing * 3)) > HALF_W + DINO.hitW) continue;
      if (Math.abs(car.y - (rex.y - 13)) > HALF_H + DINO.hitH) continue;
      rex.state = 'dazed';
      rex.hurry = false;
      burst(rex.x + rex.facing * 4, rex.y - 18, ['#4cb551', '#ffffff', '#ffd34d'], 10, 40);
      hurt(car.x, car.y - 6, 'bonk');
      // The ambulance comes from the side away from the car, so it does not
      // drive over it.
      callAmbulance(rex, car.y < rex.y - 13 ? 'below' : 'above');
    }
  }

  function callAmbulance(rex, from) {
    const camY = cameraY();
    const half = AMBULANCE_H / 2;
    const down = from === 'above';
    const stopY = down ? rex.y - 31 - half : rex.y + 2 + half;
    const y = down ? Math.min(camY - 30, stopY - 30) : Math.max(camY + HEIGHT + 30, stopY + 30);
    const x = Math.min(Math.max(rex.x + rex.facing * 3, ROAD.x0 + 9), ROAD.x1 - 9);
    const amb = { rex, x, y, stopY, heading: down ? Math.PI : 0, phase: 'arrive', t: 0, speed: 0 };
    rex.ambulance = amb;
    ambulances.push(amb);
  }

  // Drive up to the dizzy T-Rex, load it, turn around and drive away.
  function updateAmbulances(dt) {
    const camY = cameraY();
    for (const amb of ambulances) {
      amb.t += dt;
      if (amb.phase === 'arrive') {
        const dist = amb.stopY - amb.y;
        const v = Math.min(AMBULANCE.speed, 4 + Math.abs(dist) * 3); // slow down at the end
        amb.y += Math.sign(dist) * Math.min(Math.abs(dist), v * dt);
        if (Math.abs(amb.stopY - amb.y) < 0.2) {
          amb.y = amb.stopY;
          amb.phase = 'load'; amb.t = 0;
          amb.rex.state = 'loading';
        }
      } else if (amb.phase === 'load') {
        amb.rex.load = Math.min(1, amb.t / AMBULANCE.load);
        if (amb.t >= AMBULANCE.load) {
          amb.rex.state = 'gone';
          amb.phase = 'turn'; amb.t = 0; amb.turnFrom = amb.heading;
        }
      } else if (amb.phase === 'turn') {
        const k = Math.min(1, amb.t / AMBULANCE.turn);
        amb.heading = amb.turnFrom + Math.PI * k * k * (3 - 2 * k);
        if (k >= 1) { amb.phase = 'leave'; amb.t = 0; amb.speed = 20; }
      } else {
        amb.speed = Math.min(AMBULANCE.leaveSpeed, amb.speed + 100 * dt);
        amb.x += Math.sin(amb.heading) * amb.speed * dt;
        amb.y -= Math.cos(amb.heading) * amb.speed * dt;
      }
    }
    const offScreen = (amb) => Math.max(0, camY - amb.y, amb.y - camY - HEIGHT);
    ambulances = ambulances.filter((amb) => amb.phase !== 'leave' || (amb.t < 6 && offScreen(amb) < 60));
    // The siren fades out as the ambulance drives off the screen.
    audio.siren(Math.max(0, ...ambulances.map((amb) => 1 - offScreen(amb) / 150)));
  }

  // Nearest blue bar the car has not used yet, preferring ones ahead.
  function nextBlueBar() {
    const { car } = state;
    let best = null;
    course.lines.forEach((line, i) => {
      if (line.color !== 'blue') return;
      const ahead = line.y < car.y - 4;
      const dist = Math.abs(line.y - car.y) + (ahead ? 0 : 1000);
      if (!best || dist < best.dist) best = { line, i, dist, ahead };
    });
    return best;
  }

  function update(dt) {
    time += dt;
    if (hurtCooldown > 0) hurtCooldown -= dt;
    if (intro > 0) intro -= dt;

    if (banner) {
      banner.t -= dt;
      if (Math.random() < 0.4) burst(WIDTH / 2 + (Math.random() - 0.5) * 80, HEIGHT / 2 + (Math.random() - 0.5) * 40, PAL.confetti, 4, 25);
      if (banner.t <= 0) banner = null;
      audio.engine(0, state.car.stage);
      state.car.vx = state.car.vy = 0;
    } else if (finish) {
      finish.t -= dt;
      audio.engine(0, state.car.stage);
      state.car.vx = state.car.vy = 0;
      if (Math.random() < 0.5) {
        burst(LOT.x0 + Math.random() * (LOT.x1 - LOT.x0), LOT.y0 + Math.random() * 44, PAL.confetti, 5, 30, 0.9);
      }
      if (finish.t < 0.6) fade = Math.min(1, fade + dt * 2);
      if (finish.t <= 0) startLevel(state.level + 1);
    } else if (crushed) {
      crushed.t -= dt;
      audio.engine(0, state.car.stage);
      if (crushed.t < 0.5) fade = Math.min(1, fade + dt * 2.5);
      if (crushed.t <= 0) backToStart();
    } else {
      if (fade > 0) fade = Math.max(0, fade - dt * 2);
      moveCar(dt);
      checkPresses();
      checkRexBumps();
      if (input.justPressed('action') || input.justPressed('enter')) tryPark();
    }
    updatePresses();
    updateCones(dt);
    updateToilets(dt);
    updateRexes(dt);
    updateAmbulances(dt);

    // Smoke from a broken car, twinkles from a shiny one.
    smokeTimer -= dt;
    if (smokeTimer <= 0 && !finish && !banner) {
      const { car } = state;
      if (car.stage === 0) {
        smokeTimer = 0.14;
        particles.push({
          x: car.x - 2 + Math.random() * 4, y: car.y + HALF_H, vx: (Math.random() - 0.5) * 8, vy: 12 + Math.random() * 10,
          t: 0.9, smoke: true, size: 2, color: 'rgba(150,158,172,0.75)',
        });
      } else if (car.stage === 2) {
        smokeTimer = 0.3;
        particles.push({
          x: car.x - 7 + Math.random() * 14, y: car.y - 10 + Math.random() * 20, vx: 0, vy: -5,
          t: 0.45, twinkle: true, size: 1.5, color: '#ffffff',
        });
      } else {
        smokeTimer = 0.2;
      }
    }

    if (feedback) {
      feedback.t -= dt;
      feedback.y -= 8 * dt;
      if (feedback.t <= 0) feedback = null;
    }
    particles = particles.filter((p) => (p.t -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.gravity) p.vy += 30 * dt;
      if (p.smoke) p.size += 5 * dt;
      if (p.drag) {
        const f = Math.exp(-p.drag * dt);
        p.vx *= f; p.vy *= f; p.spin *= f;
      }
      if (p.spin) p.angle += p.spin * dt;
    }
    for (const puddle of course.puddles) puddle.age += dt;
    course.puddles = course.puddles.filter((puddle) => puddle.age < ROAD_TOILETS.puddle);
    if (shake > 0) shake -= dt;

    saveTimer += dt;
    if (saveTimer > 2) { saveTimer = 0; save(); }
  }

  function cameraY() {
    return Math.min(Math.max(state.car.y - HEIGHT * 0.65, 0), course.length - HEIGHT);
  }

  // ------------------------------------------------------------- drawing
  function drawGround(ctx, camY) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const t of course.tufts) {
      const y = t.y - camY;
      if (y < -10 || y > HEIGHT + 10) continue;
      ctx.fillStyle = PAL.grassLight;
      ctx.beginPath(); ctx.ellipse(t.x, y, t.r, t.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const f of course.flowers) {
      const y = f.y - camY;
      if (y < -3 || y > HEIGHT + 3) continue;
      drawFlower(ctx, f.x, y, f.c);
    }
    // Road with curbs.
    ctx.fillStyle = PAL.curbDark;
    ctx.fillRect(ROAD.x0 - 4, 0, ROAD.x1 - ROAD.x0 + 8, HEIGHT);
    ctx.fillStyle = PAL.curb;
    ctx.fillRect(ROAD.x0 - 3, 0, ROAD.x1 - ROAD.x0 + 6, HEIGHT);
    ctx.fillStyle = PAL.road;
    ctx.fillRect(ROAD.x0, 0, ROAD.x1 - ROAD.x0, HEIGHT);
    // Subtle asphalt patches that scroll with the world.
    ctx.fillStyle = PAL.roadLight;
    const y0 = Math.floor(camY / 24) * 24;
    for (let y = y0; y < camY + HEIGHT + 24; y += 24) {
      const k = (y / 24) | 0;
      const px = ROAD.x0 + ((k * 53) % (ROAD.x1 - ROAD.x0 - 30));
      ctx.beginPath(); ctx.ellipse(px + 15, y - camY + 8, 14, 4, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    // Start line.
    const sy = course.length - 34 - camY;
    if (sy > -6 && sy < HEIGHT + 6) {
      for (let x = ROAD.x0; x < ROAD.x1; x += 6) {
        ctx.fillStyle = PAL.lotLine;
        ctx.fillRect(x, sy, 3, 3);
        ctx.fillRect(x + 3, sy + 3, 3, 3);
      }
    }
  }

  function drawLot(ctx, camY) {
    const y0 = LOT.y0 - camY;
    const h = LOT.y1 - LOT.y0;
    if (y0 > HEIGHT) return;
    ctx.fillStyle = PAL.shadow;
    roundRect(ctx, LOT.x0 - 1, y0 + 1, LOT.x1 - LOT.x0 + 4, h + 2, 4); ctx.fill();
    roundRect(ctx, LOT.x0 - 2, y0 - 2, LOT.x1 - LOT.x0 + 4, h + 2, 4);
    fillStroke(ctx, PAL.lot, INK, 0.8);
    const w = (LOT.x1 - LOT.x0) / LOT.spaces;
    ctx.fillStyle = PAL.lotLine;
    for (let i = 1; i < LOT.spaces; i++) ctx.fillRect(LOT.x0 + i * w - 0.6, y0 + 2, 1.2, h - 8);
    for (let i = 0; i < LOT.spaces; i++) {
      // A faint car outline marks the free space; the others have a toilet.
      if (i !== course.freeSpace) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.6;
      ctx.setLineDash([1.5, 1.5]);
      roundRect(ctx, LOT.x0 + i * w + w / 2 - 6, y0 + 8, 12, 22, 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // P sign on a post above the lot.
    circle(ctx, WIDTH / 2, y0 - 9, 7);
    fillStroke(ctx, '#2f6fe0', INK, 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Arial Rounded MT Bold", "Nunito", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', WIDTH / 2, y0 - 8.6);

    for (const toilet of course.toilets) {
      const y = toilet.y - camY;
      if (toilet.dino) drawToiletDino(ctx, toilet, y);
      else drawToilet(ctx, toilet.x, y, { open: toilet.open, poo: toilet.poo, pee: toilet.pee, time });
    }
  }

  function drawRexes(ctx, camY) {
    const { car } = state;
    for (const rex of course.rexes) {
      if (rex.state === 'gone') continue;
      // While loading it slides into the ambulance, shrinking and fading.
      const k = rex.state === 'loading' ? rex.load : 0;
      const amb = rex.ambulance;
      const x = k ? rex.x + (amb.x - rex.x) * k : rex.x;
      const y = (k ? rex.y + (amb.y + 6 - rex.y) * k : rex.y) - camY;
      if (y < -5 || y > HEIGHT + 40) continue;
      const dazed = !upright(rex);
      const squat = rex.state === 'squat';
      ctx.save();
      ctx.translate(x + (squat ? Math.sin(time * 40) * 0.3 : 0), y); // squats trembling
      if (dazed) ctx.rotate(Math.sin(time * 5) * 0.12);
      ctx.scale(1 - 0.6 * k, 1 - 0.6 * k);
      ctx.globalAlpha = 1 - k * k;
      drawTrex(ctx, 0, 0, {
        facing: rex.facing, time: time + rex.bobPhase,
        pose: squat ? 'squat' : 'stand',
        eyes: dazed ? 'dazed' : squat ? 'squint' : 'open',
        step: rex.state === 'walk' ? rex.step : null,
        lookAt: { x: car.x - x, y: car.y - camY - y }, // the eyes follow the car
      });
      ctx.restore();
      if (rex.hurry || squat) {
        // Sweat drops while it hurries to the grass.
        const t = (time * 2 + rex.bobPhase) % 1;
        ctx.globalAlpha = 1 - t;
        drawDrop(ctx, x - rex.facing * (1 + t * 3), y - 32 + t * 4, 1.1);
        ctx.globalAlpha = 1;
      }
      if (rex.state === 'dazed') {
        // Dizzy stars circling over its head.
        for (let i = 0; i < 3; i++) {
          const a = time * 4 + (i * Math.PI * 2) / 3;
          drawStar(ctx, x + rex.facing * 11 + Math.cos(a) * 7, y - 35 + Math.sin(a) * 2.2, 2);
        }
      }
    }
  }

  function drawGrassPoos(ctx, camY) {
    for (const poo of course.grassPoos) {
      const y = poo.y - camY;
      if (y < -20 || y > HEIGHT + 5) continue;
      const k = Math.min(1, poo.age * 3);
      const scale = 0.7 * k * (1 + 0.35 * Math.sin(k * Math.PI)); // pops up
      drawPoo(ctx, poo.x, y, scale, time + poo.phase);
      drawStink(ctx, poo.x, y - 8, { alpha: 0.6 * k, time: time + poo.phase, size: 0.7 });
    }
  }

  // Seen from the side: the tail behind the toilet, the T-Rex on the seat.
  function drawToiletDino(ctx, toilet, y) {
    const { dino } = toilet;
    const { car } = state;
    const s = TOILET.dinoScale;
    const startled = toilet.startle > 0;
    const hop = startled ? Math.abs(Math.sin(toilet.startle * 12)) * 3 : 0;
    const floor = y + 10;
    ctx.save();
    ctx.translate(toilet.x, floor);
    ctx.scale(s, s);
    const t = time + dino.phase;
    const eyes = startled ? 'wide' : t % 4 < 1 ? 'squint' : 'open'; // pushing now and then
    const lookAt = { x: (car.x - toilet.x) / s, y: (car.y - toilet.y - 10) / s }; // in the scaled coordinates
    const opts = { facing: dino.facing, pose: 'sit', time: t, eyes, lookAt };
    drawTrex(ctx, 0, -TOILET_SEAT - hop, { ...opts, parts: 'tail' });
    drawToiletSide(ctx, 0, 0, { facing: dino.facing });
    drawTrex(ctx, 0, -TOILET_SEAT - hop, { ...opts, parts: 'body' });
    if (startled) {
      ctx.globalAlpha = Math.min(1, toilet.startle * 3);
      drawDrop(ctx, -dino.facing * 4, -38 - hop, 1.4);
      drawDrop(ctx, dino.facing * 22, -36 - hop, 1.2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawAmbulances(ctx, camY) {
    for (const amb of ambulances) {
      const y = amb.y - camY;
      if (y < -20 || y > HEIGHT + 20) continue;
      drawAmbulance(ctx, amb.x, y, { heading: amb.heading, time });
    }
  }

  function drawFeedback(ctx, camY) {
    if (!feedback) return;
    const y = feedback.y - camY - 16;
    const pop = Math.min(1, (0.9 - feedback.t) * 6 + 0.4);
    if (feedback.kind === 'check') drawCheck(ctx, feedback.x, y, (feedback.big ? 5 : 3) * pop);
    else if (feedback.kind === 'cross') drawCross(ctx, feedback.x, y, 3 * pop);
    else if (feedback.kind === 'arrow') drawArrow(ctx, feedback.x, y - 2, 'up', '#ffffff', 3.5);
  }

  function drawHint(ctx, camY) {
    const { car } = state;
    if (car.stage > 0 || finish) return;
    const target = nextBlueBar();
    if (!target) return;
    const { line } = target;
    const bob = Math.sin(time * 5) * 2;
    const x = (line.x0 + line.x1) / 2;
    const y = line.y - camY;
    if (y < 16) return; // under the HUD, the arrow would just clutter
    drawArrow(ctx, x, y - 6 + bob, 'down', '#4fa8ff', 4);
    drawWrench(ctx, x, y - 20 + bob, 3.2, '#ffffff');
  }

  function drawHud(ctx) {
    ctx.fillStyle = PAL.hud;
    roundRect(ctx, 4, 3, 54, 12, 6); ctx.fill();
    roundRect(ctx, WIDTH / 2 - 26, 3, 52, 12, 6); ctx.fill();
    roundRect(ctx, WIDTH - 52, 3, 34, 12, 6); ctx.fill();
    circle(ctx, SOUND_BUTTON.x, SOUND_BUTTON.y, SOUND_BUTTON.r); ctx.fill();

    // Stars.
    drawStar(ctx, 12, 9, 4.2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px "Arial Rounded MT Bold", "Nunito", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(state.stars), 19, 9.4);
    // Progress to the next upgrade as a small bar.
    const next = UPGRADES.find((u) => state.stars < u.stars);
    if (next) {
      const prevStars = UPGRADES[UPGRADES.indexOf(next) - 1]?.stars ?? 0;
      const frac = (state.stars - prevStars) / (next.stars - prevStars);
      roundRect(ctx, 36, 7.2, 18, 3.6, 1.8); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      roundRect(ctx, 36, 7.2, Math.max(2, 18 * frac), 3.6, 1.8); ctx.fillStyle = '#ffd34d'; ctx.fill();
    } else {
      drawStar(ctx, 46, 9, 3, '#ffd34d');
    }

    // Car condition: three dots filling up, red to green to gold.
    const { stage } = state.car;
    const colors = ['#ff5a6e', '#3ddc84', '#ffd34d'];
    drawWrench(ctx, WIDTH / 2 - 17, 9, 3.2, colors[stage]);
    for (let i = 0; i < STAGES; i++) {
      circle(ctx, WIDTH / 2 - 6 + i * 8, 9, 2.6);
      fillStroke(ctx, i <= stage ? colors[stage] : 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)', 0.4);
    }
    if (stage === 0) drawCross(ctx, WIDTH / 2 + 17, 9, 2.2);
    else drawCheck(ctx, WIDTH / 2 + 17, 9, 2.4, colors[stage]);

    // Level flag.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(WIDTH - 46, 4.5, 1, 9);
    ctx.beginPath(); ctx.moveTo(WIDTH - 45, 4.5); ctx.lineTo(WIDTH - 38, 7); ctx.lineTo(WIDTH - 45, 9.5); ctx.closePath();
    ctx.fillStyle = '#3ddc84'; ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(String(state.level), WIDTH - 34, 9.4);

    // Sound on/off: click it, or press M.
    drawSpeaker(ctx, SOUND_BUTTON.x - 0.4, SOUND_BUTTON.y, !audio.muted);
  }

  // The park button on touch screens: only near the lot, lit up when parking
  // would work. Same distance as the nudge in tryPark.
  function parkButton() {
    if (finish || banner || crushed || state.car.y >= LOT.y1 + 30) return 'hidden';
    return parkableSpace() ? 'ready' : 'shown';
  }

  // A click or touch on the canvas, in world units.
  function tap(x, y) {
    const { x: bx, y: by, r } = SOUND_BUTTON;
    if (Math.hypot(x - bx, y - by) <= r + 3) audio.toggleMute();
  }

  function drawIntro(ctx) {
    if (intro <= 0) return;
    const a = Math.min(1, intro * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = PAL.hud;
    roundRect(ctx, WIDTH / 2 - 26, HEIGHT / 2 - 14, 52, 28, 8); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(WIDTH / 2 - 16, HEIGHT / 2 - 8, 1.5, 16);
    ctx.beginPath(); ctx.moveTo(WIDTH / 2 - 14.5, HEIGHT / 2 - 8); ctx.lineTo(WIDTH / 2 - 3, HEIGHT / 2 - 3.5); ctx.lineTo(WIDTH / 2 - 14.5, HEIGHT / 2 + 1); ctx.closePath();
    ctx.fillStyle = '#3ddc84'; ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Arial Rounded MT Bold", "Nunito", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(state.level), WIDTH / 2 + 2, HEIGHT / 2 + 0.5);
    ctx.restore();
  }

  function drawBanner(ctx) {
    if (!banner) return;
    const a = Math.min(1, banner.t * 2, (3 - banner.t) * 3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,24,40,0.55)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    roundRect(ctx, WIDTH / 2 - 44, HEIGHT / 2 - 40, 88, 80, 10);
    fillStroke(ctx, '#ffffff', INK, 1);
    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2 + 2);
    ctx.scale(2.6, 2.6);
    drawCar(ctx, 0, 0, { stage: 2, upgrades: upgrades(), time });
    ctx.restore();
    const tw = (Math.sin(time * 8) + 1) / 2;
    drawStar(ctx, WIDTH / 2 - 32, HEIGHT / 2 - 28, 5 + tw * 1.5);
    drawStar(ctx, WIDTH / 2 + 32, HEIGHT / 2 - 28, 5 + (1 - tw) * 1.5);
    drawTwinkle(ctx, WIDTH / 2 + 30, HEIGHT / 2 + 26, 3 + tw * 2, '#ffd34d');
    drawTwinkle(ctx, WIDTH / 2 - 30, HEIGHT / 2 + 20, 2 + (1 - tw) * 2, '#ffd34d');
    ctx.restore();
  }

  function draw(r) {
    const { ctx } = r;
    const camY = cameraY();
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);

    drawGround(ctx, camY);
    drawLot(ctx, camY);
    course.lines.forEach((line, i) => {
      const y = line.y - camY;
      if (y < -8 || y > HEIGHT + 8) return;
      const kind = line.color === 'red' ? 'red' : state.passed.has(i) ? 'passed' : 'blue';
      drawBar(ctx, line.x0, line.x1, y, kind, time);
    });
    for (const press of course.presses) {
      const y = press.y - camY;
      if (y < -20 || y > HEIGHT + 20) continue;
      drawPressFloor(ctx, press.x0, press.x1, y, { shadow: 0.15 + 0.35 * (1 - press.lift / PRESS.lift) });
    }
    for (const puddle of course.puddles) {
      const y = puddle.y - camY;
      ctx.fillStyle = `rgba(159,211,255,${0.55 * Math.min(1, (ROAD_TOILETS.puddle - puddle.age) / 1.5)})`;
      ctx.beginPath(); ctx.ellipse(puddle.x, y, 11, 6, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    for (const toilet of course.roadToilets) {
      const y = toilet.y - camY;
      if (toilet.broken || y < -15 || y > HEIGHT + 15) continue;
      ctx.save();
      ctx.translate(toilet.x, y);
      ctx.rotate(toilet.angle);
      drawToilet(ctx, 0, 0, { time });
      ctx.restore();
    }
    for (const cone of course.cones) {
      const y = cone.y - camY;
      if (y < -10 || y > HEIGHT + 10) continue;
      drawCone(ctx, cone.x, y, { angle: cone.angle, lift: cone.z });
    }
    drawGrassPoos(ctx, camY);
    drawRexes(ctx, camY);

    // Particles below the car (smoke), car, particles above (stars, confetti).
    for (const p of particles) {
      if (!p.smoke) continue;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.t);
      circle(ctx, p.x, p.y - camY, p.size); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const { car } = state;
    const wobble = car.stage === 0 && state.moved && !finish && Math.hypot(car.vx ?? 0, car.vy ?? 0) > 1 ? Math.sin(time * 28) * 0.5 : 0;
    if (crushed) {
      // Squashed flat, with dizzy stars.
      ctx.save();
      ctx.translate(car.x, car.y - camY);
      ctx.scale(1.45, 0.4);
      drawCar(ctx, 0, 0, { stage: 0, upgrades: upgrades(), time });
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const a = time * 4 + (i * Math.PI * 2) / 3;
        drawStar(ctx, car.x + Math.cos(a) * 9, car.y - camY - 7 + Math.sin(a) * 2.5, 2);
      }
    }
    for (const press of course.presses) {
      const y = press.y - camY;
      if (y < -20 || y > HEIGHT + 70) continue;
      const lights = press.mode === 'warn' ? Math.floor(time * 8) % 2 === 0 : press.mode === 'slam' || press.mode === 'down';
      const tremble = press.mode === 'warn' ? Math.sin(time * 50) * 0.5 : 0;
      drawPress(ctx, press.x0, press.x1, y, { lift: press.lift, lights, tremble });
    }
    // Over the press, so the car never disappears behind the raised block;
    // only a squashed car lies under it.
    if (!crushed) drawCar(ctx, car.x, car.y - camY, { stage: car.stage, upgrades: upgrades(), time, wobble });
    drawAmbulances(ctx, camY);

    for (const t of course.trees) {
      const y = t.y - camY;
      if (y < -12 || y > HEIGHT + 12) continue;
      drawTree(ctx, t.x, y, t.r);
    }

    for (const p of particles) {
      if (p.smoke) continue;
      const y = p.y - camY;
      if (p.star) drawStar(ctx, p.x, y, p.size * Math.min(1, p.t * 2 + 0.3));
      else if (p.twinkle) drawTwinkle(ctx, p.x, y, p.size * Math.min(1, p.t * 3), p.color);
      else if (p.shard) drawShard(ctx, p.x, y, p.size, p.angle, p.color, Math.min(1, p.t * 2.5));
      else { ctx.fillStyle = p.color; circle(ctx, p.x, y, p.size * Math.min(1, p.t * 2)); ctx.fill(); }
    }

    if (!state.moved && !finish && intro <= 0) {
      const bob = Math.sin(time * 5) * 2;
      drawArrow(ctx, car.x, car.y - camY - 16 + bob, 'up', '#ffffff', 4);
    }
    drawHint(ctx, camY);
    drawFeedback(ctx, camY);
    drawHud(ctx);
    drawIntro(ctx);
    drawBanner(ctx);
    if (fade > 0) { ctx.fillStyle = `rgba(20,24,40,${fade})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    ctx.restore();
  }

  return { update, draw, tap, parkButton };
}
