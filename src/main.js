import { createRenderer, WIDTH, HEIGHT } from './renderer.js';
import { input } from './input.js';
import { createTouchControls } from './touch.js';
import { audio } from './audio.js';
import { createCourseScene } from './scenes/course.js';
import { createTownScene } from './scenes/town.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);

// Sound may only start after a key press, click or tap. Touch screens only
// count the end of a tap (iOS in particular), hence pointerup and touchend.
// M or the speaker button switches it off and on.
input.onAnyKey(() => audio.init());
for (const type of ['pointerdown', 'pointerup', 'touchend']) addEventListener(type, () => audio.init());
canvas.addEventListener('pointerdown', (e) => {
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * WIDTH;
  const y = ((e.clientY - box.top) / box.height) * HEIGHT;
  scene.tap?.(x, y);
});

// Dev aids: ?level=3 jumps to a level, ?at=top starts just below the parking
// lot, ?at=rex next to the first T-Rex, ?at=press below the first press,
// ?scene=town opens the pixel town.
const params = new URLSearchParams(location.search);
let scene;
if (params.get('scene') === 'town') {
  renderer.setPixelPerfect(true);
  scene = createTownScene();
} else {
  scene = createCourseScene({
    level: params.has('level') ? Math.max(1, parseInt(params.get('level'), 10) || 1) : null,
    startNearLot: params.get('at') === 'top',
    startNearRex: params.get('at') === 'rex',
    startNearPress: params.get('at') === 'press',
  });
}
// After the scene, which may change how the canvas is scaled.
const touch = createTouchControls(canvas);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (input.justPressed('mute')) audio.toggleMute();
  touch.setPark(scene.parkButton?.() ?? 'shown');
  scene.update(dt);
  renderer.beginFrame();
  scene.draw(renderer);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
