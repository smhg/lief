// The town: drive around, park, and visit service centres.
// Blue sign = this centre needs you, go repair/service there.
// Red sign  = closed, do not service there.
import { input } from '../input.js';
import { WIDTH, HEIGHT } from '../renderer.js';
import { COLORS, CAR, STAR, CHECK, CROSS, WRENCH } from '../sprites.js';
import {
  TILE, MAP, COLS, ROWS, BUILDINGS,
  tileAt, tileAtPixel, isDrivable, isEntrance, buildingForEntrance, roadLineDirection,
} from '../map.js';
import { loadSave, writeSave } from '../save.js';

const SPEED = 48;        // pixels per second
const CENTERING = 30;    // how fast the car drifts to the middle of the lane
const HALF = 4;          // half the collision box
const DIRS = [            // 0 up, 1 right, 2 down, 3 left (matches quarterTurns)
  { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
];
const ROOF = { G: COLORS.roofGarage, W: COLORS.roofWash, T: COLORS.roofTires, F: COLORS.roofFuel };

function buildingRects() {
  const rects = {};
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = MAP[row][col];
      if (!BUILDINGS[ch]) continue;
      const r = rects[ch] || (rects[ch] = { x0: col, y0: row, x1: col, y1: row });
      r.x0 = Math.min(r.x0, col); r.y0 = Math.min(r.y0, row);
      r.x1 = Math.max(r.x1, col); r.y1 = Math.max(r.y1, row);
    }
  }
  return rects;
}

function freshState() {
  return {
    car: { x: 4 * TILE + 8, y: 2 * TILE + 8, dir: 1 },
    stars: 0,
    // Two centres are open (blue) at a time; the others are closed (red).
    signs: { G: 'blue', W: 'red', T: 'blue', F: 'red' },
    parkedSpots: [],
  };
}

export function createTownScene() {
  const rects = buildingRects();
  const saved = loadSave('lief-town');
  const state = saved ? { ...freshState(), ...saved } : freshState();

  let feedback = null;      // { sprite, x, y, t }
  let particles = [];
  let shake = 0;
  let saveTimer = 0;

  function save() {
    writeSave({
      car: state.car,
      stars: state.stars,
      signs: state.signs,
      parkedSpots: state.parkedSpots,
    }, 'lief-town');
  }
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  function boxFree(x, y) {
    return isDrivable(tileAtPixel(x - HALF, y - HALF))
      && isDrivable(tileAtPixel(x + HALF - 1, y - HALF))
      && isDrivable(tileAtPixel(x - HALF, y + HALF - 1))
      && isDrivable(tileAtPixel(x + HALF - 1, y + HALF - 1));
  }

  function burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      particles.push({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, t: 0.5, color });
    }
  }

  function good(x, y) {
    state.stars += 1;
    feedback = { sprite: CHECK, x, y, t: 0.8 };
    burst(x, y, COLORS.star);
    save();
  }

  function bad(x, y) {
    feedback = { sprite: CROSS, x, y, t: 0.8 };
    shake = 0.3;
  }

  function reopenAnotherCentre(except) {
    const closed = Object.keys(state.signs).filter((k) => k !== except && state.signs[k] === 'red');
    if (closed.length) state.signs[closed[Math.floor(Math.random() * closed.length)]] = 'blue';
  }

  function doAction() {
    const { car } = state;
    const col = Math.floor(car.x / TILE);
    const row = Math.floor(car.y / TILE);
    const ch = tileAt(col, row);
    if (isEntrance(ch)) {
      const b = buildingForEntrance(ch);
      if (state.signs[b] === 'blue') {
        state.signs[b] = 'red';
        reopenAnotherCentre(b);
        good(car.x, car.y);
      } else {
        bad(car.x, car.y);
      }
    } else if (ch === 'P') {
      const key = `${col},${row}`;
      if (!state.parkedSpots.includes(key)) {
        state.parkedSpots.push(key);
        good(car.x, car.y);
      } else {
        feedback = { sprite: CHECK, x: car.x, y: car.y, t: 0.5 };
      }
    }
  }

  function moveCar(dt) {
    const { car } = state;
    let dir = -1;
    if (input.isDown('up')) dir = 0;
    else if (input.isDown('right')) dir = 1;
    else if (input.isDown('down')) dir = 2;
    else if (input.isDown('left')) dir = 3;
    if (dir === -1) return;

    car.dir = dir;
    const { dx, dy } = DIRS[dir];
    const step = SPEED * dt;

    // Drift toward the middle of the lane so turning into a street is forgiving.
    if (dx !== 0) {
      const target = Math.floor(car.y / TILE) * TILE + TILE / 2;
      const ny = car.y + Math.sign(target - car.y) * Math.min(Math.abs(target - car.y), CENTERING * dt);
      if (boxFree(car.x, ny)) car.y = ny;
    } else {
      const target = Math.floor(car.x / TILE) * TILE + TILE / 2;
      const nx = car.x + Math.sign(target - car.x) * Math.min(Math.abs(target - car.x), CENTERING * dt);
      if (boxFree(nx, car.y)) car.x = nx;
    }

    const nx = car.x + dx * step;
    const ny = car.y + dy * step;
    if (boxFree(nx, ny)) {
      car.x = nx;
      car.y = ny;
    }
  }

  function update(dt) {
    moveCar(dt);
    if (input.justPressed('action') || input.justPressed('enter')) doAction();

    if (feedback) {
      feedback.t -= dt;
      feedback.y -= 10 * dt;
      if (feedback.t <= 0) feedback = null;
    }
    particles = particles.filter((p) => (p.t -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (shake > 0) shake -= dt;

    saveTimer += dt;
    if (saveTimer > 2) { saveTimer = 0; save(); }
  }

  function drawTile(r, col, row) {
    const ch = MAP[row][col];
    const x = col * TILE;
    const y = row * TILE;
    if (ch === '.') {
      r.rect(x, y, TILE, TILE, COLORS.grass);
      if ((col + row) % 2 === 0) r.rect(x + 6, y + 9, 2, 2, COLORS.grassDark);
      else r.rect(x + 10, y + 4, 2, 2, COLORS.grassDark);
      return;
    }
    if (BUILDINGS[ch]) {
      r.rect(x, y, TILE, TILE, ROOF[ch]);
      return;
    }
    if (ch === 'P') {
      const done = state.parkedSpots.includes(`${col},${row}`);
      r.rect(x, y, TILE, TILE, COLORS.parking);
      r.rect(x, y, 1, TILE, COLORS.roadLine);
      r.rect(x + TILE - 1, y, 1, TILE, COLORS.roadLine);
      r.rect(x, y, TILE, 1, COLORS.roadLine);
      if (done) r.sprite(STAR, x + 5, y + 5);
      return;
    }
    // Streets and entrances.
    r.rect(x, y, TILE, TILE, COLORS.road);
    if (isEntrance(ch)) {
      const b = buildingForEntrance(ch);
      const color = state.signs[b] === 'blue' ? COLORS.blue : COLORS.red;
      const buildingAbove = tileAt(col, row - 1) === b;
      // A coloured mat at the door, plus the sign on the building wall.
      r.rect(x + 2, buildingAbove ? y : y + TILE - 3, TILE - 4, 3, color);
      r.rect(x + 3, buildingAbove ? y - 5 : y + TILE + 1, TILE - 6, 4, color);
      return;
    }
    const line = roadLineDirection(col, row);
    if (line === 'h') { r.rect(x + 1, y + 7, 5, 2, COLORS.roadLine); r.rect(x + 10, y + 7, 5, 2, COLORS.roadLine); }
    if (line === 'v') { r.rect(x + 7, y + 1, 2, 5, COLORS.roadLine); r.rect(x + 7, y + 10, 2, 5, COLORS.roadLine); }
  }

  function drawBuildings(r) {
    for (const [b, rect] of Object.entries(rects)) {
      const x = rect.x0 * TILE, y = rect.y0 * TILE;
      const w = (rect.x1 - rect.x0 + 1) * TILE, h = (rect.y1 - rect.y0 + 1) * TILE;
      r.rect(x, y, w, 1, COLORS.outline); r.rect(x, y + h - 1, w, 1, COLORS.outline);
      r.rect(x, y, 1, h, COLORS.outline); r.rect(x + w - 1, y, 1, h, COLORS.outline);
      if (b === 'G') r.sprite(WRENCH, x + w / 2 - 3, y + h / 2 - 3);
      else r.text(b, x + w / 2 - 2, y + h / 2 - 4, COLORS.white);
    }
  }

  function drawHud(r) {
    r.rect(72, 2, 112, 10, 'rgba(26,28,44,0.7)');
    const shown = Math.min(state.stars, 10);
    for (let i = 0; i < shown; i++) r.sprite(STAR, 76 + i * 7, 4);
    if (state.stars > 10) r.text(`+${state.stars - 10}`, 76 + shown * 7 + 2, 3);
  }

  function draw(r) {
    const { ctx } = r;
    ctx.save();
    if (shake > 0) ctx.translate(Math.round(Math.random() * 2 - 1), Math.round(Math.random() * 2 - 1));
    r.clear(COLORS.grass);
    // Entrances draw their wall sign over neighbouring tiles, so draw them last.
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (!isEntrance(MAP[row][col])) drawTile(r, col, row);
    }
    drawBuildings(r);
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (isEntrance(MAP[row][col])) drawTile(r, col, row);
    }

    const { car } = state;
    r.sprite(CAR, car.x - CAR.w / 2, car.y - CAR.h / 2, { quarterTurns: car.dir });

    for (const p of particles) r.rect(p.x, p.y, 1, 1, p.color);
    if (feedback) r.sprite(feedback.sprite, feedback.x - 3, feedback.y - 14);
    drawHud(r);
    ctx.restore();
  }

  return { update, draw, width: WIDTH, height: HEIGHT };
}
