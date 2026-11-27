// The screen: the board, the buttons and words around it, and the cards that lie over it.
// Mirrors ContentView.swift. Everything is drawn on one canvas in whole device pixels; the
// buttons are found again by where they were drawn when a finger comes down.
import { Music } from './audio.js';
import { ADVANCE, HEIGHT, LINE, drawPinwheel, drawText, pixelRound, textWidth, wrap } from './font.js';
import { Game, clock } from './game.js';
import { G, paint, paintDemo } from './painter.js';
import { fade } from './worlds.js';

const canvas = document.getElementById('game');
const room = document.getElementById('room');
const ctx = canvas.getContext('2d', { alpha: false });
const music = new Music();
const game = new Game(music);
if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embed');

// the stage in device pixels, and the sizes everything is measured in
let dpr = 1;
let WD = 0;
let HD = 0;
let u = 1; // how large the interface is against the phone it was drawn for (393 points wide)
let px = 2; // one pixel of lettering, in device pixels
const P = (points) => Math.round(points * u * dpr);

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rw = room.clientWidth;
  const rh = room.clientHeight;
  // phone-first: a column of about 9 : 19.5, never wider than a large phone
  let w = Math.min(rw, 430);
  const h = Math.min(rh, (w * 19.5) / 9);
  if (h < w * 1.6) w = h / 1.6;
  WD = Math.max(1, Math.round(w * dpr));
  HD = Math.max(1, Math.round(h * dpr));
  canvas.width = WD;
  canvas.height = HD;
  canvas.style.width = `${WD / dpr}px`;
  canvas.style.height = `${HD / dpr}px`;
  u = Math.min(1.15, Math.max(0.55, WD / dpr / 393));
  px = Math.max(1, Math.round(1.7 * u * dpr));
  ctx.imageSmoothingEnabled = false;
}
new ResizeObserver(resize).observe(room);
window.addEventListener('resize', resize);
resize();

// ---- buttons: drawn each frame, and remembered so a touch can find them ----

let widgets = []; // { id, x, y, w, h, layer, action } in device pixels
let layer = 'base';
let held = null; // the touch that is down: { id, start, target, widget, trail }
let layout = { unit: 1, x: 0, y: 0 };

const inside = (r, p) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

/** A chunky button: a thick dark frame, filled with the accent while switched on. */
function button(id, title, x, y, w, h, radius, action, active = false) {
  const p = game.palette;
  const down = held?.widget?.id === id && held.over;
  const r = P(radius);
  // a hard shadow that the button sinks into when pressed
  pixelRound(ctx, x + 2 * px, y + 2 * px, w, h, r, px, fade(p.dark, 0.35));
  const o = down ? px : 0;
  pixelRound(ctx, x + o, y + o, w, h, r, px, p.dark);
  pixelRound(ctx, x + o + 2 * px, y + o + 2 * px, w - 4 * px, h - 4 * px, r - 2 * px, px, down ? p.dark : active ? p.accent : p.light);
  const tw = textWidth([...title].length) * px;
  drawText(ctx, title, x + o + Math.round((w - tw) / 2), y + o + Math.round((h - HEIGHT * px) / 2), px, down ? p.light : p.dark);
  widgets.push({ id, x, y, w, h, layer, action });
}

/** lines of lettering, each set in the middle of `w`, the block starting at `y`; returns its height */
function paragraph(lines, x, y, w, color, centred = true) {
  lines.forEach((line, n) => {
    const lx = centred ? Math.round((w - textWidth(line.length) * px) / 2 / px) * px : 0;
    drawText(ctx, line, x + lx, y + n * LINE * px, px, color);
  });
  return lines.length ? (LINE * (lines.length - 1) + HEIGHT) * px : 0;
}

const fit = (text, w) => wrap(text, Math.max(1, Math.floor((w / px + 1) / ADVANCE)));
const blockHeight = (n) => (n ? (LINE * (n - 1) + HEIGHT) * px : 0);
const centredText = (text, y, color, size = px) => drawText(ctx, text, Math.round((WD - textWidth(text.length) * size) / 2), y, size, color);

function dim(alpha) {
  ctx.fillStyle = fade(game.palette.dark, alpha);
  ctx.fillRect(0, 0, WD, HD);
}

// ---- the frame ----

let shownDark = '';
const starAt = [0, 0, 0]; // when each pinwheel on the result card arrived

function frame() {
  requestAnimationFrame(frame);
  game.tick();
  const p = game.palette;
  if (p.dark !== shownDark) {
    // the desk goes on beyond the column, to the edges of the window
    shownDark = p.dark;
    document.documentElement.style.background = p.dark;
    document.body.style.background = p.dark;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.dark);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = p.dark;
  ctx.fillRect(0, 0, WD, HD);
  widgets = [];
  layer = 'base';

  // the rows of buttons and words, top and bottom; the board gets the room between them
  const side = P(18);
  const topY = P(8);
  const rowH = P(34);
  const headY = topY + rowH + P(14);
  const headH = game.screen === 'level' ? HEIGHT * px * 2 : game.screen === 'map' ? HEIGHT * px : 0;
  const barH = P(42);
  const barY = HD - P(10) - barH;
  const textX = side + P(10);
  const textW = WD - 2 * textX;
  const wordsBottom = barY - P(18);
  const reserve = { title: 2, map: 3, level: 3, ending: 4 }[game.screen];
  const top = headY + headH + P(6);
  const bottom = wordsBottom - blockHeight(reserve) - P(4);
  layout = game.layout({ x: 0, y: top / dpr, w: WD / dpr, h: Math.max(40, bottom - top) / dpr }, dpr);

  // the desk
  const unit = Math.round(layout.unit * dpr);
  const jolt = game.shake > 0 ? (game.shake % 2 === 0 ? -1 : 1) * unit : 0;
  paint(new G(ctx, [unit, 0, 0, unit, Math.round(layout.x * dpr) + jolt, Math.round(layout.y * dpr)]), game.board);

  // top row: the way back on the left, the options on the right
  if (game.screen === 'level') button('back', '< map', side, topY, textWidth(5) * px + P(22), rowH, 17, () => game.toMap());
  else if (game.screen === 'map') button('back', '< title', side, topY, textWidth(7) * px + P(22), rowH, 17, () => game.toTitle());
  button('options', '≡', WD - side - P(46), topY, P(46), rowH, 17, () => game.openMenu());

  // in a level its name; on the map the level's name stands big over the sheet, so the small line names the island
  if (game.screen === 'map') centredText(game.worldTitle, headY, fade(p.light, 0.7));
  else if (game.screen === 'level') centredText(game.headline, headY, p.light, px * 2);

  // what the game has to say, resting on the bottom row
  const words = fit(game.message, textW);
  paragraph(words, textX, wordsBottom - blockHeight(words.length), textW, p.light);

  // bottom row: each button as wide as its word, with air between them, then the count
  const status = game.status.toUpperCase();
  const statusW = textWidth(status.length) * px;
  const statusY = barY + Math.round((barH - HEIGHT * px) / 2);
  if (game.screen === 'level') {
    const wu = textWidth(4) * px + P(30);
    const wr = textWidth(5) * px + P(30);
    const wq = P(46);
    const gap = Math.max(P(8), Math.floor((textW - wu - wr - wq - statusW) / 3));
    let x = textX;
    button('undo', 'undo', x, barY, wu, barH, 21, () => game.undo());
    x += wu + gap;
    button('reset', 'reset', x, barY, wr, barH, 21, () => game.reset());
    x += wr + gap;
    button('help', '?', x, barY, wq, barH, 21, () => game.showHelp());
  } else if (game.screen === 'map') {
    drawPinwheel(ctx, textX + textW - statusW - P(8) - 11 * px, barY + Math.round((barH - 11 * px) / 2), px, p.accent, p.light);
  }
  drawText(ctx, status, textX + textW - statusW, statusY, px, p.light);

  // cards lie over everything, buttons included
  if (game.card) drawCard(game.card);
  if (game.resultUp && game.result) drawResult(game.result);
  if (game.menuOpen) drawMenu();
  if (!game.card && game.notice) drawNotice(game.notice); // after any element card
}

/** A short explanation of one element: a little film of what it does, its name, and what it does. */
function drawCard(el) {
  const p = game.palette;
  dim(0.7);
  const x = P(24);
  const w = WD - 2 * x;
  const pad = P(22);
  const lines = fit(el.text, w - 2 * pad);
  // the film plays on a strip of desk: each tile is 10 art pixels, drawn 40 points wide
  const du = Math.max(1, Math.round(4 * u * dpr));
  const inset = 3 * du;
  const filmW = Math.min(w - 2 * pad, Math.max(P(224), el.demo.rows.length * 10 * du + 2 * inset));
  const filmH = 10 * du + 2 * inset;
  const h = pad + filmH + P(14) + HEIGHT * px + P(14) + blockHeight(lines.length) + pad;
  const y = Math.round((HD - h) / 2);
  pixelRound(ctx, x, y, w, h, P(18), px, p.light);
  pixelRound(ctx, x + pad, y + pad, filmW, filmH, P(10), px, p.dark);
  const g = new G(ctx, [du, 0, 0, du, x + pad + inset, y + pad + inset], [x + pad, y + pad, x + pad + filmW, y + pad + filmH]);
  paintDemo(g, { palette: p, now: game.now }, el, game.now);
  drawText(ctx, el.title, x + pad, y + pad + filmH + P(14), px, p.dark);
  paragraph(lines, x + pad, y + pad + filmH + P(14) + HEIGHT * px + P(14), w - 2 * pad, p.dark, false);
}

/** A popup for a hint or one of the game's secrets. A tap puts it away. */
function drawNotice(notice) {
  const p = game.palette;
  // in a level the card sits low and the desk is barely dimmed, so the sheet it
  // talks about can still be seen above it
  const low = game.screen === 'level';
  dim(low ? 0.25 : 0.7);
  const x = P(24);
  const w = WD - 2 * x;
  const pad = P(22);
  const lines = fit(notice.text, w - 2 * pad);
  const wheel = 22 * px;
  const headH = low ? 0 : P(6) + wheel + P(6) + P(14) + HEIGHT * px + P(14);
  const h = pad + headH + blockHeight(lines.length) + pad;
  const y = low ? HD - P(96) - h : Math.round((HD - h) / 2);
  pixelRound(ctx, x, y, w, h, P(18), px, p.light);
  if (!low) {
    // a pinwheel, turning; a hint in a level needs no heading, a secret does
    ctx.save();
    ctx.translate(WD / 2, y + pad + P(6) + wheel / 2);
    ctx.rotate(game.now * (Math.PI / 3));
    drawPinwheel(ctx, -wheel / 2, -wheel / 2, 2 * px, p.accent, p.dark);
    ctx.restore();
    centredText(notice.title.toUpperCase(), y + pad + P(6) + wheel + P(6) + P(14), p.dark);
  }
  paragraph(lines, x + pad, y + pad + headH, w - 2 * pad, p.dark);
}

/** The card that comes up when a level is solved: its pinwheels, arriving one by one, the fold count, and where to go next. */
function drawResult(result) {
  const p = game.palette;
  layer = 'result';
  dim(0.7);
  const x = P(28);
  const w = WD - 2 * x;
  const pad = P(24);
  const gap = P(16);
  const inner = w - 2 * pad;
  const secret = result.secret ? fit('every pinwheel in every world is turning. something is waiting in the sky.', inner) : [];
  const wheel = 22 * px;
  const lineH = HEIGHT * px;
  let h = pad + lineH + gap + P(4) + wheel + P(4) + gap + lineH;
  if (result.newBest) h += gap + lineH;
  if (secret.length) h += gap + blockHeight(secret.length);
  h += gap + P(46) + pad;
  let y = Math.round((HD - h) / 2);
  pixelRound(ctx, x, y, w, h, P(18), px, p.light);
  y += pad;
  centredText(game.headline.toUpperCase(), y, p.dark);
  y += lineH + gap + P(4);
  for (let i = 0; i < 3; i++) {
    const lit = i < game.starsShown;
    if (!lit) starAt[i] = 0;
    else if (!starAt[i]) starAt[i] = game.now;
    // each one spins once as it arrives, and grows to its full size
    const t = lit ? Math.min(1, (game.now - starAt[i]) / 0.7) : 0;
    const e = 1 - (1 - t) ** 2;
    const cx = WD / 2 + (i - 1) * (wheel + 5 * px);
    ctx.save();
    ctx.translate(Math.round(cx), y + wheel / 2);
    if (lit && t < 1) ctx.rotate(e * 2 * Math.PI);
    const scale = lit ? 0.75 + 0.25 * e : 0.75;
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.globalAlpha = lit ? 1 : 0.18;
    drawPinwheel(ctx, -wheel / 2, -wheel / 2, 2 * px, p.accent, p.dark, lit);
    ctx.restore();
  }
  y += wheel + P(4) + gap;
  centredText(`FOLDED IN ${result.folds}`, y, p.dark);
  y += lineH;
  if (result.newBest) {
    y += gap;
    centredText('NEW BEST', y, fade(p.dark, 0.6));
    y += lineH;
  }
  if (secret.length) {
    y += gap;
    y += paragraph(secret, x + pad, y, inner, p.dark, false);
  }
  y += gap;
  // with pinwheels still to win, trying again is the first thing offered; with all three
  // won the way on leads; without a next level the map does
  const next = game.nextLevel;
  const all = result.stars === 3;
  const choices = [
    ['retry', () => game.reset(), !all],
    ['map', () => game.toMap(), all && next == null],
  ];
  if (next != null) choices.push(['next', () => game.toNext(), all]);
  const space = P(10);
  const bw = Math.floor((inner - space * (choices.length - 1)) / choices.length);
  choices.forEach(([title, action, active], i) => button(title, title, x + pad + i * (bw + space), y, bw, P(46), 14, action, active));
}

/** The options: music, sound and (where the browser can) vibration, each on or off. */
function drawMenu() {
  const p = game.palette;
  layer = 'menu';
  dim(0.7);
  const rows = [
    ['music', game.musicOn, () => game.toggleMusic()],
    ['sound', game.soundOn, () => game.toggleSound()],
  ];
  if (game.canVibrate) rows.push(['vibration', game.hapticsOn, () => game.toggleHaptics()]);
  const w = Math.min(P(290), WD - 2 * P(12));
  const x = Math.round((WD - w) / 2);
  const pad = P(24);
  const gap = P(12);
  const lineH = HEIGHT * px;
  const h = pad + lineH + P(4) + rows.length * (gap + P(38)) + gap + P(6) + P(42) + pad;
  let y = Math.round((HD - h) / 2);
  const card = { id: 'menu-card', x, y, w, h, layer, action: null };
  pixelRound(ctx, x, y, w, h, P(18), px, p.light);
  widgets.push(card); // a tap on the card itself does nothing; one beside it closes the options
  y += pad;
  centredText('OPTIONS', y, p.dark);
  y += lineH + P(4);
  // one switch: its name on the left, and a pill that says and shows whether it is on
  for (const [name, on, action] of rows) {
    y += gap;
    drawText(ctx, name, x + pad, y + Math.round((P(38) - lineH) / 2), px, p.dark);
    button(name, on ? 'on' : 'off', x + w - pad - P(74), y, P(74), P(38), 19, action, on);
    y += P(38);
  }
  y += gap + P(6);
  button('done', 'done', x + pad, y, w - 2 * pad, P(42), 21, () => game.closeMenu(), true);
}

// ---- touch and mouse ----

const point = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
const device = (p) => ({ x: p.x * dpr, y: p.y * dpr });

/** what a touch that comes down now would land on */
function targetAt(p) {
  if (!game.card && game.notice) return { kind: 'notice' };
  const top = game.menuOpen ? 'menu' : game.resultUp && game.result ? 'result' : game.card ? 'card' : 'base';
  if (top === 'card') return { kind: 'card' };
  const d = device(p);
  // the last one drawn lies on top
  for (let i = widgets.length - 1; i >= 0; i--) {
    const w = widgets[i];
    if (w.layer === top && inside(w, d)) return w.action ? { kind: 'button', widget: w } : { kind: 'none' };
  }
  return { kind: top === 'menu' ? 'beside-menu' : top === 'result' ? 'none' : 'board' };
}

canvas.addEventListener('pointerdown', (e) => {
  if (held || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  music.unlock();
  const p = point(e);
  held = { id: e.pointerId, start: p, last: p, trail: [{ p, t: clock() }], ...targetAt(p), over: true };
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}
  if (held.kind === 'board') game.press(p, layout);
});

canvas.addEventListener('pointermove', (e) => {
  if (!held || e.pointerId !== held.id) return;
  const p = point(e);
  held.last = p;
  held.trail.push({ p, t: clock() });
  if (held.trail.length > 6) held.trail.shift();
  if (held.kind === 'button') held.over = inside(held.widget, device(p));
  else if (held.kind === 'board') game.press(p, layout);
});

function lift(e, cancelled) {
  if (!held || e.pointerId !== held.id) return;
  const h = held;
  held = null;
  const p = cancelled ? h.last : point(e);
  if (cancelled) return h.kind === 'board' ? game.cancelTouch() : undefined;
  music.unlock();
  switch (h.kind) {
    case 'notice':
      return game.dismissNotice();
    case 'card':
      return game.dismissCard();
    case 'beside-menu':
      return game.closeMenu();
    case 'button':
      if (inside(h.widget, device(p))) h.widget.action();
      return;
    case 'board': {
      // where the finger was heading as it lifted: a flick carries a fold over
      const first = h.trail.find((s) => clock() - s.t < 0.1) ?? h.trail[h.trail.length - 1];
      const dt = Math.max(0.016, clock() - first.t);
      const flick = { x: p.x + ((p.x - first.p.x) / dt) * 0.15, y: p.y + ((p.y - first.p.y) / dt) * 0.15 };
      return game.touch(h.start, p, flick, layout);
    }
    default:
  }
}
canvas.addEventListener('pointerup', (e) => lift(e, false));
canvas.addEventListener('pointercancel', (e) => lift(e, true));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// A keyboard, where there is one: arrows walk or sail, shift + arrow folds, z takes back,
// r starts the sheet again, escape leads back, enter chooses.
const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  music.unlock();
  const dir = ARROWS[e.key];
  const go = e.key === 'Enter' || e.key === ' ';
  if (!dir && !go && !['Escape', 'z', 'Z', 'u', 'U', 'r', 'R'].includes(e.key)) return;
  e.preventDefault();
  if (e.repeat && !dir) return;
  if (!game.card && game.notice) return game.dismissNotice();
  if (game.card) return game.dismissCard();
  if (game.menuOpen) return e.key === 'Escape' || go ? game.closeMenu() : undefined;
  if (game.resultUp && game.result) {
    if (go) return game.nextLevel != null && game.result.stars === 3 ? game.toNext() : game.result.stars === 3 ? game.toMap() : game.reset();
    if (e.key === 'Escape') return game.toMap();
    if (e.key === 'r' || e.key === 'R') return game.reset();
    return;
  }
  const nowhere = { x: -1e6, y: -1e6 };
  switch (game.screen) {
    case 'title':
      if (go) game.hasProgress ? game.continueGame() : game.newGame();
      return;
    case 'ending':
      if (go || e.key === 'Escape') game.touch(nowhere, nowhere, nowhere, layout);
      return;
    case 'map':
      if (dir) game.mapSwipe(dir);
      else if (go) game.enterLevel();
      else if (e.key === 'Escape') game.toTitle();
      return;
    default:
      if (game.levelClose != null || game.now - game.levelOpened < 0.4) return;
      if (dir) e.shiftKey ? game.fold(dir) : game.move(dir);
      else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') game.undo();
      else if (e.key === 'r' || e.key === 'R') game.reset();
      else if (e.key === 'Escape') game.toMap();
  }
});

// neither music nor sound while the page is not looked at
document.addEventListener('visibilitychange', () => game.setActive(!document.hidden));

requestAnimationFrame(frame);
