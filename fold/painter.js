// Draws the desk in art pixels. Mirrors Painter.swift: every sprite, film and timing is the
// app's. The context arrives scaled so that one unit is one art pixel; every fill is snapped
// to whole device pixels to keep the edges hard.
import { GLYPHS, HEIGHT, PINWHEEL, textWidth } from './font.js';
import { gust, windOf } from './gust.js';
import { at, creaseFor, fold, isWon, move, parseLevel } from './logic.js';
import { fade, roadOf, worlds } from './worlds.js';

export const T = 10; // sprite size in art pixels
/** the cover, in art pixels: where the name sheet begins, and the strips for the choices under it */
export const TITLE_TOP = 13;
export const STRIP_H = 13;
export const titleStrip = (n) => TITLE_TOP + 33 + 12 + n * (STRIP_H + 4);

/** round half away from zero, as Swift's rounded() does */
const rnd = (v) => (v < 0 ? -Math.round(-v) : Math.round(v));
const clamp01 = (p) => Math.min(1, Math.max(0, p));
const smooth = (p) => {
  const q = clamp01(p);
  return q * q * (3 - 2 * q);
};

/**
 * A drawing context that is passed by value, like SwiftUI's: translate, scale, rotate and clip
 * each give back a new one. It keeps its own transform so that fills can be snapped to pixels.
 */
export class G {
  constructor(ctx, m, clip = null) {
    this.ctx = ctx;
    this.m = m; // [a, b, c, d, e, f]
    this.box = clip; // [x0, y0, x1, y1] in device pixels
  }
  translate(x, y) {
    const [a, b, c, d, e, f] = this.m;
    return new G(this.ctx, [a, b, c, d, e + a * x + c * y, f + b * x + d * y], this.box);
  }
  scale(sx, sy) {
    const [a, b, c, d, e, f] = this.m;
    return new G(this.ctx, [a * sx, b * sx, c * sy, d * sy, e, f], this.box);
  }
  rotate(r) {
    if (r === 0) return this;
    const [a, b, c, d, e, f] = this.m;
    const k = Math.cos(r);
    const s = Math.sin(r);
    return new G(this.ctx, [a * k + c * s, b * k + d * s, c * k - a * s, d * k - b * s, e, f], this.box);
  }
  clip(x, y, w, h) {
    const [a, , , d, e, f] = this.m;
    let x0 = Math.round(e + a * x);
    let x1 = Math.round(e + a * (x + w));
    let y0 = Math.round(f + d * y);
    let y1 = Math.round(f + d * (y + h));
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    const o = this.box;
    return new G(this.ctx, this.m, o ? [Math.max(x0, o[0]), Math.max(y0, o[1]), Math.min(x1, o[2]), Math.min(y1, o[3])] : [x0, y0, x1, y1]);
  }
  fill(x, y, w, h, color) {
    const [a, b, c, d, e, f] = this.m;
    const ctx = this.ctx;
    ctx.fillStyle = color;
    if (b !== 0 || c !== 0) {
      // turned: drawn as it falls, a hair larger so no seams show between neighbours
      const grow = 0.6 / Math.hypot(a, b);
      ctx.setTransform(a, b, c, d, e, f);
      ctx.fillRect(x, y, w + grow, h + grow);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    let x0 = Math.round(e + a * x);
    let x1 = Math.round(e + a * (x + w));
    let y0 = Math.round(f + d * y);
    let y1 = Math.round(f + d * (y + h));
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    const o = this.box;
    if (o) {
      if (x0 < o[0]) x0 = o[0];
      if (y0 < o[1]) y0 = o[1];
      if (x1 > o[2]) x1 = o[2];
      if (y1 > o[3]) y1 = o[3];
    }
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
}

// ---- sprites: 'x' ink, 'o' paper, 'a' the world's accent ---------------------

/** The traveller: a folded paper boat, its hull banded in the world's colour. */
const PLAYER = ['..........', '....xx....', '....xx....', '...xoox...', '...xoox...', 'x.xoooox.x', 'xxxxxxxxxx', '.xaaaaaax.', '..xxxxxx..', '..........'];

/** What every level is after, and what a level is on the map: a sheet of coloured paper with one corner turned down. */
const SHEET = ['..........', '.xxxxxx...', '.xaaaaxx..', '.xaaaaxox.', '.xaaaaxxx.', '.xaaaaaax.', '.xaaaaaax.', '.xaaaaaax.', '.xxxxxxxx.', '..........'];

const KEY = ['..........', '..........', '..xxx.....', '.xaaax....', '.xaaaxxxxx', '.xaaax.x.x', '..xxx.....', '..........', '..........', '..........'];

/** The cave on gold island where the last sheet lies. */
const CAVE = ['..........', '...xxxx...', '..xxxxxx..', '.xxxooxxx.', '.xxooooxx.', 'xxxoaaoxxx', 'xxxoaaoxxx', 'xxxooooxxx', 'xxxooooxxx', '..........'];

const DOOR = ['xxxxxxxxxx', 'xoooooooox', 'xoxxxxxxox', 'xoxxaaxxox', 'xoxaaaaxox', 'xoxxaaxxox', 'xoxxaaxxox', 'xoxxxxxxox', 'xoooooooox', 'xxxxxxxxxx'];

const LOGO = [
  'xxxxx...xxx...x......xxxx.',
  'x......x...x..x......x...x',
  'x......x...x..x......x...x',
  'xxxx...x...x..x......x...x',
  'x......x...x..x......x...x',
  'x......x...x..x......x...x',
  'x.......xxx...xxxxx..xxxx.',
];

// The islands as they stand on the horizon in the opening. 'o' paper, 'a' the island's colour.
const ISLANDS = [
  // leaf: a round hill with a tree on it
  ['...aaa....', '..aaaaa...', '...aaa....', '....o.....', '...oooo...', '..oooooo..', '.oooooooo.', 'oooooooooo'],
  // wave: low, with a curl of surf
  ['......aa..', '.....a..a.', '..aa.a....', '.aooaaoo..', 'oooooooooo'],
  // ember: a cone with a glowing top
  ['....a.....', '..........', '....aa....', '...aaaa...', '...oooo...', '..oooooo..', '.oooooooo.', 'oooooooooo'],
  // sky: a tall spire with a cloud at its shoulder
  ['....aa....', '....aa....', '....oo....', '.oo.oo....', 'oooooo.oo.', '....oooooo', '...oooo...', '..oooooo..', '.oooooooo.', 'oooooooooo'],
  // gold: a low dome with a star over it
  ['....a.....', '...aaa....', '....a.....', '..........', '...aaaa...', '..aooooa..', '.oooooooo.', 'oooooooooo'],
];

// Scenery on the world maps.
const SCENERY = {
  t: ['..........', '....xx....', '...xaax...', '..xaaaax..', '..xaaaax..', '.xaaaaaax.', '.xxxxxxxx.', '....xx....', '....xx....', '..........'], // tree
  g: ['..........', '.a...a....', '..a.a.....', '...a......', '......a.a.', '.......a..', '..a.a.....', '...a......', '..........', '..........'], // grass
  '~': ['aaaaaaaaaa', 'aaaaaaaaaa', 'aooaaaaooa', 'oaaoaaoaao', 'aaaaooaaaa', 'aaaaaaaaaa', 'aaaaaaaaaa', 'aaooaaaaoo', 'aoaaoaaoaa', 'aaaaaooaaa'], // water
  '^': ['..........', '....aa....', '....xx....', '...xxxx...', '...xoxx...', '..xxoxxx..', '..xoxxxx..', '.xxxxxxxx.', '.xxxxxxxx.', '..........'], // peak
  c: ['..........', '....xxx...', '...xoooxx.', '.xxoooooax', 'xoooooooax', 'xoooooaaax', '.xaaaaaax.', '..xxxxxx..', '..........', '..........'], // cloud
  s: ['..........', '..........', '....a.....', '...aaa....', '....a.....', '..........', '.......a..', '..........', '..........', '..........'], // star
  l: ['aaaaaaaaaa', 'aaaxaaaaaa', 'aaaaaaaxaa', 'aaaaaaaaaa', 'axaaaaaaaa', 'aaaaaxxaaa', 'aaaaaxxaaa', 'aaaaaaaaaa', 'aaxaaaaaxa', 'aaaaaaaaaa'], // lava
};

/** The way to another island: an anchor, where the boat ties up. */
const GATE = ['..........', '....aa....', '...a..a...', '....aa....', '....xx....', '..xxxxxx..', '....xx....', '.x..xx..x.', '.xx.xx.xx.', '..xxxxxx..'];

/** Small figures, three pixels wide, for the counts under the title's windmills. */
const SMALL = Object.fromEntries(
  Object.entries({
    0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '###/..#/###/#../###', 3: '###/..#/###/..#/###',
    4: '#.#/#.#/###/..#/..#', 5: '###/#../###/..#/###', 6: '###/#../###/#.#/###', 7: '###/..#/..#/..#/..#',
    8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/###', '/': '..#/..#/.#./#../#..',
  }).map(([k, v]) => [k, v.split('/')]),
);

/** The compass, small: 'o' its outline, 'a' filled in once found. */
const SMALL_COMPASS = ['..o..', '.oao.', 'oaaao', '.oao.', '..o..'];

/** The windmill at the top of each island, and the same with its sails a turn on. */
const MILL_TILE = { x: 5, y: 0 };
const MILL = ['....aa....', '....aa....', '....aa....', '.aaaxxaaa.', '.aaaxxaaa.', '....aa....', '...xaax...', '...xxxx...', '..xxxxxx..', '..xxxxxx..'];
const MILL_TURNED = ['.a......a.', '..aa..aa..', '...aaaa...', '....xx....', '....xx....', '...aaaa...', '..aaxxaa..', '.a.xxxx.a.', '..xxxxxx..', '..xxxxxx..'];

/** What the maps hide, in two halves: a compass rose. (The pinwheels are for the levels.) */
const COMPASS = ['....xx....', '....xx....', '...xaax...', '..xaaaax..', 'xxaaxxaaxx', 'xxaaxxaaxx', '..xaaaax..', '...xaax...', '....xx....', '....xx....'];

/** How far each row is set in at a rounded corner of paper, from the corner inwards. */
const CORNER = [2, 1];
/** the cover's name sheet is one big piece, so its curve is a size larger */
const BIG_CORNER = [3, 1, 1];

// ---- the frame being painted ---------------------------------------------------

let S = null; // the board's state
let ink = '#000';
let paper = '#fff';
let accent = '#f00';

function use(state) {
  S = state;
  ink = state.palette.dark;
  paper = state.palette.light;
  accent = state.palette.accent;
}

/** the boat rides a slow swell */
const bob = () => (Math.floor(S.now / 0.45) % 2 === 0 ? 0 : 1);

const px = (g, x, y, w, h, c) => g.fill(x, y, w, h, c);

function sprite(g, rows, x0, y0) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      let k = i;
      while (k + 1 < row.length && row[k + 1] === ch) k++; // a run of one colour in one go
      g.fill(x0 + i, y0 + j, k - i + 1, 1, ch === 'x' ? ink : ch === 'o' ? paper : accent);
      i = k;
    }
  }
}

/** lettering in art pixels, one pixel of lettering per art pixel */
function text(g, str, x, y, color) {
  for (let n = 0; n < str.length; n++) {
    const rows = GLYPHS[str[n]];
    if (!rows) continue;
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 5; i++) if (rows[j][i] === '#') g.fill(x + n * 6 + i, y + j, 1, 1, color);
    }
  }
}

/** Round off one corner of a piece of paper by painting the desk back over it. */
function nip(g, x, y, right, down, big = false) {
  const insets = big ? BIG_CORNER : CORNER;
  for (let j = 0; j < insets.length; j++) px(g, right ? x : x - insets[j], down ? y + j : y - j - 1, insets[j], 1, ink);
}

/** Round off all four corners of a rectangle of paper. */
function nipAll(g, x, y, w, h) {
  if (w < 8 || h < 8) return;
  nip(g, x, y, true, true, true);
  nip(g, x + w, y, false, true, true);
  nip(g, x, y + h, true, false, true);
  nip(g, x + w, y + h, false, false, true);
}

/** A bar with fully rounded ends, in art pixels: a quarter circle cut in steps. */
function pill(g, x, y, w, h, c) {
  const r = Math.floor(h / 2);
  for (let j = 0; j < h; j++) {
    const d = Math.abs(j + 0.5 - h / 2); // how far this row is from the middle
    const inset = d > h / 2 - r ? rnd(r - Math.sqrt(r * r - (d - (h / 2 - r)) ** 2)) : 0;
    px(g, x + inset, y + j, w - 2 * inset, 1, c);
  }
}

function outline(g, x, y, w, h, c) {
  px(g, x, y, w, 1, c);
  px(g, x, y + h - 1, w, 1, c);
  px(g, x, y, 1, h, c);
  px(g, x + w - 1, y, 1, h, c);
}

/** Pixel triangle with its base at (x, y), pointing along (dx, dy). */
function tri(g, x, y, dx, dy, size, c) {
  for (let i = 0; i < size; i++) {
    const half = size - 1 - i;
    if (dx !== 0) px(g, x + dx * i - (dx < 0 ? 1 : 0), y - half - 0.5, 1, half * 2 + 1, c);
    else px(g, x - half - 0.5, y + dy * i - (dy < 0 ? 1 : 0), half * 2 + 1, 1, c);
  }
}

/** A pinwheel centred on a point and turned by an angle; `size` is art pixels per pinwheel pixel. */
function drawWheel(g0, cx, cy, size, turn, blade, other) {
  const g = g0.translate(cx, cy).rotate(turn);
  for (let j = 0; j < 11; j++) {
    const row = PINWHEEL[j];
    for (let i = 0; i < 11; i++) {
      const ch = row[i];
      if (ch !== 'a' && ch !== 'x') continue;
      let k = i;
      while (k < 10 && row[k + 1] === ch) k++;
      px(g, (i - 5.5) * size, (j - 5.5) * size, (k - i + 1) * size, size, ch === 'a' ? blade : other);
      i = k;
    }
  }
}

/** the boat drawn large and light against a dark sea, its band in the accent */
function seaBoat(g, x, y, size) {
  for (let j = 0; j < 10; j++) {
    for (let i = 0; i < 10; i++) {
      const ch = PLAYER[j][i];
      if (ch !== '.') px(g, rnd(x + i * size), rnd(y + j * size), size, size, ch === 'a' ? accent : ch === 'o' ? ink : paper);
    }
  }
}

// ---- the whole board ---------------------------------------------------------------

export function paint(g, state) {
  use(state);
  if (S.screen === 'title') drawTitle(g);
  else if (S.screen === 'ending') {
    // the sea scenes were composed for a shorter desk: raised, they sit in the middle of the screen
    const sea = g.translate(0, -22);
    if (S.cut) drawCut(sea, S.cut);
    else if (S.voyage != null) drawVoyage(sea, S.voyage);
    else if (S.intro) drawSunrise(sea);
    else if (S.endingSecret) drawSunset(sea);
    else drawEnding(g);
  } else if (S.screen === 'map') drawMap(g);
  else drawLevel(g);
}

/** The title: the name on a sheet that unfolds, the choices as pills, and the progress board. */
function drawTitle(base) {
  // One column, one width, one gap: the pinwheel, the name sheet, and under it the
  // choices as strips of the same paper. Colour is kept for the pinwheel and the crease.
  const ctx = base.translate(0, TITLE_TOP);
  const name = (g) => {
    for (let j = 0; j < LOGO.length; j++) {
      for (let i = 0; i < LOGO[j].length; i++) if (LOGO[j][i] === 'x') px(g, 6 + i * 3, 6 + j * 3, 3, 3, ink);
    }
    for (let y = 1; y < 33; y += 4) px(g, 44, y, 2, 2, accent); // the crease
  };
  if (S.titleClose != null) {
    // tapped: the name sheet folds itself away, in half three times
    const t = S.now - S.titleClose;
    const swing = (from, len) => Math.cos(Math.PI * clamp01((t - from) / len));
    if (t < 0.3) {
      const c = swing(0, 0.3);
      px(ctx, 0, 0, 45, 33, paper);
      name(ctx.clip(0, 0, 45, 33));
      if (c > 0) {
        // the right half lifts, still showing its letters
        const flap = ctx.translate(45, 0).scale(c, 1).translate(-45, 0);
        px(flap, 45, 0, 45, 33, paper);
        name(flap.clip(45, 0, 45, 33));
      } else {
        // and comes down blank side up
        const w = rnd(45 * -c);
        px(ctx, 45 - w, 0, w, 33, paper);
        px(ctx, 45 - w, 0, 1, 33, ink);
      }
      nipAll(ctx, 0, 0, c > 0 ? 45 + rnd(45 * c) : 45, 33);
    } else if (t < 0.55) {
      const c = swing(0.3, 0.25);
      px(ctx, 0, 0, 45, 16, paper);
      const h = rnd(17 * Math.abs(c));
      px(ctx, 0, c > 0 ? 16 : 16 - h, 45, h, paper);
      px(ctx, 0, c > 0 ? 16 + h - 1 : 16 - h, 45, 1, ink);
      nipAll(ctx, 0, 0, 45, c > 0 ? 16 + h : 16);
    } else if (t < 0.75) {
      const c = swing(0.55, 0.2);
      px(ctx, 22, 0, 23, 16, paper);
      const w = rnd(22 * Math.abs(c));
      px(ctx, c > 0 ? 22 - w : 22, 0, w, 16, paper);
      px(ctx, c > 0 ? 22 - w : 22 + w - 1, 0, 1, 16, ink);
      nipAll(ctx, c > 0 ? 22 - w : 22, 0, c > 0 ? 23 + w : 23, 16);
    }
    if (t < 0.55) drawWheel(ctx, 45, -29, 3, S.now * 0.7 + t * t * 14, accent, paper);
    return;
  }
  const open = Math.min(1, (S.now - S.titleStart) / 0.7);
  const h = rnd(33 * (1 - (1 - open) ** 3));
  px(ctx, 0, 0, 90, h, paper);
  name(ctx.clip(0, 0, 90, h));
  nipAll(ctx, 0, 0, 90, h); // the name sheet has the same soft corners as the buttons under it
  if (open < 1) return;
  // a pinwheel over the name, the same one as on the app's icon, turning slowly
  drawWheel(ctx, 45, -29, 3, S.now * 0.7, accent, paper);
  // the choices: the first a full strip of paper, the second only an outline, so one leads
  S.titleOptions.forEach((word, n) => {
    const y = titleStrip(n) - TITLE_TOP;
    const warn = n === 1 && S.titleWarn;
    const fill = n === 0 ? paper : warn ? accent : ink;
    // pills, like every other button in the game; the name above stays a sheet of paper
    pill(ctx, 0, y, 90, STRIP_H, n === 0 || warn ? fill : paper);
    if (n !== 0 && !warn) pill(ctx, 1, y + 1, 88, STRIP_H - 2, ink);
    const str = word.toUpperCase();
    text(ctx, str, rnd((90 - textWidth(str.length)) / 2), y + (STRIP_H - HEIGHT) / 2, n === 0 || warn ? ink : paper);
  });
  // Progress, one column for each island under the choices: its windmill (turning in the
  // island's colour once every pinwheel there is won, pale and still before), the
  // pinwheels won there, and its hidden compass. The compasses are not shown at all
  // until the game has hinted at them. Gold island joins, and counts, once it has been reached.
  const dot = (x, y, color) => px(ctx, x, y, 1, 1, color);
  const pale = fade(paper, 0.28);
  const shown = worlds.filter((w) => !w.isSecret || S.secretReached);
  const many = shown.length > 4;
  const pitch = many ? 20 : 24;
  const left = rnd((90 - (shown.length - 1) * pitch) / 2); // the middle of the first column
  const my = titleStrip(1) - TITLE_TOP + STRIP_H + 11;
  const wonIn = (w) => w.levelList.reduce((n, l) => n + Math.max(0, S.stars[l]), 0);
  shown.forEach((w, n) => {
    const cx = left + n * pitch;
    const won = wonIn(w);
    const done = won === w.count * 3;
    const frame = done && Math.floor(S.now / 0.16 + n * 0.5) % 2 === 1 ? MILL_TURNED : MILL;
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < 10; i++) {
        const ch = frame[j][i];
        if (ch !== '.') dot(cx - 5 + i, my + j, done ? (ch === 'a' ? w.palette.accent : paper) : pale);
      }
    }
    // "24/30", in small figures
    const figures = `${won}/${w.count * 3}`;
    // with five columns the counts would touch: every second one sits a line lower
    const low = many && n % 2 === 1 ? 7 : 0;
    let fx = rnd(cx - (figures.length * 4 - 1) / 2); // on whole pixels, or the figures sit unevenly
    for (const ch of figures) {
      const glyph = SMALL[ch];
      if (glyph) {
        for (let j = 0; j < 5; j++) {
          for (let i = 0; i < 3; i++) if (glyph[j][i] === '#') dot(fx + i, my + 13 + low + j, done ? paper : fade(paper, 0.6));
        }
      }
      fx += 4;
    }
    // its compass: an outline until found
    if (S.compassHint && w.halves) {
      const found = S.mapsFound.has(worlds.indexOf(w));
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 5; i++) {
          const ch = SMALL_COMPASS[j][i];
          if (ch !== '.' && (found || ch === 'o')) dot(cx - 3 + i, my + 21 + (many ? 7 : 0) + j, found ? w.palette.accent : pale);
        }
      }
    }
  });
  // and every pinwheel in the game, in one line
  const line = `${shown.reduce((n, w) => n + wonIn(w), 0)}/${shown.reduce((n, w) => n + w.count, 0) * 3}`;
  const lw = textWidth(line.length) + 13;
  const down = many ? 7 : 0;
  drawWheel(ctx, 45 - lw / 2 + 5, my + 37 + down, 0.8, S.now * 0.8, accent, paper);
  text(ctx, line, rnd(45 - lw / 2 + 13), my + 34 + down, paper);
}

/** The ending: a pinwheel for each of the four worlds, large, and the boat sailing off along a strip of paper. */
function drawEnding(ctx) {
  worlds.forEach((world, w) => {
    if (world.isSecret) return;
    // set in a zigzag so they have room to turn
    drawWheel(ctx, 45 + (w - 1.5) * 22, w % 2 === 0 ? 0 : 14, 1.5, S.now * (1.1 + 0.25 * w), world.palette.accent, paper);
  });
  for (let x = 0; x <= 80; x += 10) drawTile(ctx, { t: '.', n: 1 }, x, 40);
  // it crosses the strip and comes round again
  const sail = ((S.now * 12) % 100) - 10;
  sprite(ctx.clip(0, 30, 90, 30), PLAYER, rnd(sail), 40 + bob());
}

/** waves drifting sideways below the horizon, longer and further apart towards the viewer */
function drawWaves(g, t, horizon, speed, lit, leftward = false) {
  for (let row = 1; row <= 10; row++) {
    const y = horizon + row * row * 0.72 + 2;
    const length = 2 + Math.floor(row / 2);
    const gap = 7 + row * 2;
    const drift = (t * speed(row)) % (gap + length);
    let x = (leftward ? -drift : -gap + drift) + (row % 2) * 5;
    while (x < 90) {
      px(g, rnd(x), rnd(y), length, 1, lit(x + length / 2, row) ? accent : paper);
      x += gap + length;
    }
  }
}

const skyWheels = (g, y) =>
  worlds.forEach((world, w) => {
    if (!world.isSecret) drawWheel(g, 12 + w * 22, y + (w % 2 === 0 ? 0 : 6), 1, S.now * (0.9 + 0.2 * w), world.palette.accent, paper);
  });

/** The true ending: the boat sails away towards a golden sun, while the four worlds' pinwheels turn in the sky. */
function drawSunset(ctx) {
  const t = S.now - S.endingStart;
  const horizon = 30;
  const g = ctx.clip(0, -40, 90, 160);
  // the sun, half set, with a few rays that breathe
  for (let dy = -16; dy < 0; dy++) {
    const half = rnd(Math.sqrt(256 - dy * dy));
    px(g, 45 - half, horizon + dy, half * 2, 1, accent);
  }
  const reach = rnd(Math.sin(t / 0.6));
  for (const [dx, dy] of [[-26, -4], [26, -4], [-20, -17], [20, -17], [0, -24], [-11, -22], [11, -22]]) {
    px(g, 45 + dx + (dx < 0 ? -reach : reach) - 1, horizon + dy - reach, 2, 2, accent);
  }
  // the pinwheels of the four worlds, small, as stars over the sea
  skyWheels(g, -26);
  px(g, 0, horizon, 90, 1, paper);
  // where the sun lies on the water the waves are gold
  drawWaves(g, t, horizon, (row) => 2 + row, (mid, row) => Math.abs(mid - 45) < 4 + row);
  // the boat: large and near at first, then small against the sun, rocking as it goes
  const p = Math.min(1, t / 14);
  const eased = 1 - (1 - p) ** 1.5;
  const size = Math.max(1, rnd(3 - 2 * eased));
  const y = 96 - (96 - (horizon + 1)) * eased + (p < 1 ? bob() : Math.floor(t / 0.7) % 2);
  const x = 45 + Math.sin(t * 0.8) * 4 * (1 - eased) - 5 * size;
  seaBoat(g, x, y - 10 * size, size);
}

/** The secret's two films: gold island rising out of the water, and the cave opening in its side. */
function drawCut(ctx, cut) {
  const t = S.now - S.endingStart;
  const horizon = 30;
  const g = ctx.clip(0, -60, 90, 180);
  const rows = ISLANDS[4];
  const size = 5;
  const wide = rows[0].length * size;
  const tall = rows.length * size;
  const up = cut === 'rising' ? smooth((t - 1) / 3.2) : 1;
  const moving = cut === 'rising' ? up > 0 && up < 1 : t > 1 && t < 3.4;
  const shake = moving ? (Math.floor(t / 0.06) % 2 === 0 ? -1 : 1) : 0;
  const x0 = rnd((90 - wide) / 2) + shake;
  const top = horizon - tall * up;
  // the pinwheels of the four islands look on from the sky
  skyWheels(g, -38);
  const sky = g.clip(0, -60, 90, 60 + horizon);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') px(sky, x0 + i * size, rnd(top + j * size), size, size, row[i] === 'a' ? accent : paper);
  });
  if (cut === 'cave') {
    // the mouth opens from the ground up: an arch, narrowing at the top
    const open = smooth((t - 1) / 2.4);
    const mouthTall = rnd(16 * open);
    for (let k = 0; k < mouthTall; k++) {
      const fromTop = mouthTall - 1 - k;
      const half = fromTop < 2 && open >= 1 ? (fromTop === 0 ? 4 : 6) : 7;
      px(sky, 45 - half + shake, horizon - 1 - k, half * 2, 1, ink);
    }
    if (open >= 1) {
      // the last sheet, glinting inside
      const lit = Math.floor(t / 0.35) % 2 === 0;
      px(sky, 43, horizon - 8, 4, 5, lit ? accent : paper);
      px(sky, 45, horizon - 8, 2, 2, ink);
    }
    // stones come away as it opens
    if (moving) {
      for (let k = 0; k < 8; k++) {
        const seed = ((k * 37) % 100) / 100;
        const a = ((t - 1) * 1.3 + seed) % 1;
        px(sky, 45 + (k - 3.5) * 4, horizon - 16 + a * a * 18, 1 + (k % 2), 1 + (k % 2), k % 3 === 0 ? accent : paper);
      }
    }
  }
  px(g, 0, horizon, 90, 1, paper);
  // spray where the rock breaks the water
  if (moving || (cut === 'rising' && t < 1)) {
    for (let k = 0; k < 14; k++) {
      const seed = ((k * 53) % 100) / 100;
      const a = (t * 1.6 + seed) % 1;
      const sx = cut === 'rising' && t < 1 ? 45 + (k - 6.5) * 2 : x0 - 4 + (k * (wide + 8)) / 13;
      px(g, rnd(sx), rnd(horizon - 1 - a * (moving ? 9 : 3)), 1, 1, k % 4 === 0 ? accent : paper);
    }
  }
  drawWaves(g, t, horizon, (row) => 2 + row, (mid, row) => Math.abs(mid - 45) < (3 + row) * up);
  // the boat, watching from the near water
  seaBoat(g, 12, horizon + 52 + bob() - 20, 2);
}

/** A first crossing: open sea, the boat sailing from the left, and the island it is bound for on the horizon. */
function drawVoyage(ctx, to) {
  const t = S.now - S.endingStart;
  const horizon = 30;
  const g = ctx.clip(0, -40, 90, 160);
  // the island, three times the size it has in the opening, rising a little as the boat nears
  const rows = ISLANDS[Math.min(to, ISLANDS.length - 1)];
  const size = 3;
  const near = smooth(t / 4.2);
  const sky = g.clip(0, -40, 90, 40 + horizon);
  const top = horizon - rows.length * size * (0.75 + 0.25 * near);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') px(sky, 52 + i * size, rnd(top + j * size), size, size, row[i] === 'a' ? accent : paper);
  });
  px(g, 0, horizon, 90, 1, paper);
  // the sea streams past towards the left: the boat is under way
  drawWaves(g, t, horizon, (row) => 6 + row * 2, () => false, true);
  // the boat, sailing in from the left towards the island
  seaBoat(g, -26 + 58 * near, horizon + 46 - 20 * near + bob() - 20, 2);
}

/** The opening: the sun comes up, the boat sails out, four islands rise on the horizon, and the boat turns towards them. */
function drawSunrise(ctx) {
  const t = S.now - S.endingStart;
  const horizon = 30;
  const g = ctx.clip(0, -40, 90, 160);
  // the sun rises on the left until half of it stands over the water
  const up = smooth(t / 6);
  const sunX = 26;
  const cy = horizon + 15 - 15 * up;
  const sky = g.clip(0, -40, 90, 40 + horizon);
  for (let dy = -16; dy < 16; dy++) {
    const half = rnd(Math.sqrt(256 - dy * dy));
    px(sky, sunX - half, rnd(cy + dy), half * 2, 1, accent);
  }
  if (t > 4.5) {
    // its first rays
    const reach = rnd(Math.sin(t / 0.6));
    for (const [dx, dy] of [[-24, -5], [24, -5], [-18, -17], [18, -17], [0, -24], [-10, -22], [10, -22]]) {
      px(sky, sunX + dx + (dx < 0 ? -reach : reach) - 1, horizon + dy - reach, 2, 2, accent);
    }
  }
  // the islands: folded out of paper, each with its own shape, rising out of the sea one after another
  worlds.forEach((world, w) => {
    if (world.isSecret || w >= 4) return;
    const rise = smooth((t - 6 - w * 1.1) / 1.2);
    if (rise <= 0) return;
    const rows = ISLANDS[w];
    const x = 46 + w * 11;
    const top = horizon - rows.length * rise;
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') px(sky, x + i, rnd(top + j), 1, 1, row[i] === 'a' ? world.palette.accent : paper);
    });
  });
  px(g, 0, horizon, 90, 1, paper);
  // where the morning sun lies on the water the waves take its colour
  drawWaves(g, t, horizon, (row) => 2 + row, (mid, row) => up > 0.3 && Math.abs(mid - sunX) < (3 + row) * up);
  // the boat: in from the left across the foreground, then away towards the islands, growing small
  const across = smooth(t / 7);
  const away = smooth((t - 8) / 6);
  const size = Math.max(1, rnd(3 - 2 * away));
  const bx = -34 + 52 * across + (63 - 18) * away;
  const by = 96 - (96 - (horizon + 3)) * away + (away < 1 ? bob() : Math.floor(t / 0.7) % 2);
  seaBoat(g, bx, by - 10 * size, size);
}

// ---- maps -----------------------------------------------------------------------------

/** Dots along a road. Dashes where you can walk, single dots where it is still shut. */
function drawRoad(g, pts, open, endsAtStop) {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    // t = 1 is the middle of the next tile, which a stop covers with its own picture
    for (const t of open ? [0.33, 0.67, 1] : [1]) {
      if (!(t < 1 || !endsAtStop || k < pts.length - 2)) continue;
      px(g, rnd((a.x + (b.x - a.x) * t) * T + 4), rnd((a.y + (b.y - a.y) * t) * T + 4), 2, 2, ink);
    }
  }
}

/** A level on the map: all ink until it is solved, then filled with the world's colour. */
function drawMarker(g, art, solved, x, y) {
  for (let j = 0; j < art.length; j++) {
    for (let i = 0; i < art[j].length; i++) if (art[j][i] !== '.') px(g, x + i, y + j, 1, 1, art[j][i] === 'a' && solved ? accent : ink);
  }
}

/** A side of the map folded over the boat and back again, like a fold in a level. */
function drawPeek(ctx, pk) {
  const t = S.now - pk.start;
  // the rest of the way over in half a second, held, then back
  const over = Math.min(1, t / 0.5);
  const back = clamp01((t - 1.4) / 0.5);
  const a0 = Math.acos(pk.from); // where the finger let go of it
  drawMapFold(ctx, pk.dir, Math.cos(a0 + (Math.PI - a0) * smooth(over) - Math.PI * smooth(back)));
}

/** The map with its `dir` side turned over the crease beside the boat. */
function drawMapFold(ctx, dir, turn) {
  const w = worlds[S.world];
  const W = w.w * T;
  const H = w.h * T;
  const f = Math.abs(turn) < 0.002 ? 0.002 : turn;
  const vertical = dir === 'left' || dir === 'right';
  const low = dir === 'left' || dir === 'up'; // the lifted side is the low-index part
  const k = (vertical ? (dir === 'right' ? S.mapTile.x + 1 : S.mapTile.x) : dir === 'down' ? S.mapTile.y + 1 : S.mapTile.y) * T;
  const flap = vertical ? [low ? 0 : k, 0, low ? k : W - k, H] : [0, low ? 0 : k, W, low ? k : H - k];
  const rest = vertical ? [low ? k : 0, 0, low ? W - k : k, H] : [0, low ? k : 0, W, low ? H - k : k];
  const body = (g) => drawWorld(g, S.world, true, false, false);
  mapLabels(ctx, S.world, true); // the name and the pinwheels are not part of the paper: they stay
  body(ctx.clip(...rest));
  let turning = vertical ? ctx.translate(k, 0).scale(f, 1).translate(-k, 0) : ctx.translate(0, k).scale(1, f).translate(0, -k);
  turning = turning.clip(...flap);
  body(turning);
  px(turning, ...flap, fade(ink, 0.45 * (1 - Math.abs(f))));
}

function drawMap(ctx) {
  if (S.mapDrag) return drawMapFold(ctx, S.mapDrag.dir, S.mapDrag.turn);
  if (S.mapPeek) drawPeek(ctx, S.mapPeek);
  else drawWorld(ctx, S.world, true, true);
  if (S.mapFoundAt != null) drawFound(ctx, S.now - S.mapFoundAt);
}

/** The two halves have met: the map flashes, the compass leaps to the middle, sparks fly, and it settles back. */
function drawFound(ctx, t) {
  const w = worlds[S.world];
  const h = w.halves;
  if (t >= 2.6 || !h) return;
  const W = w.w * T;
  const H = w.h * T;
  if (t < 0.3) px(ctx, 0, 0, W, H, fade(accent, 0.7 * (1 - t / 0.3)));
  const out = smooth(t / 0.45) - smooth((t - 1.8) / 0.7); // out to the middle, and home again
  const hx = h.b.x * T + 5;
  const hy = h.b.y * T + 5;
  const cx = hx + (W / 2 - hx) * out;
  const cy = hy + (H / 2 - hy) * out;
  // sparks: two rings of pixels flying outwards
  if (t < 1.3) {
    const far = 6 + 46 * smooth(t / 1.1);
    for (let n = 0; n < 16; n++) {
      const a = (n / 16) * 2 * Math.PI + t;
      const r = far * (n % 2 === 0 ? 1 : 0.62);
      const size = t < 0.9 ? 2 : 1;
      px(ctx, rnd(cx + Math.cos(a) * r), rnd(cy + Math.sin(a) * r), size, size, n % 2 === 0 ? accent : ink);
    }
  }
  const size = 1 + 3 * out;
  // a dark plate behind it, so it reads against the busy map
  const half = 6.5 * size;
  px(ctx, rnd(cx - half), rnd(cy - half), rnd(half * 2), rnd(half * 2), ink);
  // the compass, whole: it spins like a needle finding north, and comes to rest upright
  const rose = ctx.translate(cx, cy).rotate(t < 1.5 ? (1.5 - t) * (1.5 - t) * 9 : 0);
  for (let j = 0; j < 10; j++) {
    for (let i = 0; i < 10; i++) if (COMPASS[j][i] !== '.') px(rose, (i - 5) * size, (j - 5) * size, size, size, COMPASS[j][i] === 'a' ? accent : paper);
  }
  // how many of the hidden compasses are found now, so the player knows there are more
  if (t > 0.45 && t < 1.9) {
    const total = worlds.filter((x) => x.halves).length;
    const label = `${S.mapsFound.size} OF ${total}`;
    const lw = textWidth(label.length);
    const lx = rnd(W / 2 - lw / 2);
    const ly = rnd(H / 2 + 6.5 * 4 + 3);
    px(ctx, lx - 3, ly - 3, lw + 6, HEIGHT + 6, ink);
    text(ctx, label, lx, ly, paper);
  }
}

/** A world's map unfolds like the title, then shows its scenery, the roads, and the stops along them. */
function mapLabels(ctx, index, live) {
  const w = worlds[index];
  // the level the boat stands at, in big letters on the desk above the map
  const name = (live && S.mapTitle ? S.mapTitle : w.title).toUpperCase();
  text(ctx, name, rnd((w.w * T - textWidth(name.length)) / 2), -13, paper);
  if (!live) return;
  // Under the map, off the paper: the three pinwheels of the level the boat is at.
  // Turning in the island's colour when won, pale when still to win.
  const stop = w.nodes.findIndex((n) => n.x === S.mapTile.x && n.y === S.mapTile.y);
  if (!S.mapWalking && stop >= 0 && w.nodes[stop].kind === 'level' && S.reach[stop]) {
    const cy = w.h * T + 13;
    const cx = (w.w * T) / 2;
    const dim = fade(paper, 0.2);
    for (let k = 0; k < 3; k++) {
      const won = k < S.stars[w.nodes[stop].level];
      drawWheel(ctx, cx + (k - 1) * 15, cy, 1, won ? S.now * 1.2 : 0, won ? accent : dim, won ? paper : dim);
    }
  }
}

function drawWorld(ctx, index, live, unfold, labels = true) {
  const w = worlds[index];
  const reach = S.reach;
  const bonusShown = S.bonusShown;
  const reveal = live ? S.reveal : null;
  if (labels) mapLabels(ctx, index, live);
  const open = unfold ? Math.min(1, (S.now - S.mapOpened) / 0.45) : 1;
  const g = ctx.clip(0, 0, w.w * T, rnd(w.h * T * (1 - (1 - open) ** 3)));

  // The road to the secret level grows over the first part of its reveal,
  // then the level itself unfolds at the end of it.
  const hidden = w.hiddenNode;
  const secretRoad = hidden >= 0 ? w.edges.findIndex((e) => e.a === hidden || e.b === hidden) : -1;
  const grown = bonusShown ? 1 : Math.min(1, (reveal ?? 0) / 0.6);
  const unfolded = bonusShown ? 1 : Math.max(0, ((reveal ?? 0) - 0.6) / 0.4);
  const visible = (e) => {
    let pts = roadOf(w, e);
    if (e === secretRoad) {
      if (w.edges[e].a === hidden) pts.reverse();
      pts = pts.slice(0, grown > 0 ? 1 + Math.floor((pts.length - 1) * grown) : 0);
    }
    return pts;
  };

  // wherever a road or a stop lies the tile is plain paper, whatever the scenery says
  const carved = new Set();
  w.edges.forEach((_, e) => {
    let pts = visible(e);
    if (e === secretRoad && unfolded <= 0 && grown >= 1) pts = pts.slice(0, -1);
    for (const p of pts) carved.add(p.y * w.w + p.x);
  });
  if (w.halves) for (const t of [w.halves.a, w.halves.b]) carved.add(t.y * w.w + t.x);
  const land = (x, y) => y >= 0 && y < w.h && x >= 0 && x < w.w && (w.rows[y][x] !== '_' || carved.has(y * w.w + x));
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (!land(x, y)) continue;
      drawTile(g, { t: '.', n: 1 }, x * T, y * T);
      const art = SCENERY[w.rows[y][x]];
      if (art && !carved.has(y * w.w + x)) sprite(g, art, x * T, y * T);
    }
  }
  // A windmill stands at the top of every island. It is still, and dark, until every
  // level here has its three pinwheels; then it takes the island's colour and turns.
  {
    const mx = MILL_TILE.x * T;
    const my = MILL_TILE.y * T;
    const done = w.levelList.every((l) => S.stars[l] === 3);
    const frame = done && Math.floor(S.now / 0.16) % 2 === 1 ? MILL_TURNED : MILL;
    px(g, mx, my, T, T, paper);
    drawMarker(g, frame, done, mx, my);
  }
  // the map's outer corners are rounded off like every sheet's
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (!land(x, y)) continue;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!land(x + dx, y) && !land(x, y + dy)) nip(g, (x + (dx > 0 ? 1 : 0)) * T, (y + (dy > 0 ? 1 : 0)) * T, dx < 0, dy < 0);
      }
    }
  }
  w.edges.forEach((edge, e) => {
    const secret = e === secretRoad;
    drawRoad(g, visible(e), secret || (reach[edge.a] && reach[edge.b]), !secret || grown >= 1);
  });

  // Two half-compasses lie in the scenery. One is drawn mirrored, so that it
  // completes the other when the map is folded and it lands on top.
  if (w.halves) {
    const h = w.halves;
    const found = S.mapsFound.has(index);
    const sideways = h.a.y === h.b.y;
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < 10; i++) {
        const ch = COMPASS[j][i];
        if (ch === '.') continue;
        const first = sideways ? i < 5 : j < 5;
        const color = found && ch === 'a' ? accent : ink;
        if (found || !first) px(g, h.b.x * T + i, h.b.y * T + j, 1, 1, color);
        else px(g, h.a.x * T + (sideways ? 9 - i : i), h.a.y * T + (sideways ? j : 9 - j), 1, 1, color);
      }
    }
  }
  // a turned-down corner: this map can be folded
  if (live && S.dogEar) {
    const cx = w.w * T;
    for (let k = 0; k < 5; k++) {
      px(g, cx - 5 + k, k, 5 - k, 1, S.mapFolding ? accent : ink);
      px(g, cx - 5 + k, k, 1, 1, ink);
    }
    px(g, cx - 5, 0, 5, 1, ink);
  }
  const moored = (n) => n.x === S.mapTile.x && n.y === S.mapTile.y;
  w.nodes.forEach((node, i) => {
    const x = node.x * T;
    const y = node.y * T;
    // the stop the boat is moored at shows as plain paper, so the boat can be seen
    if (live && !S.mapWalking && moored(node) && i !== hidden) return px(g, x, y, T, T, paper);
    if (node.kind === 'level') {
      px(g, x, y, T, T, paper);
      if (!reach[i]) sprite(g, DOOR, x, y);
      else if (w.lastLocked && node.level === w.end - 1) sprite(g, CAVE, x, y); // the last sheet lies in a cave
      else drawMarker(g, SHEET, S.stars[node.level] > 0, x, y);
    } else if (node.kind === 'exit') {
      if (i === hidden) {
        // the hidden gate opens out from its middle, like a folded note
        if (unfolded <= 0) return;
        const s = g.translate(0, y + 5).scale(1, Math.max(0.01, unfolded)).translate(0, -(y + 5));
        px(s, x, y, T, T, paper);
        sprite(s, GATE, x, y);
        if (!bonusShown && Math.floor(S.now / 0.08) % 2 === 0) outline(g, x - 2, y - 2, T + 4, T + 4, accent);
      } else {
        px(g, x, y, T, T, paper);
        sprite(g, reach[i] ? GATE : DOOR, x, y);
      }
    } else {
      px(g, x, y, T, T, paper);
      sprite(g, GATE, x, y);
    }
  });
  if (!live) return;
  if (!S.mapWalking) outline(g, S.mapTile.x * T - 1, S.mapTile.y * T - 1, T + 2, T + 2, Math.sin(S.now / 0.2) > 0 ? accent : ink);
  // under way it rocks quickly; at rest it rides the swell
  const rock = S.mapWalking ? (Math.floor(S.now / 0.09) % 2 === 0 ? -1 : 0) : bob();
  sprite(g, PLAYER, rnd(S.mapPlayer.x * T), rnd(S.mapPlayer.y * T) + rock);
}

// ---- element cards ------------------------------------------------------------------------

const demos = new Map();

/** what a demo film plays: the sheet before, after, and the way the boat then goes */
function demoOf(el) {
  let d = demos.get(el.id);
  if (d) return d;
  const s0 = parseLevel([el.demo.rows]);
  const s1 = fold(s0, el.demo.dir);
  d = { s0, s1: s1.error ? null : s1, path: [] };
  if (d.s1) {
    // where the boat goes once the paper has landed, in places on the desk
    const landed = { ...s1, px: s0.ox + s0.px - s1.ox, py: s0.oy + s0.py - s1.oy };
    for (const [x, y] of gust(landed)) d.path.push([s1.ox + x, s1.oy + y]);
    let cur = s1;
    for (let n = 0; n < 8 && !isWon(cur); n++) {
      const gx = cur.cells[cur.py].findIndex((c) => c.t === 'G');
      const next = gx < 0 ? null : move(cur, gx > cur.px ? 'right' : 'left');
      if (!next) break;
      cur = next;
      d.path.push([cur.ox + cur.px, cur.oy + cur.py]);
    }
  }
  demos.set(el.id, d);
  return d;
}

/**
 * The little film on an element's card, looping: the sheet lies there, a side is folded over
 * the boat (after a fold that will not go, if the element is about that), and the boat goes on
 * to the goal. It is played with the game's own rules, so it cannot lie.
 */
export function paintDemo(g, state, el, time) {
  use(state);
  const { s0, s1, path } = demoOf(el);
  if (!s1) return drawSheet(g, s0, 0, s0.w, 0, s0.h);
  const wait = 0.8;
  const tryFor = el.demo.refused ? 1 : 0;
  const foldFor = 0.9;
  const pause = 0.35;
  const stepFor = 0.22;
  const rest = 1.5;
  const total = wait + tryFor + foldFor + pause + stepFor * path.length + rest;
  let t = time % total;
  let boat = [s0.ox + s0.px, s0.oy + s0.py];
  if (t < wait) {
    drawSheet(g, s0, 0, s0.w, 0, s0.h);
  } else if (t < wait + tryFor) {
    // it lifts a little and falls back: that side is held
    const p = (t - wait) / tryFor;
    drawFolding(g, s0, el.demo.refused, 1 - 0.35 * Math.sin(Math.PI * p) * (1 + 0.15 * Math.sin(p * 40)));
  } else if (t < wait + tryFor + foldFor) {
    drawFolding(g, s0, el.demo.dir, Math.cos(Math.PI * smooth((t - wait - tryFor) / foldFor)));
  } else {
    drawSheet(g, s1, 0, s1.w, 0, s1.h);
    t -= wait + tryFor + foldFor + pause;
    if (t > 0 && path.length) boat = path[Math.min(path.length - 1, Math.floor(t / stepFor))];
    else if (!path.length) boat = [s1.ox + s1.px, s1.oy + s1.py];
  }
  sprite(g, PLAYER, boat[0] * T, boat[1] * T + (Math.floor(time / 0.45) % 2 === 0 ? 0 : 1));
}

// ---- levels -----------------------------------------------------------------------------------

/** A key has met its door: the tile flashes, the two halves of the door slide apart, and two rings spread out. */
function drawOpens(ctx) {
  const t = S.now - S.burnStart;
  if (!S.opens.length || t < 0 || t >= 0.7) return;
  for (const o of S.opens) {
    const x0 = o.x * T;
    const y0 = o.y * T;
    if (t < 0.07) px(ctx, x0, y0, T, T, accent);
    if (t < 0.4) {
      // the door, in two halves, parting
      const p = t / 0.4;
      const slide = rnd(5 * p);
      const tall = rnd(8 * (1 - p * p));
      const top = y0 + 1 + rnd((8 - tall) / 2);
      px(ctx, x0 + 1 - slide, top, 4, tall, ink);
      px(ctx, x0 + 5 + slide, top, 4, tall, ink);
      if (tall > 2) {
        px(ctx, x0 + 2 - slide, top + 1, 2, tall - 2, paper);
        px(ctx, x0 + 6 + slide, top + 1, 2, tall - 2, paper);
      }
    }
    for (let ring = 0; ring < 2; ring++) {
      const a = (t - ring * 0.14) / 0.45;
      if (a <= 0 || a >= 1) continue;
      const r = rnd(2 + 9 * a);
      outline(ctx, x0 + 5 - r, y0 + 5 - r, r * 2, r * 2, accent);
    }
  }
}

/** Wind carrying the boat: short streaks stream out behind it, the way it came. */
function drawGust(ctx) {
  const g = S.gust;
  if (!g) return;
  const cx = S.player.x * T + 5;
  const cy = S.player.y * T + 5;
  const bx = -g.dx; // behind the boat
  const by = -g.dy;
  for (let k = 0; k < 4; k++) {
    const phase = (S.now * 9 + k * 0.29) % 1;
    const off = (k - 1.5) * 2.6;
    const far = 6 + phase * 9;
    const length = Math.max(1, Math.trunc(4 - phase * 3));
    for (let i = 0; i < length; i++) {
      const d = far + i;
      px(ctx, rnd(cx + bx * d - by * off), rnd(cy + by * d + bx * off), 1, 1, k % 2 === 0 ? accent : ink);
    }
  }
}

/** Fire where lava has just met something: the tile flares, shrinks to a glowing core, and embers fly up. */
function drawBurns(ctx) {
  const t = S.now - S.burnStart;
  if (!S.burns.length || t < 0 || t >= 0.9) return;
  S.burns.forEach((b, n) => {
    const x0 = b.x * T;
    const y0 = b.y * T;
    if (t < 0.1) {
      px(ctx, x0, y0, T, T, t < 0.05 ? paper : accent); // the flare
    } else if (t < 0.45) {
      // what is left of the tile, burning inwards from its edges
      const left = 1 - (t - 0.1) / 0.35;
      const side = rnd(T * left);
      const inset = rnd((T - side) / 2);
      px(ctx, x0 + inset, y0 + inset, side, side, accent);
      if (side > 4) px(ctx, x0 + inset + 2, y0 + inset + 2, side - 4, side - 4, paper);
    }
    // embers: a handful of sparks, each on its own way up and out
    for (let k = 0; k < 7; k++) {
      const seed = (((n * 7 + k) * 37) % 100) / 100;
      const a = (t - (0.06 + seed * 0.18)) / 0.5;
      if (a <= 0 || a >= 1) continue;
      const angle = -Math.PI / 2 + (k - 3) * 0.42 + seed;
      const far = 3 + 11 * a;
      const size = a < 0.5 ? 2 : 1;
      px(ctx, rnd(x0 + 4 + Math.cos(angle) * far), rnd(y0 + 4 + Math.sin(angle) * far - 6 * a * a), size, size, k % 3 === 0 ? paper : accent);
    }
  });
}

/** The sheet folded down the middle: the left half lies flat, the right half stands at `c`. */
function drawHalved(ctx, s, c) {
  const x0 = s.ox * T;
  const y0 = s.oy * T;
  const w = s.w * T;
  const h = s.h * T;
  const mid = x0 + Math.floor(w / 2);
  drawSheet(ctx.clip(x0, y0, mid - x0, h), s, 0, s.w, 0, s.h);
  if (c > 0) {
    const flap = ctx.translate(mid, 0).scale(c, 1).translate(-mid, 0).clip(mid, y0, x0 + w - mid, h);
    drawSheet(flap, s, 0, s.w, 0, s.h);
  } else {
    const fw = rnd((x0 + w - mid) * -c);
    px(ctx, mid - fw, y0, fw, h, paper);
    px(ctx, mid - fw, y0, 1, h, ink);
  }
}

function drawLevel(ctx) {
  const s = S.sheet;
  if (S.levelClose != null) {
    // leaving: the sheet folds in half, then in half again, and is gone
    const t = S.now - S.levelClose;
    if (t < 0.24) {
      drawHalved(ctx, s, Math.cos((Math.PI * t) / 0.24));
    } else {
      const x0 = s.ox * T;
      const y0 = s.oy * T;
      const w = Math.floor((s.w * T) / 2);
      const h = s.h * T;
      const top = Math.floor(h / 2);
      const c = Math.cos(Math.PI * Math.min(1, (t - 0.24) / 0.18));
      px(ctx, x0, y0, w, top, paper);
      const fh = rnd((h - top) * Math.abs(c));
      px(ctx, x0, c > 0 ? y0 + top : y0 + top - fh, w, fh, paper);
      px(ctx, x0, c > 0 ? y0 + top + fh - 1 : y0 + top - fh, w, 1, ink);
    }
    return;
  }
  const opening = (S.now - S.levelOpened) / 0.4;
  if (opening < 1) {
    // arriving: the sheet lies folded in half and opens
    const e = 1 - (1 - opening) ** 2;
    return drawHalved(ctx, s, -Math.cos(Math.PI * e));
  }
  if (S.anim) {
    drawFolding(ctx, S.anim.from, S.anim.dir, animTurn(S.anim, S.now), !S.anim.refused);
  } else if (S.drag) {
    drawFolding(ctx, s, S.drag.dir, S.drag.turn, !S.drag.refused); // the side follows the finger
  } else {
    drawSheet(ctx, s, 0, s.w, 0, s.h);
    drawCreases(ctx, S.creases);
    // the walkthrough points at a tile
    if (S.guideTile && Math.floor(S.now / 0.35) % 2 === 0) {
      const x = (s.ox + S.guideTile.x) * T;
      const y = (s.oy + S.guideTile.y) * T;
      outline(ctx, x - 1, y - 1, T + 2, T + 2, accent);
      outline(ctx, x - 2, y - 2, T + 4, T + 4, accent);
    }
  }
  // a side that will not go because it is pinned: its pins hold on, stretched
  if (S.anim?.refused) drawPinned(ctx, S.anim.from, S.anim.dir, animTurn(S.anim, S.now));
  else if (S.drag?.refused) drawPinned(ctx, s, S.drag.dir, S.drag.turn);
  drawBurns(ctx);
  drawOpens(ctx);
  drawGust(ctx);
  const x = rnd(S.player.x * T);
  const y = rnd(S.player.y * T);
  if (S.anim || S.drag) outline(ctx, x - 1, y - 1, T + 2, T + 2, accent); // "you are here"
  sprite(ctx, PLAYER, x, y + (S.won ? rnd(Math.sin(S.now / 0.12)) : bob()));
}

/**
 * The pins on a lifted side that will not come away: each one's head stays stuck in the desk
 * where it was, and its shaft is pulled long and taut to where its spot on the paper has gone.
 */
function drawPinned(ctx, s, dir, turn) {
  const pull = 1 - turn;
  if (pull < 0.01) return;
  const { vertical, line } = creaseFor(s, dir);
  const first = dir === 'left' || dir === 'up'; // the lifted side is the low-index part
  const crease = ((vertical ? s.ox : s.oy) + line) * T;
  const tremble = Math.floor(S.now / 0.05) % 2 === 1 ? 1 : 0;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = vertical ? x : y;
      if (s.cells[y][x].t !== 'o' || (first ? v >= line : v < line)) continue;
      const ox = (s.ox + x) * T + 5;
      const oy = (s.oy + y) * T + 5;
      const mx = vertical ? crease + (ox - crease) * turn : ox;
      const my = vertical ? oy : crease + (oy - crease) * turn;
      // the shaft, one art pixel at a time; its middle trembles
      const steps = Math.max(1, Math.round(Math.hypot(mx - ox, my - oy)));
      const mid = Math.floor(steps / 2);
      for (let i = 0; i <= steps; i++) {
        const side = i === mid ? tremble : 0;
        px(ctx, rnd(ox + ((mx - ox) * i) / steps) - 1 + (vertical ? 0 : side), rnd(oy + ((my - oy) * i) / steps) - 1 + (vertical ? side : 0), 2, 2, accent); // the island's colour shows on paper and on the bare desk alike
      }
      // the head, where it is stuck in the desk: it shows more as the paper is pulled away
      const size = pull > 0.2 ? 6 : 4;
      px(ctx, ox - size / 2, oy - size / 2, size, size, accent);
      px(ctx, ox - 1, oy - 1, 2, 2, ink);
    }
  }
}

/** where a turning flap is at a given time; it swings at an even pace, easing in and out */
export function animTurn(a, now) {
  // a side that will not go: a short lift and back
  if (a.bump) return 1 - a.bump * Math.sin(Math.PI * clamp01((now - a.start) / a.duration));
  const a0 = Math.acos(a.from0);
  const a1 = Math.acos(a.to);
  return Math.cos(a0 + (a1 - a0) * smooth((now - a.start) / a.duration));
}

function drawSheet(g, s, xa, xb, ya, yb) {
  const isPaper = (x, y) => {
    const c = at(s, x, y);
    return !!c && c.t !== ' ';
  };
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      drawTile(g, s.cells[y][x], (s.ox + x) * T, (s.oy + y) * T);
      if (!isPaper(x, y)) continue;
      // a corner of the sheet's outline, where the paper ends both ways, is rounded off a little
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!isPaper(x + dx, y) && !isPaper(x, y + dy)) nip(g, (s.ox + x + (dx > 0 ? 1 : 0)) * T, (s.oy + y + (dy > 0 ? 1 : 0)) * T, dx < 0, dy < 0);
      }
    }
  }
}

function drawTile(g, c, x0, y0) {
  const t = c.t;
  if (t === ' ') return;
  if (t === '#') {
    px(g, x0, y0, T, T, ink);
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < 10; i++) if ((i - j + 50) % 5 === 0) px(g, x0 + i, y0 + j, 1, 1, paper);
    }
  } else {
    px(g, x0, y0, T, T, paper);
    px(g, x0, y0, 1, 1, ink); // dotted grid, like a notebook
  }
  if (t === 'G') sprite(g, SHEET, x0, y0);
  if (t === 'L') sprite(g, SCENERY.l, x0, y0);
  const d = windOf(t);
  if (d) {
    // two chevrons pointing the way it blows, the leading one in the world's colour
    for (const [n, color] of [[0, ink], [1, accent]]) {
      for (let k = -2; k <= 2; k++) {
        const along = n * 3 - Math.abs(k);
        const cx = x0 + 4.5 + (d[0] !== 0 ? d[0] * along : k);
        const cy = y0 + 4.5 + (d[1] !== 0 ? d[1] * along : k);
        px(g, Math.floor(cx), Math.floor(cy), 1, 1, color);
        px(g, Math.floor(cx - d[0]), Math.floor(cy - d[1]), 1, 1, color);
      }
    }
  }
  if (t === 'k') sprite(g, KEY, x0, y0);
  if (t === 'D') sprite(g, DOOR, x0, y0);
  if (t === 'o') {
    px(g, x0 + 3, y0 + 2, 4, 6, ink);
    px(g, x0 + 2, y0 + 3, 6, 4, ink);
    px(g, x0 + 4, y0 + 4, 2, 2, accent);
  }
}

/** The flap turns over across the crease while everything else, the player included, stays exactly where it is. */
function drawFolding(ctx, s, dir, turn, lands = true) {
  const f = Math.abs(turn) < 0.002 ? 0.002 : turn; // 1 lying flat, -1 folded over
  const { vertical, line } = creaseFor(s, dir);
  const flapFirst = dir === 'left' || dir === 'up'; // the flap is the low-index part
  const X = s.ox * T;
  const Y = s.oy * T;
  const W = s.w * T;
  const H = s.h * T;
  const k = line * T;
  const size = flapFirst ? k : (vertical ? W : H) - k;
  const shade = fade(ink, 0.45 * (1 - Math.abs(f)));
  if (vertical) {
    drawSheet(ctx, s, flapFirst ? line : 0, flapFirst ? s.w : line, 0, s.h);
    if (lands) outline(ctx, X + k - (flapFirst ? 0 : size), Y, size, H, accent); // where it will land
    const g = ctx.translate(X + k, 0).scale(f, 1).translate(-(X + k), 0);
    drawSheet(g, s, flapFirst ? 0 : line, flapFirst ? line : s.w, 0, s.h);
    px(g, X + (flapFirst ? 0 : k), Y, size, H, shade);
  } else {
    drawSheet(ctx, s, 0, s.w, flapFirst ? line : 0, flapFirst ? s.h : line);
    if (lands) outline(ctx, X, Y + k - (flapFirst ? 0 : size), W, size, accent);
    const g = ctx.translate(0, Y + k).scale(1, f).translate(0, -(Y + k));
    drawSheet(g, s, 0, s.w, flapFirst ? 0 : line, flapFirst ? line : s.h);
    px(g, X, Y + (flapFirst ? 0 : k), W, size, shade);
  }
}

function drawCreases(g, dirs) {
  const s = S.sheet;
  const pulse = rnd(Math.sin(S.now / 0.16));
  for (const dir of dirs) {
    if (fold(s, dir).error) continue;
    const { vertical, line } = creaseFor(s, dir);
    // dashed crease, overshooting the sheet a little so it reads against the desk
    const len = (vertical ? s.h : s.w) * T + 8;
    for (let i = 0; i < len; i += 4) {
      if (vertical) px(g, (s.ox + line) * T - 1, s.oy * T - 4 + i, 2, 2, accent);
      else px(g, s.ox * T - 4 + i, (s.oy + line) * T - 1, 2, 2, accent);
    }
    // arrow from the side that will move, pointing over the crease at the player
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const cx = (s.ox + s.px) * T + 5 + dx * (13 + pulse);
    const cy = (s.oy + s.py) * T + 5 + dy * (13 + pulse);
    tri(g, cx + dx, cy + dy, -dx, -dy, 5, ink);
    tri(g, cx, cy, -dx, -dy, 3, accent);
  }
}
