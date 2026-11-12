// Vector drawing of everything in the course: a smooth cartoon look where the
// car's condition (broken, repaired, shiny) and its upgrades are easy to read.

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export function fillStroke(ctx, fill, stroke, width = 0.6) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export const INK = '#20243a';

// ---------------------------------------------------------------- the car
// Centered on (0, 0), facing up, about 12 wide and 20 tall.
export const CAR_W = 12;
export const CAR_H = 20;

const BODY = ['#6b7fa3', '#3b6fe0', '#3f86ff']; // broken (dull), repaired, shiny
const BODY_DARK = ['#4b5a78', '#2a52b0', '#2f67d6'];

export function drawCar(ctx, x, y, { stage = 1, upgrades = {}, time = 0, wobble = 0 } = {}) {
  ctx.save();
  ctx.translate(x + wobble, y);

  // Shadow.
  roundRect(ctx, -5.5 + 0.8, -10 + 1.2, 11, 20, 3);
  ctx.fillStyle = 'rgba(20,24,40,0.3)';
  ctx.fill();

  // Wheels.
  const rim = upgrades.goldRims ? '#f5c542' : '#aab4c4';
  for (const [wx, wy] of [[-6.3, -5.5], [6.3, -5.5], [-6.3, 5.5], [6.3, 5.5]]) {
    roundRect(ctx, wx - 1.3, wy - 2.2, 2.6, 4.4, 1);
    fillStroke(ctx, '#2b2f3d', INK, 0.4);
    ctx.fillStyle = rim;
    ctx.fillRect(wx - 0.5, wy - 1, 1, 2);
  }

  // Spoiler sits under the body outline at the back.
  if (upgrades.spoiler) {
    roundRect(ctx, -6.5, 8.6, 13, 2.4, 1);
    fillStroke(ctx, '#2b2f3d', INK, 0.4);
  }

  // Body.
  roundRect(ctx, -5.5, -10, 11, 20, 3.2);
  fillStroke(ctx, BODY[stage], INK, 0.7);
  // Hood and trunk shading.
  roundRect(ctx, -4.5, -9, 9, 4.2, 2);
  ctx.fillStyle = BODY_DARK[stage];
  ctx.globalAlpha = 0.35;
  ctx.fill();
  roundRect(ctx, -4.5, 6, 9, 3, 1.5);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Racing stripes.
  if (upgrades.stripes) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-1.6, -9.5, 1, 19);
    ctx.fillRect(0.6, -9.5, 1, 19);
  }

  // Windscreen, roof, rear window.
  const glass = ctx.createLinearGradient(0, -5, 0, -1);
  glass.addColorStop(0, '#d8f1fb');
  glass.addColorStop(1, '#79b6d6');
  roundRect(ctx, -4.2, -5, 8.4, 3.6, 1.2);
  fillStroke(ctx, glass, INK, 0.45);
  roundRect(ctx, -4.6, -1.6, 9.2, 5.2, 1.4);
  fillStroke(ctx, BODY_DARK[stage], INK, 0.45);
  roundRect(ctx, -4, 3.6, 8, 2.4, 1);
  fillStroke(ctx, '#79b6d6', INK, 0.45);

  // Lights: headlights at the front, tail lights at the back.
  const headL = stage === 0 ? '#6b6f7a' : '#fff1a8';
  for (const [lx, color] of [[-3.3, headL], [3.3, '#fff1a8']]) {
    circle(ctx, lx, -8.9, 1);
    fillStroke(ctx, color, INK, 0.3);
  }
  for (const lx of [-3.3, 3.3]) {
    roundRect(ctx, lx - 1.2, 8.3, 2.4, 1, 0.5);
    fillStroke(ctx, '#ff5a5a', INK, 0.3);
  }

  // Roof light.
  if (upgrades.roofLight) {
    const blink = Math.sin(time * 8) > 0;
    circle(ctx, 0, 0.8, 1.3);
    fillStroke(ctx, blink ? '#ffb347' : '#ff7b3a', INK, 0.3);
    if (blink) {
      circle(ctx, 0, 0.8, 2.6);
      ctx.fillStyle = 'rgba(255,180,70,0.35)';
      ctx.fill();
    }
  }

  // Broken: dents, dirt, cracked windscreen, bent bumper.
  if (stage === 0) {
    ctx.fillStyle = 'rgba(20,24,40,0.3)';
    for (const [dx, dy, rx, ry] of [[-3, -7.5, 1.4, 1], [3.6, 2.2, 1.2, 1.6], [-3.4, 6.8, 1.5, 0.9]]) {
      ctx.beginPath(); ctx.ellipse(dx, dy, rx, ry, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(120,80,40,0.45)';
    for (const [dx, dy] of [[2.5, -7], [-1, 5], [4, -2]]) { circle(ctx, dx, dy, 0.7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-3.5, -4.6); ctx.lineTo(-1.5, -3.4); ctx.lineTo(-2.2, -2.2); ctx.lineTo(0.5, -1.8);
    ctx.moveTo(-1.5, -3.4); ctx.lineTo(0.6, -4.4);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-5, 9.6); ctx.lineTo(-2.5, 10.8); ctx.lineTo(0, 9.9); ctx.stroke();
  }

  // Shiny: a gloss streak and twinkles.
  if (stage === 2) {
    ctx.save();
    roundRect(ctx, -5.5, -10, 11, 20, 3.2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-1, -11); ctx.lineTo(2, -11); ctx.lineTo(-6, 1); ctx.closePath();
    ctx.fill();
    ctx.restore();
    const tw = (Math.sin(time * 6) + 1) / 2;
    drawTwinkle(ctx, 4.5, -7, 1.2 + tw, '#ffffff');
    drawTwinkle(ctx, -4.8, 5, 0.8 + (1 - tw), '#ffffff');
  }

  // A little flag on the back.
  if (upgrades.flag) {
    ctx.strokeStyle = '#cfd6e2';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(4.5, 9); ctx.lineTo(4.5, 13); ctx.stroke();
    const wave = Math.sin(time * 10) * 0.6;
    ctx.beginPath();
    ctx.moveTo(4.5, 13); ctx.lineTo(8.5 + wave, 12); ctx.lineTo(4.5, 11); ctx.closePath();
    fillStroke(ctx, '#3ddc84', INK, 0.3);
  }

  ctx.restore();
}

export function drawTwinkle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.3, y + r * 0.3); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y + r * 0.3);
  ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r * 0.3); ctx.closePath();
  ctx.fill();
}

// --------------------------------------------------------------- the T-Rex
// Origin at the centre of its feet, or, when sitting, where its bottom rests
// on the seat. facing 1 looks right, -1 looks left.
// pose: 'stand', 'squat' (pooing on the grass) or 'sit' (on a toilet).
// step is the walk cycle in radians (null when not walking).
// eyes: 'open' (the pupil turns towards lookAt, a point in the same
// coordinates as x, y), 'dazed' (spinning spirals), 'squint' (squeezed shut)
// or 'wide' (startled). parts: 'all', or 'tail' and 'body' to draw them
// separately, so the tail of a sitting T-Rex can go behind the toilet.
const TREX_EYE = { dx: 12, dy: -25 };

export function drawTrex(ctx, x, y, { facing = 1, time = 0, pose = 'stand', step = null, eyes = 'open', lookAt = null, parts = 'all' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const walking = step !== null;
  const sit = pose === 'sit';
  const drop = sit ? 7 : pose === 'squat' ? 2.5 : 0; // upper body lower than standing
  const bob = Math.sin(time * 3) * 0.6 - (walking ? Math.abs(Math.sin(step)) * 0.8 : 0) + drop;
  const green = '#4cb551';
  const dark = '#2f8a3a';
  const belly = '#b6e68a';

  if (!sit && parts !== 'body') {
    ctx.fillStyle = 'rgba(20,24,40,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0.5, 13, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Tail: sticks out behind, or hangs down behind the toilet.
  if (parts !== 'body') {
    ctx.beginPath();
    if (sit) {
      ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-14, -6, -15.5, 9);
      ctx.quadraticCurveTo(-11, -1, -4, -2);
    } else {
      ctx.moveTo(-4, -12 + bob); ctx.quadraticCurveTo(-14, -11 + bob, -22, -4 + bob);
      ctx.quadraticCurveTo(-13, -5 + bob, -5, -6 + bob);
    }
    ctx.closePath();
    fillStroke(ctx, green, INK, 0.7);
  }
  if (parts === 'tail') { ctx.restore(); return bob; }

  // Standing or squatting legs, swinging in turn while it walks.
  if (!sit) {
    const spread = pose === 'squat' ? 1.35 : 1;
    const legH = 11 - drop;
    [-3.5, 3.5].forEach((lx, i) => {
      const phase = walking ? step + i * Math.PI : 0;
      const fx = lx * spread + (walking ? Math.sin(phase) * 1.8 : 0);
      const lift = walking ? Math.max(0, -Math.cos(phase)) * 1.4 : 0;
      roundRect(ctx, fx - 2.5, -legH, 5, legH - lift, 2.2);
      fillStroke(ctx, dark, INK, 0.6);
      roundRect(ctx, fx - 3, -2.2 - lift, 7, 2.6, 1.2);
      fillStroke(ctx, green, INK, 0.6);
    });
  }

  // Body.
  ctx.beginPath(); ctx.ellipse(0, -14 + bob, 9, 8.5, -0.35, 0, Math.PI * 2);
  fillStroke(ctx, green, INK, 0.7);
  // Belly spot, kept clear of the body outline.
  ctx.beginPath(); ctx.ellipse(2.2, -13 + bob, 4, 5, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = belly; ctx.fill();

  // Sitting legs: thighs along the seat, shins hanging down to the floor.
  if (sit) {
    for (const [lx, ly] of [[-1.5, -0.6], [0, 0]]) {
      roundRect(ctx, lx + 1, ly - 3.2, 9, 4.6, 2.2);
      fillStroke(ctx, dark, INK, 0.6);
      roundRect(ctx, lx + 6.5, ly - 1.5, 4.4, 11, 2);
      fillStroke(ctx, dark, INK, 0.6);
      roundRect(ctx, lx + 6, ly + 8.6, 7, 2.6, 1.2);
      fillStroke(ctx, green, INK, 0.6);
    }
  }

  // Tiny arms.
  for (const [ax, ay] of [[7, -14 + bob], [8, -11.5 + bob]]) {
    roundRect(ctx, ax, ay, 4, 1.6, 0.8);
    fillStroke(ctx, green, INK, 0.4);
  }

  // Neck and head.
  roundRect(ctx, 4, -24 + bob, 7, 10, 3);
  fillStroke(ctx, green, INK, 0.6);
  roundRect(ctx, 4, -30 + bob, 15, 10, 3.5);
  fillStroke(ctx, green, INK, 0.7);
  // Jaw with teeth.
  roundRect(ctx, 8, -21.5 + bob, 11, 3.6, 1.5);
  fillStroke(ctx, dark, INK, 0.6);
  ctx.fillStyle = '#ffffff';
  for (let tx = 9.5; tx < 18; tx += 2.2) {
    ctx.beginPath(); ctx.moveTo(tx, -21.5 + bob); ctx.lineTo(tx + 0.8, -19.8 + bob); ctx.lineTo(tx + 1.6, -21.5 + bob); ctx.fill();
  }
  // Nostril and brow (raised when startled).
  circle(ctx, 17, -27 + bob, 0.5); ctx.fillStyle = INK; ctx.fill();
  const brow = eyes === 'wide' ? -1.4 : 0;
  ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(9.5, -28.5 + bob + brow); ctx.lineTo(13.5, -27.5 + bob + brow * 1.6); ctx.stroke();

  // Eye.
  const ex = TREX_EYE.dx, ey = TREX_EYE.dy + bob;
  if (eyes === 'squint') {
    ctx.strokeStyle = INK; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - 1.3, ey - 1); ctx.lineTo(ex + 0.7, ey); ctx.lineTo(ex - 1.3, ey + 1); ctx.stroke();
  } else {
    circle(ctx, ex, ey, eyes === 'dazed' ? 2 : eyes === 'wide' ? 2.4 : 1.7);
    fillStroke(ctx, '#ffffff', INK, 0.4);
    if (eyes === 'dazed') {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.35) {
        const r = (a / (Math.PI * 4)) * 1.6;
        ctx.lineTo(ex + Math.cos(a + time * 8) * r, ey + Math.sin(a + time * 8) * r);
      }
      ctx.stroke();
    } else {
      // Pupil: towards lookAt, or straight ahead. x is mirrored when facing left.
      let px = 0.4, py = 0;
      if (lookAt) {
        const dx = (lookAt.x - x) * facing - ex;
        const dy = lookAt.y - y - ey;
        const len = Math.hypot(dx, dy) || 1;
        px = (dx / len) * 0.9;
        py = (dy / len) * 0.9;
      }
      circle(ctx, ex + px, ey + py, eyes === 'wide' ? 0.5 : 0.7);
      ctx.fillStyle = INK; ctx.fill();
    }
  }

  ctx.restore();
  return bob;
}

// A drop of sweat (or water), pointy end up, centred on (x, y).
export function drawDrop(ctx, x, y, r, color = '#7cc8ff') {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r);
  ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.8);
  ctx.closePath();
  fillStroke(ctx, color, INK, 0.35);
}

// --------------------------------------------------------------- the press
// The danger zone on the road where the press lands: yellow and black
// stripes, darker as the block comes down. Centred on y, 24 tall.
export function drawPressFloor(ctx, x0, x1, y, { shadow = 0.2 } = {}) {
  ctx.save();
  roundRect(ctx, x0, y - 12, x1 - x0, 24, 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,211,77,0.55)';
  ctx.fillRect(x0, y - 12, x1 - x0, 24);
  ctx.fillStyle = 'rgba(32,36,58,0.55)';
  for (let sx = x0 - 24; sx < x1; sx += 10) {
    ctx.beginPath();
    ctx.moveTo(sx, y + 12); ctx.lineTo(sx + 5, y + 12); ctx.lineTo(sx + 29, y - 12); ctx.lineTo(sx + 24, y - 12);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = `rgba(20,24,40,${shadow})`;
  ctx.fillRect(x0, y - 12, x1 - x0, 24);
  ctx.restore();
  roundRect(ctx, x0, y - 12, x1 - x0, 24, 2);
  ctx.strokeStyle = 'rgba(32,36,58,0.6)'; ctx.lineWidth = 0.6; ctx.stroke();
}

// The press itself, seen from the front like the T-Rex: two posts, a beam
// with warning lights, and a heavy block on a piston. lift is how far the
// block hangs above the road (0 is down on the danger zone).
export function drawPress(ctx, x0, x1, y, { lift = 0, lights = false, tremble = 0 } = {}) {
  const ground = y + 12;
  const top = ground - 64;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const stripes = (bx, by, bw, bh) => {
    ctx.save();
    roundRect(ctx, bx, by, bw, bh, 1.5);
    ctx.clip();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = INK;
    for (let sx = bx - bh; sx < bx + bw; sx += 6) {
      ctx.beginPath();
      ctx.moveTo(sx, by + bh); ctx.lineTo(sx + 3, by + bh); ctx.lineTo(sx + 3 + bh, by); ctx.lineTo(sx + bh, by);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    roundRect(ctx, bx, by, bw, bh, 1.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.stroke();
  };

  ctx.save();
  ctx.translate(tremble, 0);
  // Posts.
  for (const px of [x0 - 3, x1 + 3]) {
    roundRect(ctx, px - 2.5, top, 5, ground - top, 1.5);
    fillStroke(ctx, '#8a94a6', INK, 0.6);
    roundRect(ctx, px - 3.5, ground - 2.5, 7, 3, 1);
    fillStroke(ctx, '#5c667a', INK, 0.5);
  }
  // Beam, with a warning light on each end.
  stripes(x0 - 7, top - 6, w + 14, 7);
  for (const lx of [x0 - 3, x1 + 3]) {
    if (lights) {
      circle(ctx, lx, top - 9, 4.5);
      ctx.fillStyle = 'rgba(255,77,94,0.35)'; ctx.fill();
    }
    circle(ctx, lx, top - 8.5, 2);
    fillStroke(ctx, lights ? '#ff4d5e' : '#7a3a46', INK, 0.5);
  }
  // Piston and block.
  const blockTop = ground - lift - 22;
  roundRect(ctx, cx - 3, top, 6, blockTop - top + 2, 1);
  fillStroke(ctx, '#cfd6e2', INK, 0.5);
  roundRect(ctx, cx - 5, blockTop - 3, 10, 4, 1);
  fillStroke(ctx, '#8a94a6', INK, 0.5);
  roundRect(ctx, x0, blockTop, w, 22, 3);
  fillStroke(ctx, '#5c667a', INK, 0.8);
  roundRect(ctx, x0 + 2, blockTop + 2, w - 4, 4, 2);
  ctx.fillStyle = '#6f7b91'; ctx.fill();
  for (const bx of [x0 + 5, x1 - 5]) {
    circle(ctx, bx, blockTop + 10, 1.1);
    fillStroke(ctx, '#aab4c4', INK, 0.4);
  }
  stripes(x0 + 1.5, blockTop + 15, w - 3, 5);
  ctx.restore();
}

// ------------------------------------------------------------ the ambulance
// Top-down like the car, centred on (0, 0), about 14 wide and 24 tall.
// heading 0 faces up, Math.PI faces down. The roof lights flash blue and red.
export const AMBULANCE_H = 24;

export function drawAmbulance(ctx, x, y, { heading = 0, time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);

  roundRect(ctx, -7 + 0.8, -12 + 1.2, 14, 24, 3.5);
  ctx.fillStyle = 'rgba(20,24,40,0.3)'; ctx.fill();

  for (const [wx, wy] of [[-7.3, -6.5], [7.3, -6.5], [-7.3, 7], [7.3, 7]]) {
    roundRect(ctx, wx - 1.3, wy - 2.4, 2.6, 4.8, 1);
    fillStroke(ctx, '#2b2f3d', INK, 0.4);
  }

  // Body, with the windscreen at the front and a box at the back.
  roundRect(ctx, -7, -12, 14, 24, 3.5);
  fillStroke(ctx, '#ffffff', INK, 0.8);
  roundRect(ctx, -5.4, -10, 10.8, 3.6, 1.5);
  fillStroke(ctx, '#9fd3ff', INK, 0.4);
  roundRect(ctx, -6, -4.5, 12, 15.5, 2.5);
  fillStroke(ctx, '#f2f4f8', INK, 0.5);
  // Red stripes and a red cross on the roof.
  ctx.fillStyle = '#ff4d5e';
  ctx.fillRect(-7, 1, 1, 8);
  ctx.fillRect(6, 1, 1, 8);
  ctx.fillRect(-1.2, 1.5, 2.4, 7);
  ctx.fillRect(-3.5, 3.8, 7, 2.4);
  // Headlights.
  for (const hx of [-4.3, 4.3]) { circle(ctx, hx, -11.3, 1); ctx.fillStyle = '#fff3b0'; ctx.fill(); }

  // Light bar: blue and red take turns.
  const blueOn = Math.floor(time * 7) % 2 === 0;
  const lights = [[-5, '#4fa8ff', blueOn], [0.8, '#ff4d5e', !blueOn]];
  for (const [lx, color, on] of lights) {
    if (on) {
      circle(ctx, lx + 2.1, -5.6, 4.5);
      ctx.fillStyle = color === '#4fa8ff' ? 'rgba(79,168,255,0.35)' : 'rgba(255,77,94,0.35)';
      ctx.fill();
    }
    roundRect(ctx, lx, -6.6, 4.2, 2, 1);
    fillStroke(ctx, on ? color : '#9aa3b2', INK, 0.4);
  }

  ctx.restore();
}

// --------------------------------------------------------------- scenery
// angle spins it around its middle and lift raises it off its shadow, for a
// cone the car kicked away.
export function drawCone(ctx, x, y, { angle = 0, lift = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  const shrink = 1 / (1 + lift * 0.06);
  ctx.fillStyle = 'rgba(20,24,40,0.3)';
  ctx.beginPath(); ctx.ellipse(0.6, 3.2, 4 * shrink, 1.4 * shrink, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -lift - 1);
  ctx.rotate(angle);
  ctx.translate(0, 1);
  roundRect(ctx, -4, 2, 8, 1.8, 0.8);
  fillStroke(ctx, '#ff7a3d', INK, 0.5);
  ctx.beginPath(); ctx.moveTo(-2.6, 2.4); ctx.lineTo(0, -5); ctx.lineTo(2.6, 2.4); ctx.closePath();
  fillStroke(ctx, '#ff8a4a', INK, 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1.7, -1.6, 3.4, 1.3);
  ctx.restore();
}

export function drawTree(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(20,24,40,0.28)';
  ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2, r, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
  circle(ctx, x, y, r);
  fillStroke(ctx, '#3f9d4a', INK, 0.6);
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.5);
  ctx.fillStyle = '#7ccf6a'; ctx.fill();
  circle(ctx, x + r * 0.25, y + r * 0.2, r * 0.3);
  ctx.fillStyle = '#2f8a3a'; ctx.fill();
}

export function drawFlower(ctx, x, y, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    circle(ctx, x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.9, 0.7); ctx.fill();
  }
  ctx.fillStyle = '#ffe36b';
  circle(ctx, x, y, 0.6); ctx.fill();
}

// Bars that cross the road. kind: 'blue' | 'red' | 'passed'.
export function drawBar(ctx, x0, x1, y, kind, time = 0) {
  const w = x1 - x0;
  const colors = {
    blue: ['#6fa8ff', '#2f6fe0', '#1f4fb0'],
    red: ['#ff8a9a', '#e0405a', '#a82a40'],
    passed: ['#d9e0ea', '#aab4c4', '#7f8a9c'],
  }[kind];
  ctx.save();
  ctx.fillStyle = 'rgba(20,24,40,0.3)';
  roundRect(ctx, x0 + 0.6, y - 1.8, w, 5, 2.5); ctx.fill();
  const g = ctx.createLinearGradient(0, y - 2.5, 0, y + 2.5);
  g.addColorStop(0, colors[0]); g.addColorStop(0.55, colors[1]); g.addColorStop(1, colors[2]);
  roundRect(ctx, x0, y - 2.5, w, 5, 2.5);
  fillStroke(ctx, g, INK, 0.6);
  // Symbols: a "+" on blue (repair), an "x" on red, a check on passed bars.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  for (let sx = x0 + 8; sx < x1 - 6; sx += 14) {
    ctx.beginPath();
    if (kind === 'blue') {
      ctx.moveTo(sx - 1.5, y); ctx.lineTo(sx + 1.5, y); ctx.moveTo(sx, y - 1.5); ctx.lineTo(sx, y + 1.5);
    } else if (kind === 'red') {
      ctx.moveTo(sx - 1.3, y - 1.3); ctx.lineTo(sx + 1.3, y + 1.3); ctx.moveTo(sx + 1.3, y - 1.3); ctx.lineTo(sx - 1.3, y + 1.3);
    } else {
      ctx.moveTo(sx - 1.6, y); ctx.lineTo(sx - 0.4, y + 1.3); ctx.lineTo(sx + 1.8, y - 1.4);
    }
    ctx.stroke();
  }
  // Posts.
  for (const px of [x0, x1]) {
    circle(ctx, px, y, 3);
    fillStroke(ctx, '#3a4258', INK, 0.6);
    circle(ctx, px - 0.8, y - 0.8, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  }
  if (kind === 'blue') {
    // A soft pulse so blue bars invite you in.
    const p = (Math.sin(time * 4) + 1) / 2;
    ctx.strokeStyle = `rgba(140,190,255,${0.25 + p * 0.35})`;
    ctx.lineWidth = 1.2;
    roundRect(ctx, x0 - 1.2, y - 3.7, w + 2.4, 7.4, 3.7);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------- the toilet
// Seen from above, tank at the top, centred on (0, 0), about 14 x 21.
// open (0 to 1) flips the lid up; a poo inside pops up as it opens, and pee
// turns the water yellow.
export const TOILET_W = 14;
export const TOILET_H = 21;

export function drawToilet(ctx, x, y, { open = 0, poo = false, pee = false, time = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(20,24,40,0.3)';
  ctx.beginPath(); ctx.ellipse(1, 4.2, 6.4, 7.6, 0, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, -6.2, -9, 14, 6.5, 2); ctx.fill();

  // Tank with a flush button.
  roundRect(ctx, -7, -10, 14, 6.5, 2);
  fillStroke(ctx, '#ffffff', INK, 0.7);
  circle(ctx, 0, -6.8, 1.1);
  fillStroke(ctx, '#cfd6e2', INK, 0.4);

  // Bowl, and the water inside once the lid lifts.
  ctx.beginPath(); ctx.ellipse(0, 3, 6.2, 7.5, 0, 0, Math.PI * 2);
  fillStroke(ctx, '#ffffff', INK, 0.7);
  if (open > 0) {
    ctx.beginPath(); ctx.ellipse(0, 3.6, 4.3, 5.6, 0, 0, Math.PI * 2);
    fillStroke(ctx, pee ? '#ffe45c' : '#9fd3ff', INK, 0.5);
    if (pee) {
      // A few bubbles bobbing in the pee.
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const [bx, by, br] of [[-2, 2, 0.8], [1.6, 4.5, 0.6], [-0.4, 6.4, 0.5]]) {
        circle(ctx, bx + Math.sin(time * 3 + by) * 0.4, by + Math.sin(time * 4 + bx) * 0.3, br);
        ctx.fill();
      }
    }
  }

  // Lid: lies on the bowl when closed, stands up against the tank when open.
  ctx.beginPath(); ctx.ellipse(0, 3 - open * 7.5, 5.8, 7 * (1 - open * 0.7), 0, 0, Math.PI * 2);
  fillStroke(ctx, '#eef2f7', INK, 0.6);
  if (open < 0.5) {
    ctx.beginPath(); ctx.ellipse(-2, 0.5 - open * 7.5, 1.6, 2.6 * (1 - open), -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  }

  if (poo && open > 0.3) {
    const k = (open - 0.3) / 0.7;
    const pop = k * (1 + 0.35 * Math.sin(k * Math.PI)); // overshoots a little
    drawPoo(ctx, 0, 7.5, pop, time);
    drawStink(ctx, 0, -2, { alpha: 0.8 * k, time });
  }
  ctx.restore();
}

// Three wavy green lines rising from (x, y).
export function drawStink(ctx, x, y, { alpha = 0.8, time = 0, size = 1 } = {}) {
  ctx.save();
  ctx.strokeStyle = `rgba(120,170,70,${alpha})`;
  ctx.lineWidth = 0.6 * size;
  ctx.lineCap = 'round';
  for (const sx of [-3.5, 0, 3.5]) {
    ctx.beginPath();
    for (let s = 0; s <= 1; s += 0.1) {
      // The wave travels upwards, so the stink seems to rise.
      ctx.lineTo(x + (sx + Math.sin(s * 8 - time * 6 + sx) * 0.9) * size, y - s * 9 * size);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The same toilet seen from the side, for a T-Rex sitting on it. Origin on
// the floor below the seat; facing 1 has the tank on the left. The seat top is
// TOILET_SEAT above the floor.
export const TOILET_SEAT = 12;

export function drawToiletSide(ctx, x, y, { facing = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.fillStyle = 'rgba(20,24,40,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 0.5, 11, 2, 0, 0, Math.PI * 2); ctx.fill();
  // Tank, with its flush handle, and the lid leaning against it.
  roundRect(ctx, -13, -33, 7, 22, 1.8);
  fillStroke(ctx, '#ffffff', INK, 0.7);
  roundRect(ctx, -14, -34.5, 9, 2.6, 1.2);
  fillStroke(ctx, '#eef2f7', INK, 0.5);
  roundRect(ctx, -6.4, -30.5, 2.4, 1, 0.5);
  fillStroke(ctx, '#cfd6e2', INK, 0.35);
  roundRect(ctx, -6.6, -27, 1.9, 15, 0.9);
  fillStroke(ctx, '#eef2f7', INK, 0.5);
  // Bowl on its foot, then the seat.
  ctx.beginPath();
  ctx.moveTo(-6, -10.5); ctx.lineTo(8, -10.5);
  ctx.quadraticCurveTo(8, -4.5, 3, -4);
  ctx.lineTo(3.5, 0); ctx.lineTo(-4, 0); ctx.lineTo(-3.8, -4.5);
  ctx.quadraticCurveTo(-6, -6, -6, -10.5);
  ctx.closePath();
  fillStroke(ctx, '#ffffff', INK, 0.7);
  roundRect(ctx, -6.8, -TOILET_SEAT, 15.6, 1.8, 0.9);
  fillStroke(ctx, '#eef2f7', INK, 0.5);
  ctx.restore();
}

// A porcelain shard from a smashed toilet: a little spinning triangle.
export function drawShard(ctx, x, y, size, angle, color = '#ffffff', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-size, -size * 0.6); ctx.lineTo(size, -size * 0.2); ctx.lineTo(-size * 0.2, size * 0.8);
  ctx.closePath();
  fillStroke(ctx, color, INK, 0.35);
  ctx.restore();
}

// A happy cartoon poo, front view, standing on (x, y), about 9 x 11 at scale 1.
export function drawPoo(ctx, x, y, scale = 1, time = 0) {
  if (scale <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const brown = '#8b5a2b';
  roundRect(ctx, -4.5, -3.8, 9, 3.8, 1.9); fillStroke(ctx, brown, INK, 0.5);
  roundRect(ctx, -3.4, -6.6, 6.8, 3.4, 1.7); fillStroke(ctx, brown, INK, 0.5);
  roundRect(ctx, -2.2, -9.1, 4.4, 3, 1.5); fillStroke(ctx, brown, INK, 0.5);
  ctx.beginPath();
  ctx.moveTo(-0.8, -8.9); ctx.quadraticCurveTo(0.4, -11.4, 1.8, -11);
  ctx.quadraticCurveTo(0.9, -9.9, 1.2, -8.9); ctx.closePath();
  fillStroke(ctx, brown, INK, 0.5);
  // Eyes that blink now and then, and a big smile.
  const blink = (time % 3) < 0.12;
  for (const ex of [-1.4, 1.4]) {
    if (blink) {
      ctx.fillStyle = INK; ctx.fillRect(ex - 0.8, -5.1, 1.6, 0.4);
    } else {
      circle(ctx, ex, -5, 1); fillStroke(ctx, '#ffffff', INK, 0.35);
      circle(ctx, ex + 0.2, -4.9, 0.45); ctx.fillStyle = INK; ctx.fill();
    }
  }
  ctx.beginPath(); ctx.arc(0, -2.6, 1.6, 0.25, Math.PI - 0.25);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ icons
export function drawStar(ctx, x, y, r, fill = '#ffd34d', stroke = INK) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fillStroke(ctx, fill, stroke, Math.max(0.4, r * 0.12));
}

export function drawCheck(ctx, x, y, r, color = '#3ddc84') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.45;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.3, y + r * 0.7); ctx.lineTo(x + r, y - r * 0.8);
  ctx.strokeStyle = INK; ctx.lineWidth = r * 0.75; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.45; ctx.stroke();
  ctx.restore();
}

export function drawCross(ctx, x, y, r, color = '#ff5a6e') {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
  ctx.strokeStyle = INK; ctx.lineWidth = r * 0.8; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.45; ctx.stroke();
  ctx.restore();
}

// Speaker centred on (x, y), about 7 wide: sound waves when on, a cross when off.
export function drawSpeaker(ctx, x, y, on) {
  ctx.save();
  ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.6)';
  ctx.fillRect(x - 3.4, y - 1.2, 1.6, 2.4);
  ctx.beginPath();
  ctx.moveTo(x - 1.8, y - 1.2); ctx.lineTo(x + 0.2, y - 3); ctx.lineTo(x + 0.2, y + 3); ctx.lineTo(x - 1.8, y + 1.2);
  ctx.closePath(); ctx.fill();
  if (on) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    for (const r of [1.5, 2.9]) {
      ctx.beginPath(); ctx.arc(x + 0.4, y, r, -0.8, 0.8); ctx.stroke();
    }
  }
  ctx.restore();
  if (!on) drawCross(ctx, x + 2.4, y, 1.3);
}

// Arrow pointing in direction 'up' or 'down', tip at (x, y).
export function drawArrow(ctx, x, y, dir, color = '#ffffff', size = 5) {
  const s = dir === 'down' ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y - s * size);
  ctx.lineTo(x - size * 0.4, y - s * size);
  ctx.lineTo(x - size * 0.4, y - s * size * 2);
  ctx.lineTo(x + size * 0.4, y - s * size * 2);
  ctx.lineTo(x + size * 0.4, y - s * size);
  ctx.lineTo(x + size, y - s * size);
  ctx.closePath();
  fillStroke(ctx, color, INK, 0.7);
}

export function drawWrench(ctx, x, y, r, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = INK; ctx.lineWidth = r * 0.7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.4;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r); ctx.stroke();
  circle(ctx, 0, -r * 0.45, r * 0.5);
  fillStroke(ctx, color, INK, r * 0.15);
  ctx.fillStyle = INK;
  ctx.fillRect(-r * 0.18, -r * 1.05, r * 0.36, r * 0.5);
  ctx.restore();
}
