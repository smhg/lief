// Renderer: the game thinks in a 256 x 144 world; the canvas is scaled to fit
// the window at full device resolution so vector shapes stay smooth.
export const WIDTH = 256;
export const HEIGHT = 144;

const spriteCache = new Map();

function buildSpriteCanvas(sprite, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const ctx = canvas.getContext('2d');
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

function spriteCanvas(sprite, overrides) {
  const colors = { ...sprite.colors, ...overrides };
  const key = sprite.name + JSON.stringify(colors);
  let canvas = spriteCache.get(key);
  if (!canvas) {
    canvas = buildSpriteCanvas(sprite, colors);
    spriteCache.set(key, canvas);
  }
  return canvas;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let pixelPerfect = false;

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    let scale = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
    if (pixelPerfect) scale = Math.max(1, Math.floor(scale));
    canvas.style.width = `${WIDTH * scale}px`;
    canvas.style.height = `${HEIGHT * scale}px`;
    canvas.width = Math.round(WIDTH * scale * (pixelPerfect ? 1 : dpr));
    canvas.height = Math.round(HEIGHT * scale * (pixelPerfect ? 1 : dpr));
  }
  addEventListener('resize', fit);
  fit();

  return {
    ctx,
    // Pixel scenes (the old town map) want integer scaling and no smoothing.
    setPixelPerfect(on) { pixelPerfect = on; fit(); },
    beginFrame() {
      ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      ctx.imageSmoothingEnabled = !pixelPerfect;
    },
    clear(color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    },
    rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      if (pixelPerfect) ctx.fillRect(Math.round(x), Math.round(y), w, h);
      else ctx.fillRect(x, y, w, h);
    },
    sprite(sprite, x, y, { colors, quarterTurns = 0, scale = 1, alpha = 1, flipX = false } = {}) {
      const img = spriteCanvas(sprite, colors);
      const w = sprite.w * scale;
      const h = sprite.h * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x) + w / 2, Math.round(y) + h / 2);
      ctx.rotate((Math.PI / 2) * quarterTurns);
      if (flipX) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
    number(digits, n, x, y, { scale = 1 } = {}) {
      const str = String(Math.max(0, Math.floor(n)));
      let cx = x;
      for (const ch of str) {
        this.sprite(digits[ch], cx, y, { scale });
        cx += 4 * scale;
      }
      return cx - x;
    },
    text(str, x, y, color = '#f4f4f4', size = 8, align = 'left') {
      ctx.fillStyle = color;
      ctx.font = `bold ${size}px "Arial Rounded MT Bold", "Nunito", "Segoe UI", Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = align;
      ctx.fillText(str, x, y);
    },
  };
}
