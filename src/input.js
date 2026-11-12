// Input: the arrow keys plus Space (and Enter as a spare), and the on-screen
// buttons on touch screens (touch.js), which use the same names.
const KEY_NAMES = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Space: 'action',
  Enter: 'enter',
  KeyM: 'mute', // sound on/off
};
const anyKeyListeners = [];

const keys = new Set();  // keys held down
let buttons = new Set(); // on-screen buttons held down
const pressed = new Set();

const isDown = (name) => keys.has(name) || buttons.has(name);

window.addEventListener('keydown', (e) => {
  for (const fn of anyKeyListeners) fn();
  const name = KEY_NAMES[e.code];
  if (!name) return;
  e.preventDefault();
  if (!isDown(name)) pressed.add(name);
  keys.add(name);
});

window.addEventListener('keyup', (e) => {
  const name = KEY_NAMES[e.code];
  if (!name) return;
  e.preventDefault();
  keys.delete(name);
});

// Dropping focus (alt-tab, clicking elsewhere) must not leave a key stuck.
window.addEventListener('blur', () => keys.clear());

export const input = {
  isDown,
  justPressed: (name) => pressed.has(name),
  // Call once at the end of every frame.
  endFrame: () => pressed.clear(),
  // Runs on any key press; used to start audio after the first gesture.
  onAnyKey: (fn) => anyKeyListeners.push(fn),
  // The on-screen buttons report all the buttons held at once.
  setButtons(names) {
    for (const name of names) if (!isDown(name)) pressed.add(name);
    buttons = new Set(names);
  },
};
