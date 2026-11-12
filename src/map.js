// The town. One character per 16 x 16 tile; the map is 16 x 9 tiles.
//
//  .  grass (blocked)
//  #  street
//  P  parking space
//  G W T F  buildings: Garage (repair), car Wash, Tire shop, Fuel station
//  g w t f  the entrance of that building, on the street
export const TILE = 16;

export const MAP = [
  'GGGG....WWWW....',
  'GGGG....WWWW....',
  '#g#######w######',
  '#PP..#.....#.PP#',
  '#....#.....#...#',
  '#PP..#.....#.PP#',
  '#t###########f##',
  'TTTT........FFFF',
  'TTTT........FFFF',
];

export const COLS = MAP[0].length;
export const ROWS = MAP.length;

export const BUILDINGS = {
  G: { name: 'Garage', entrance: 'g' },
  W: { name: 'Wash', entrance: 'w' },
  T: { name: 'Tires', entrance: 't' },
  F: { name: 'Fuel', entrance: 'f' },
};

const DRIVABLE = new Set(['#', 'P', 'g', 'w', 't', 'f']);

export function tileAt(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return ' ';
  return MAP[row][col];
}

export function tileAtPixel(x, y) {
  return tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
}

export function isDrivable(ch) {
  return DRIVABLE.has(ch);
}

export function isEntrance(ch) {
  return 'gwtf'.includes(ch);
}

export function buildingForEntrance(ch) {
  return ch.toUpperCase();
}

// Street tiles get a centre line only where the street continues straight.
export function roadLineDirection(col, row) {
  const h = isDrivable(tileAt(col - 1, row)) && isDrivable(tileAt(col + 1, row));
  const v = isDrivable(tileAt(col, row - 1)) && isDrivable(tileAt(col, row + 1));
  if (h && !v) return 'h';
  if (v && !h) return 'v';
  return null;
}
