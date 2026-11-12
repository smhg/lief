// Pixel art lives here as text, so it is easy to tweak without an image editor.
// Each character maps to a colour; '.' is transparent.
// Colours named in UPPERCASE (BODY, BODY_DARK) are placeholders that a scene
// overrides, e.g. to paint a car blue or red.

export const COLORS = {
  outline: '#1a1c2c',
  white: '#f4f4f4',
  glass: '#94b0c2',
  tire: '#333c57',
  lamp: '#ffcd75',
  tail: '#b13e53',
  blue: '#3b5dc9',
  blueDark: '#29366f',
  red: '#b13e53',
  redDark: '#7a2a3a',
  green: '#38b764',
  grass: '#5fae4d',
  grassDark: '#4f9a40',
  road: '#5d6b7a',
  roadLine: '#dfe3e8',
  parking: '#73818f',
  roofGarage: '#ef7d57',
  roofWash: '#41a6f6',
  roofTires: '#566c86',
  roofFuel: '#ffcd75',
  wall: '#c8bfa8',
  star: '#ffcd75',
};

function sprite(name, rows, colors) {
  return { name, rows, w: rows[0].length, h: rows.length, colors };
}

// Top-down car, facing up. 10 x 12.
export const CAR = sprite('car', [
  '..kkkkkk..',
  'tkByyyyBkt',
  'tkBBBBBBkt',
  'tkggggggkt',
  '.kggggggk.',
  '.kBBBBBBk.',
  '.kBBBBBBk.',
  '.kBBBBBBk.',
  'tkBBBBBBkt',
  'tkggggggkt',
  'tkBrrrrBkt',
  '..kkkkkk..',
], {
  k: COLORS.outline,
  t: COLORS.tire,
  g: COLORS.glass,
  y: COLORS.lamp,
  r: COLORS.tail,
  B: COLORS.blue,
});

export const STAR = sprite('star', [
  '..y..',
  '.yyy.',
  'yyyyy',
  '.yyy.',
  'y...y',
], { y: COLORS.star });

export const CHECK = sprite('check', [
  '......g',
  '.....gg',
  'g...gg.',
  'gg.gg..',
  '.ggg...',
  '..g....',
], { g: COLORS.green });

export const CROSS = sprite('cross', [
  'r.....r',
  '.r...r.',
  '..r.r..',
  '...r...',
  '..r.r..',
  '.r...r.',
  'r.....r',
], { r: COLORS.red });

// Little wrench icon for repair-themed signs.
export const WRENCH = sprite('wrench', [
  '.....ww',
  '....w.w',
  '...wwww',
  '..ww...',
  '.ww....',
  'ww.....',
  'w......',
], { w: COLORS.white });

// Traffic cone, 6 x 7.
export const CONE = sprite('cone', [
  '..oo..',
  '..oo..',
  '.wwww.',
  '.oooo.',
  '.wwww.',
  'oooooo',
  'kkkkkk',
], { o: '#ef7d57', w: COLORS.white, k: COLORS.outline });

// Round bush / tree seen from above, 12 x 12.
export const TREE = sprite('tree', [
  '....gggg....',
  '..ggGGGGgg..',
  '.gGGGGGGGGg.',
  '.gGGGGLLGGg.',
  'gGGGGGLLLGGg',
  'gGGGGGGLLGGg',
  'gGGGGGGGGGGg',
  'gGGGGGGGGGGg',
  '.gGGGGGGGGg.',
  '.ggGGGGGGgg.',
  '..dggggggd..',
  '....dddd....',
], { g: '#2f7a3a', G: '#3f9a46', L: '#6cc55a', d: '#24502a' });

// Parking sign, 9 x 9.
export const P_SIGN = sprite('psign', [
  'bbbbbbbbb',
  'bwwwwwwwb',
  'bwwbbbwwb',
  'bwwbwwbwb',
  'bwwbbbwwb',
  'bwwbwwwwb',
  'bwwbwwwwb',
  'bwwwwwwwb',
  'bbbbbbbbb',
], { b: COLORS.blue, w: COLORS.white });

// Up arrow hint, 7 x 7.
export const ARROW_UP = sprite('arrowup', [
  '...w...',
  '..www..',
  '.wwwww.',
  'wwwwwww',
  '..www..',
  '..www..',
  '..www..',
], { w: COLORS.white });

// Tiny 3 x 5 digits so numbers look like pixel art too.
const DIGIT_ROWS = {
  0: ['www', 'w.w', 'w.w', 'w.w', 'www'],
  1: ['.w.', 'ww.', '.w.', '.w.', 'www'],
  2: ['www', '..w', 'www', 'w..', 'www'],
  3: ['www', '..w', 'www', '..w', 'www'],
  4: ['w.w', 'w.w', 'www', '..w', '..w'],
  5: ['www', 'w..', 'www', '..w', 'www'],
  6: ['www', 'w..', 'www', 'w.w', 'www'],
  7: ['www', '..w', '..w', '..w', '..w'],
  8: ['www', 'w.w', 'www', 'w.w', 'www'],
  9: ['www', 'w.w', 'www', '..w', 'www'],
};
export const DIGITS = Object.fromEntries(
  Object.entries(DIGIT_ROWS).map(([d, rows]) => [d, sprite(`digit${d}`, rows, { w: COLORS.white })]),
);

// The same car, but broken: dents, a cracked windscreen and a dead headlight.
export const CAR_BROKEN = sprite('carbroken', [
  '..kkkkkk..',
  'tkBydyyBkt',
  'tkBdBBBBkt',
  'tkgcgggckt',
  '.kggcgggk.',
  '.kBBBBdBk.',
  '.kBdBBBBk.',
  '.kBBBBBdk.',
  'tkBBdBBBkt',
  'tkggggggkt',
  'tkBrrdrBkt',
  '..kkkkkk..',
], {
  k: COLORS.outline,
  t: COLORS.tire,
  g: COLORS.glass,
  c: COLORS.white,
  y: COLORS.lamp,
  r: COLORS.tail,
  B: COLORS.blue,
  d: COLORS.blueDark,
});

// T-Rex, side view, facing right. 18 x 20. The eye has its own colour 'e' so
// it can be recoloured.
export const TREX = sprite('trex', [
  '......kkkkkkk.....',
  '.....kGGGGGGGk....',
  '....kGGGeGGGGGk...',
  '....kGGGGGGGGGk...',
  '....kGGGGGkkkkk...',
  '.....kGGGkwwwwk...',
  '.....kGGGGkkkkk...',
  '....kGGGGGGk......',
  '...kGGGGGGGk......',
  '..kGGGGGGGGk......',
  '.kGGGGGGLLkkk.....',
  'kGGGGGGGLLLk......',
  'kGGGGGGGLLLk......',
  'kkGGGGGGGLLLk.....',
  '..kGGGGGGGLk......',
  '...kGGkGGGk.......',
  '...kGGk.kGGk......',
  '...kGGk.kGGk......',
  '..kkGGk.kGGkk.....',
  '..kkkkk.kkkkk.....',
], {
  k: COLORS.outline,
  G: '#38b764',
  L: '#a7f070',
  w: COLORS.white,
  e: COLORS.white,
});
// Where the eye sits inside the sprite (centre of that pixel).
export const TREX_EYE = { x: 8.5, y: 2.5 };
