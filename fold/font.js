// The game's own lettering and interface shapes: 5 x 7 pixel capitals, pill buttons, rounded
// cards. Mirrors PixelFont.swift. Everything here is drawn in whole device pixels on a plain
// 2D context, so the words are made of the same stuff as the sheets.

export const ADVANCE = 6; // glyph width plus one pixel of space
export const HEIGHT = 7;
export const LINE = 10;

const g = (s) => s.split('/');
export const GLYPHS = {
  A: g('.###./#...#/#...#/#####/#...#/#...#/#...#'),
  B: g('####./#...#/#...#/####./#...#/#...#/####.'),
  C: g('.###./#...#/#..../#..../#..../#...#/.###.'),
  D: g('####./#...#/#...#/#...#/#...#/#...#/####.'),
  E: g('#####/#..../#..../####./#..../#..../#####'),
  F: g('#####/#..../#..../####./#..../#..../#....'),
  G: g('.###./#...#/#..../#.###/#...#/#...#/.###.'),
  H: g('#...#/#...#/#...#/#####/#...#/#...#/#...#'),
  I: g('.###./..#../..#../..#../..#../..#../.###.'),
  J: g('..###/...#./...#./...#./...#./#..#./.##..'),
  K: g('#...#/#..#./#.#../##.../#.#../#..#./#...#'),
  L: g('#..../#..../#..../#..../#..../#..../#####'),
  M: g('#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#'),
  N: g('#...#/##..#/#.#.#/#..##/#...#/#...#/#...#'),
  O: g('.###./#...#/#...#/#...#/#...#/#...#/.###.'),
  P: g('####./#...#/#...#/####./#..../#..../#....'),
  Q: g('.###./#...#/#...#/#...#/#.#.#/#..#./.##.#'),
  R: g('####./#...#/#...#/####./#.#../#..#./#...#'),
  S: g('.####/#..../#..../.###./....#/....#/####.'),
  T: g('#####/..#../..#../..#../..#../..#../..#..'),
  U: g('#...#/#...#/#...#/#...#/#...#/#...#/.###.'),
  V: g('#...#/#...#/#...#/#...#/#...#/.#.#./..#..'),
  W: g('#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#'),
  X: g('#...#/#...#/.#.#./..#../.#.#./#...#/#...#'),
  Y: g('#...#/#...#/.#.#./..#../..#../..#../..#..'),
  Z: g('#####/....#/...#./..#../.#.../#..../#####'),
  0: g('.###./#...#/#..##/#.#.#/##..#/#...#/.###.'),
  1: g('..#../.##../..#../..#../..#../..#../.###.'),
  2: g('.###./#...#/....#/...#./..#../.#.../#####'),
  3: g('####./....#/....#/.###./....#/....#/####.'),
  4: g('...#./..##./.#.#./#..#./#####/...#./...#.'),
  5: g('#####/#..../####./....#/....#/#...#/.###.'),
  6: g('.###./#..../#..../####./#...#/#...#/.###.'),
  7: g('#####/....#/...#./..#../..#../..#../..#..'),
  8: g('.###./#...#/#...#/.###./#...#/#...#/.###.'),
  9: g('.###./#...#/#...#/.####/....#/....#/.###.'),
  '.': g('...../...../...../...../...../.##../.##..'),
  ',': g('...../...../...../...../.##../..#../.#...'),
  '/': g('....#/....#/...#./..#../.#.../#..../#....'),
  ':': g('...../.##../.##../...../.##../.##../.....'),
  "'": g('..#../..#../...../...../...../...../.....'),
  '-': g('...../...../...../#####/...../...../.....'),
  '!': g('..#../..#../..#../..#../..#../...../..#..'),
  '?': g('.###./#...#/....#/...#./..#../...../..#..'),
  '<': g('...#./..#../.#.../#..../.#.../..#../...#.'),
  '≡': g('...../#####/...../#####/...../#####/.....'),
  '♪': g('..##./..#.#/..#.#/..#../..#../###../###..'),
};

/** A paper pinwheel: two blades take the colour it is given ('a'), two stay dark ('x'). */
export const PINWHEEL = [
  '.....aaaaa.',
  'x....aaaa..',
  'xx...aaa...',
  'xxx..aa....',
  'xxxx.a.....',
  '.....oxxxxx',
  '....a.xxxxx',
  '...aa..xxxx',
  '..aaa...xxx',
  '.aaaa....xx',
  'aaaaa.....x',
];

/** width of `count` letters, in lettering pixels */
export const textWidth = (count) => Math.max(0, count * ADVANCE - 1);

/** Break into lines of at most `limit` characters, at spaces. */
export function wrap(text, limit) {
  const lines = [];
  let line = '';
  for (const word of text.toUpperCase().split(' ').filter(Boolean)) {
    if (line && line.length + 1 + word.length > limit) {
      lines.push(line);
      line = '';
    }
    line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}

/** One line of lettering with its top-left at (x, y); `px` is the size of one of its pixels. */
export function drawText(ctx, text, x, y, px, color) {
  ctx.fillStyle = color;
  const s = String(text).toUpperCase();
  for (let n = 0; n < s.length; n++) {
    const rows = GLYPHS[s[n]];
    if (!rows) continue;
    for (let j = 0; j < 7; j++) {
      const row = rows[j];
      for (let i = 0; i < 5; i++) {
        if (row[i] !== '#') continue;
        // runs of pixels in one go
        let k = i;
        while (k < 4 && row[k + 1] === '#') k++;
        ctx.fillRect(x + (n * ADVANCE + i) * px, y + j * px, (k - i + 1) * px, px);
        i = k;
      }
    }
  }
}

/** A rectangle with its corners rounded the pixel way: a quarter circle cut in steps. */
export function pixelRound(ctx, x, y, w, h, radius, step, color) {
  ctx.fillStyle = color;
  const rad = Math.min(radius, h / 2, w / 2);
  const bands = Math.round(rad / step);
  if (bands <= 0) return ctx.fillRect(x, y, w, h);
  const edge = bands * step;
  ctx.fillRect(x, y + edge, w, h - 2 * edge);
  for (let k = 0; k < bands; k++) {
    const d = edge - (k + 0.5) * step; // how far this band's middle is above the circle's centre
    const inset = Math.round((edge - Math.sqrt(edge * edge - d * d)) / step) * step;
    ctx.fillRect(x + inset, y + k * step, w - 2 * inset, step);
    ctx.fillRect(x + inset, y + h - (k + 1) * step, w - 2 * inset, step);
  }
}

/** A pinwheel with its top-left at (x, y), `unit` device pixels per pinwheel pixel. */
export function drawPinwheel(ctx, x, y, unit, color, dark, lit = true) {
  for (let j = 0; j < 11; j++) {
    for (let i = 0; i < 11; i++) {
      const ch = PINWHEEL[j][i];
      if (ch !== 'a' && ch !== 'x') continue;
      ctx.fillStyle = !lit || ch === 'x' ? dark : color;
      ctx.fillRect(x + i * unit, y + j * unit, unit, unit);
    }
  }
}
