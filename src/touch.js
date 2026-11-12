// On-screen buttons for tablets and phones: left and right on the left side,
// speed up and brake/reverse on the right, and a park button above them that
// only shows near the parking lot. They hold the same names as the arrow keys
// (input.js), so the scenes don't know the difference.
//
// The buttons appear when the screen is touched (or straight away on a
// touch-first device) and disappear when a key is pressed. Every finger is
// followed on its own, so steering and driving work at the same time, and a
// finger can slide from one button to the next.
import { input } from './input.js';
import { WIDTH } from './renderer.js';

const BESIDE_ROAD = 44; // world units of grass and curb on each side of the road
const SIZE = { min: 52, max: 130 }; // button size in CSS pixels
const SLOP = 0.25; // a touch this far (in button sizes) outside a button still counts

export function createTouchControls(canvas) {
  const root = document.getElementById('touch');
  const buttons = [...root.querySelectorAll('[data-name]')].map((el) => ({ el, name: el.dataset.name }));
  const park = buttons.find((b) => b.name === 'action');
  const pointers = new Map(); // pointer id -> name of the button under it, or null
  let on = false;
  let size = SIZE.min;
  let parkState = 'hidden';

  // Size the buttons so two fit side by side beside the road (plus any bar
  // next to the game), or bigger when there is room under the game (portrait).
  function layout() {
    const box = canvas.getBoundingClientRect();
    const side = box.left + BESIDE_ROAD * (box.width / WIDTH);
    const below = innerHeight - box.bottom;
    const gap = Math.round(Math.min(16, Math.max(8, side * 0.06)));
    let fit = (side - gap * 3) / 2;
    if (below > 3 * SIZE.min) fit = Math.max(fit, Math.min((below - gap * 4) / 3, (innerWidth / 2 - gap * 3) / 2));
    size = Math.round(Math.min(SIZE.max, Math.max(SIZE.min, fit)));
    root.style.setProperty('--size', `${size}px`);
    root.style.setProperty('--gap', `${gap}px`);
  }

  const usable = (b) => b !== park || parkState !== 'hidden';

  function buttonAt(x, y) {
    let best = null;
    let bestDist = size * (0.5 + SLOP);
    for (const b of buttons) {
      if (!usable(b)) continue;
      const r = b.el.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestDist) { best = b; bestDist = d; }
    }
    return best?.name ?? null;
  }

  function refresh() {
    const held = new Set();
    for (const name of pointers.values()) {
      if (name && usable(buttons.find((b) => b.name === name))) held.add(name);
    }
    input.setButtons(held);
    for (const b of buttons) b.el.classList.toggle('held', held.has(b.name));
  }

  function show(visible) {
    if (visible === on) return;
    on = visible;
    root.classList.toggle('on', on);
    if (on) layout();
    else { pointers.clear(); refresh(); }
  }

  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') show(true);
    if (!on) return;
    pointers.set(e.pointerId, buttonAt(e.clientX, e.clientY));
    refresh();
  });
  addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const name = buttonAt(e.clientX, e.clientY);
    if (name === pointers.get(e.pointerId)) return;
    pointers.set(e.pointerId, name);
    refresh();
  });
  for (const type of ['pointerup', 'pointercancel']) {
    addEventListener(type, (e) => { if (pointers.delete(e.pointerId)) refresh(); });
  }
  addEventListener('blur', () => { pointers.clear(); refresh(); });
  addEventListener('resize', () => { if (on) layout(); });
  input.onAnyKey(() => show(false));

  // Stop the page from scrolling, bouncing, zooming or showing a menu on a
  // long press (CSS touch-action covers most browsers; this covers iOS).
  const stop = (e) => e.preventDefault();
  document.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('gesturestart', stop);
  document.addEventListener('contextmenu', stop);

  show(matchMedia('(pointer: coarse)').matches);

  return {
    // 'hidden', 'shown' (near the lot) or 'ready' (parking would work now).
    setPark(state) {
      if (state === parkState) return;
      parkState = state;
      park.el.classList.toggle('shown', state !== 'hidden');
      park.el.classList.toggle('ready', state === 'ready');
      refresh();
    },
  };
}
