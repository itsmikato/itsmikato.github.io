// Pure game rules for Fold. No DOM here, so the solver in tools/ can share it.
//
// A sheet is a grid of cells. Each cell has a type and a layer count:
//   '.' paper   '#' ink wall   ' ' hole (cut out)   'G' goal   'o' pin
//   'k' key     'D' door          'L' lava
//   '<' '>' '^' 'v' wind, blowing that way
// Folding lays one part of the sheet on top of the other. The top layer wins,
// except that holes let whatever is underneath show through. A door cannot be
// papered over: it only opens when a key is folded onto it (or it onto a key).
// Lava burns whatever meets it in a fold, and burns away with it: a hole is left. Wind blows the player along until something stops
// them; a folded side lands mirrored, so its wind points the other way.

export const DIRS = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

const WALKABLE = new Set(['.', 'G', 'o', 'k', '<', '>', '^', 'v']);
const WIND = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], v: [0, 1] };
const MIRRORED = { '<': '>', '>': '<' }; // wind seen in a mirror standing upright
const TURNED = { '>': 'v', v: '>', '<': '^', '^': '<' }; // wind when rows and columns swap
const SOLID = new Set(['#', 'D', 'L']); // cannot be folded onto the player

export function parseLevel(rows, needsPlayer = true) {
  const w = Math.max(...rows.map((r) => r.length));
  let player = null;
  const cells = rows.map((row, y) =>
    Array.from({ length: w }, (_, x) => {
      let t = row[x] ?? '_';
      if (t === 'P') {
        player = { x, y };
        t = '.';
      }
      if (t === '_') t = ' ';
      return { t, n: t === ' ' ? 0 : 1 };
    }),
  );
  if (!player) {
    if (needsPlayer) throw new Error('level has no player');
    player = { x: 0, y: 0 };
  }
  return { w, h: rows.length, cells, px: player.x, py: player.y, ox: 0, oy: 0, folds: 0 };
}

export const at = (s, x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? null : s.cells[y][x]);
export const canWalk = (s, x, y) => WALKABLE.has(at(s, x, y)?.t);
export const isWon = (s) => at(s, s.px, s.py)?.t === 'G';

// Wind carries the player from where they stand: along the arrow until the next
// tile cannot be entered, turning wherever another arrow lies, stopping on the goal.
// It lifts them over holes, so wind can reach what walking cannot.
export function blow(s) {
  let { px, py } = s;
  let d = WIND[at(s, px, py)?.t];
  if (!d) return s;
  const seen = new Set();
  for (;;) {
    const k = `${px},${py},${d}`;
    if (seen.has(k)) break; // going round in circles: rest here
    seen.add(k);
    let nx = px + d[0];
    let ny = py + d[1];
    // the wind lifts the player over gaps: a run of holes is crossed if there is footing beyond it
    while (at(s, nx, ny)?.t === ' ') {
      nx += d[0];
      ny += d[1];
    }
    if (!canWalk(s, nx, ny)) break;
    px = nx;
    py = ny;
    const t = at(s, px, py).t;
    if (t === 'G') break;
    d = WIND[t] || d;
  }
  return { ...s, px, py };
}

export function move(s, dir) {
  const [dx, dy] = DIRS[dir];
  const x = s.px + dx;
  const y = s.py + dy;
  if (!canWalk(s, x, y)) return null;
  return blow({ ...s, px: x, py: y });
}

function combine(top, bottom) {
  if (top.t === ' ') return { ...bottom };
  const n = top.n + bottom.n;
  // Key meets door, either way up: the door opens and both are spent.
  if ((top.t === 'k' && bottom.t === 'D') || (top.t === 'D' && bottom.t === 'k')) return { t: '.', n };
  // Lava burns: whatever is laid on it, or whatever it is laid on, burns away together
  // with the lava and leaves a hole. Laid over a hole there is nothing to burn, so it stays.
  if (bottom.t === 'L' || (top.t === 'L' && bottom.t !== ' ')) return { t: ' ', n: 0 };
  // Pins and doors poke through blank paper laid on top of them.
  const t = top.t === '.' && (bottom.t === 'o' || bottom.t === 'D') ? bottom.t : top.t;
  return { t, n };
}

const retype = (c, map) => (map[c.t] ? { ...c, t: map[c.t] } : c);
const flipH = (s) => ({ ...s, cells: s.cells.map((r) => [...r].reverse().map((c) => retype(c, MIRRORED))), px: s.w - 1 - s.px });
const transpose = (s) => ({
  ...s,
  w: s.h,
  h: s.w,
  px: s.py,
  py: s.px,
  cells: Array.from({ length: s.w }, (_, x) => s.cells.map((r) => retype(r[x], TURNED))),
});

// Everything right of the player's column folds over to the left, on top.
function foldRight(s) {
  const k = s.px + 1;
  if (k >= s.w) return { error: 'edge' };
  const off = Math.max(0, s.w - 2 * k);
  const w = Math.max(k, s.w - k);
  const cells = [];
  for (let y = 0; y < s.h; y++) {
    const row = Array.from({ length: w }, () => ({ t: ' ', n: 0 }));
    for (let x = 0; x < k; x++) row[x + off] = { ...s.cells[y][x] };
    for (let x = k; x < s.w; x++) {
      const top = retype(s.cells[y][x], MIRRORED); // the folded side is seen mirrored
      if (top.t === 'o') return { error: 'pinned' };
      const nx = 2 * k - 1 - x + off;
      if (SOLID.has(top.t) && nx === s.px + off && y === s.py) return { error: top.t === 'L' ? 'burned' : 'crushed' };
      row[nx] = combine(top, row[nx]);
    }
    cells.push(row);
  }
  return { ...s, w, cells, px: s.px + off };
}

// Fold the part of the sheet beyond the player, in `dir`, back over the player.
// Returns the new state, or { error } when the fold is not possible.
export function fold(s, dir) {
  let r;
  if (dir === 'right') r = foldRight(s);
  else if (dir === 'left') {
    r = foldRight(flipH(s));
    if (!r.error) r = flipH(r);
  } else {
    let t = transpose(s);
    if (dir === 'up') t = flipH(t);
    r = foldRight(t);
    if (!r.error) {
      if (dir === 'up') r = flipH(r);
      r = transpose(r);
    }
  }
  if (r.error) return r;
  // The player's part of the sheet never moves on the table.
  r.ox = s.ox + s.px - r.px;
  r.oy = s.oy + s.py - r.py;
  r.folds = s.folds + 1;
  return blow(r); // wind folded onto the player's tile carries them off
}

// Where the crease would be, in grid lines, for drawing a preview.
export function creaseFor(s, dir) {
  if (dir === 'right') return { vertical: true, line: s.px + 1 };
  if (dir === 'left') return { vertical: true, line: s.px };
  if (dir === 'down') return { vertical: false, line: s.py + 1 };
  return { vertical: false, line: s.py };
}

// ---- solver helpers -------------------------------------------------------

// Every tile the player can come to rest on by walking (and being blown).
export function reachable(s) {
  const seen = new Set([s.py * s.w + s.px]);
  const out = [[s.px, s.py]];
  for (let i = 0; i < out.length; i++) {
    const [x, y] = out[i];
    for (const dir of Object.keys(DIRS)) {
      const r = move({ ...s, px: x, py: y }, dir);
      if (!r || seen.has(r.py * s.w + r.px)) continue;
      seen.add(r.py * s.w + r.px);
      out.push([r.px, r.py]);
    }
  }
  return out;
}

// Breadth-first over folds. Returns the shortest solution as a list of steps
// ({ x, y, dir } = walk to x,y then fold dir), or null if there is none.
export function solve(start, maxFolds = 8) {
  const key = (s, cells) =>
    s.w + '|' + s.cells.map((r) => r.map((c) => c.t).join('')).join('/') + '|' + Math.min(...cells.map(([x, y]) => y * s.w + x));
  let frontier = [{ s: start, path: [] }];
  const seen = new Set();
  let explored = 0;
  for (let depth = 0; depth <= maxFolds; depth++) {
    const next = [];
    for (const { s, path } of frontier) {
      const cells = reachable(s);
      if (cells.some(([x, y]) => s.cells[y][x].t === 'G')) return { path, explored };
      const k = key(s, cells);
      if (seen.has(k)) continue;
      seen.add(k);
      explored++;
      for (const [x, y] of cells)
        for (const dir of Object.keys(DIRS)) {
          const r = fold({ ...s, px: x, py: y }, dir);
          if (!r.error) next.push({ s: r, path: [...path, { x, y, dir }] });
        }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}
