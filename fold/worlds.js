// The five islands and their palettes. Mirrors Worlds.swift and Theme.swift in the iPhone app.
import { BONUS, HIDDEN, LEVELS } from './levels.js';
import { parseLevel, solve } from './logic.js';

// Three colours per screen, like an old handheld: a dark, a light and one accent.
const pal = (dark, light, accent) => ({ dark, light, accent });
export const PALETTES = {
  plain: pal('#141414', '#f2efe9', '#ff8a70'), // title screen: plain ink, paper and coral
  grass: pal('#16271c', '#eef2dc', '#5cc470'),
  water: pal('#10223c', '#e6f0f2', '#3fb0cc'),
  volcano: pal('#2c1411', '#f7e9dc', '#ff6a45'),
  sky: pal('#1c1a3d', '#eeecf8', '#8b78f2'),
  gold: pal('#231a08', '#f8f1d9', '#e2a92e'),
};

/** a colour with some of it taken away: '#rrggbb' at opacity `a` */
export function fade(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// The main levels in order, then one bonus level per world, then the hidden last level.
// `par` is the fewest folds the solver needs; the pinwheels are measured against it.
export const levels = [...LEVELS, ...BONUS, ...HIDDEN].map((l) => ({
  name: l.name,
  hint: l.touchHint || l.hint || '',
  intro: l.intro || '',
  par: solve(parseLevel(l.rows), 8)?.path.length ?? 1,
  rows: l.rows,
}));

// A stop is a place the boat can stand on a map: { kind: 'entry' | 'level' | 'exit', level }.
// `rows` is only scenery; wherever a road or a stop lies, the tile is plain paper.
//   '.' paper   '_' cut away   't' tree   'g' grass   '~' water   '^' peak   'l' lava
//   'c' cloud   's' star
function world(name, title, o) {
  const nodes = [];
  const named = {};
  if (o.entry) {
    named.in = nodes.length;
    nodes.push({ kind: 'entry', x: o.entry[0], y: o.entry[1] });
  }
  o.spots.forEach(([x, y], i) => {
    named[i + 1] = nodes.length;
    nodes.push({ kind: 'level', level: o.levels[0] + i, x, y });
  });
  if (o.exit) {
    named.out = nodes.length;
    nodes.push({ kind: 'exit', x: o.exit[0], y: o.exit[1] });
  }
  const w = {
    name,
    title,
    palette: PALETTES[name],
    track: `music-${name}`,
    rows: o.rows,
    first: o.levels[0], // its levels are first ..< end
    end: o.levels[1],
    isSecret: !!o.isSecret,
    secretExit: !!o.secretExit,
    lastLocked: !!o.lastLocked,
    nodes,
    edges: o.roads.map(([a, b]) => ({ a: named[a], b: named[b] })),
    // two tiles that each carry half a compass: folding the map so one lands on the other is the hidden find
    halves: o.halves ? { a: { x: o.halves[0][0], y: o.halves[0][1] }, b: { x: o.halves[1][0], y: o.halves[1][1] } } : null,
    w: o.rows[0].length,
    h: o.rows.length,
  };
  w.count = w.end - w.first;
  w.levelList = Array.from({ length: w.count }, (_, i) => w.first + i);
  // the stop that is not drawn, and cannot be walked to, until it has been revealed
  w.hiddenNode = w.secretExit ? nodes.findIndex((n) => n.kind === 'exit') : -1;
  return w;
}

/** The tiles of a road, from its first stop to its second: vertically first, then horizontally. */
export function roadOf(w, e) {
  let { x, y } = w.nodes[w.edges[e].a];
  const b = w.nodes[w.edges[e].b];
  const pts = [{ x, y }];
  while (y !== b.y) pts.push({ x, y: (y += Math.sign(b.y - y)) });
  while (x !== b.x) pts.push({ x: (x += Math.sign(b.x - x)), y });
  return pts;
}

/** The tiles to walk from one stop to a neighbouring one. */
export function roadBetween(w, a, b) {
  let e = w.edges.findIndex((r) => r.a === a && r.b === b);
  if (e >= 0) return roadOf(w, e);
  e = w.edges.findIndex((r) => r.a === b && r.b === a);
  return e >= 0 ? roadOf(w, e).reverse() : null;
}

export const neighbours = (w, i) => w.edges.flatMap((e) => (e.a === i ? [e.b] : e.b === i ? [e.a] : []));

/** index of the stop of a kind ('entry', 'exit'), or of a level; -1 if there is none */
export const nodeIndex = (w, kind, level) => w.nodes.findIndex((n) => n.kind === kind && (kind !== 'level' || n.level === level));

/** Whether folding the side of the map that lies in `dir` of a tile over it brings the two halves together. */
export function joins(w, tile, dir) {
  const h = w.halves;
  if (!h) return false;
  const vertical = dir === 'left' || dir === 'right'; // the crease stands upright
  const k = vertical ? (dir === 'right' ? tile.x + 1 : tile.x) : dir === 'down' ? tile.y + 1 : tile.y;
  const lifted = (p) => {
    const v = vertical ? p.x : p.y;
    return dir === 'right' || dir === 'down' ? v >= k : v < k;
  };
  const lands = (p, q) => (vertical ? 2 * k - 1 - p.x === q.x && p.y === q.y : p.x === q.x && 2 * k - 1 - p.y === q.y);
  return (lifted(h.a) && !lifted(h.b) && lands(h.a, h.b)) || (lifted(h.b) && !lifted(h.a) && lands(h.b, h.a));
}

export const worlds = [
  // 10 - out          Levels 1 to 5 lie on one road, so the basics cannot be
  //  |  \               skipped. Then it forks: 6 7 or 8 9, with a path between
  //  7 - 8 - 9          7 and 8. Both ways meet again at 10, the last level.
  //  |   |
  //  6 - 5 - 4
  //          |
  //  1 - 2 - 3
  world('grass', 'leaf island', {
    levels: [0, 10],
    spots: [[1, 7], [3, 7], [5, 7], [5, 5], [3, 5], [1, 5], [1, 3], [3, 3], [5, 3], [3, 1]],
    exit: [3, 0],
    roads: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 8], [6, 7], [7, 8], [8, 9], [7, 10], [9, 10], [10, 'out']],
    halves: [[0, 4], [5, 4]],
    rows: ['tgt.tgt', 'g.t.t.t', 't.g.g.t', 'g.t.t.g', 'tg.t.gt', '..g.g..', 'g.t.t.g', '.t.g.t.', '_tg.tg_'],
  }),
  // Levels 1 to 4 lie on one road. Then it forks: 5 6 on one side, 7 on the
  // other, and both meet again at 8, the last level.
  world('water', 'wave island', {
    levels: [10, 18],
    entry: [1, 8],
    spots: [[1, 6], [3, 6], [5, 6], [5, 4], [3, 4], [1, 4], [5, 2], [3, 1]],
    exit: [3, 0],
    roads: [['in', 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [6, 8], [7, 8], [8, 'out']],
    halves: [[3, 2], [3, 5]],
    rows: Array(9).fill('~~~~~~~'),
  }),
  world('volcano', 'ember island', {
    levels: [18, 26],
    entry: [5, 8],
    spots: [[5, 6], [3, 6], [1, 6], [1, 4], [3, 4], [5, 4], [1, 2], [3, 1]],
    exit: [3, 0],
    roads: [['in', 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [6, 8], [7, 8], [8, 'out']],
    halves: [[3, 2], [3, 5]],
    rows: ['_^^l^^_', '^l^^^^^', '^^l^^l^', 'l^^^l^^', '^^^^l^^', '^^l^^l^', 'l^^^^^^', '^^l^^^^', '_^^^l^^'],
  }),
  // Levels 1 to 4 zigzag up through the clouds. Then it forks: 5 6 on one
  // side, 7 on the other, and both meet again at 8, the last level of the game.
  // A hidden gate beside level 3 appears when every level in the game has three pinwheels.
  world('sky', 'sky island', {
    levels: [26, 34],
    entry: [3, 8],
    spots: [[3, 6], [5, 6], [5, 4], [3, 4], [1, 4], [1, 2], [3, 2], [5, 1]],
    exit: [6, 3],
    secretExit: true,
    roads: [['in', 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [6, 8], [7, 8], [3, 'out']],
    halves: [[0, 7], [5, 7]],
    rows: ['s.c...s', 'c...c..', '.s...c.', '..c.s..', 'c...c.s', '..s...c', '.c..c..', 's..c..s', '_c...c_'],
  }),
  // The secret world: the four hardest sheets, one from each world, and
  // behind them the last fold, which opens when every map has been folded.
  //        5
  //        |
  //    2 - 4 - 3      1 leads to 2 and to 3; either reaches 4
  //    |       |
  //    +-- 1 --+
  world('gold', 'gold island', {
    levels: [34, 39],
    entry: [3, 8],
    spots: [[3, 6], [1, 4], [5, 4], [3, 3], [3, 1]],
    isSecret: true,
    lastLocked: true,
    roads: [['in', 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]],
    rows: ['s..s..s', '..s....', '.s...s.', 's......', '...s..s', '.s.....', 's....s.', '..s...s', '_s...s_'],
  }),
];

/** how many levels the four worlds have, not counting the secret world */
export const mainLevelCount = worlds.filter((w) => !w.isSecret).reduce((n, w) => n + w.count, 0);

export function worldIndex(level) {
  const i = worlds.findIndex((w) => level >= w.first && level < w.end);
  return i < 0 ? 0 : i;
}
