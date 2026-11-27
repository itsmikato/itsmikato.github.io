// Every tile the wind carries the boat over from where it stands, in order: the same walk as
// blow() in logic.js (which only says where it ends), kept apart so the rules stay untouched.
import { at, canWalk } from './logic.js';

const WIND = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], v: [0, 1] };

export const windOf = (t) => WIND[t] || null;

export function gust(s) {
  let d = WIND[at(s, s.px, s.py)?.t];
  if (!d) return [];
  let x = s.px;
  let y = s.py;
  const path = [];
  const seen = new Set();
  for (;;) {
    const k = `${x},${y},${d}`;
    if (seen.has(k)) break; // stop if it starts going round in circles
    seen.add(k);
    let nx = x + d[0];
    let ny = y + d[1];
    // the wind lifts the boat over gaps: a run of holes is crossed if there is footing beyond it
    while (at(s, nx, ny)?.t === ' ') {
      nx += d[0];
      ny += d[1];
    }
    if (!canWalk(s, nx, ny)) break;
    x = nx;
    y = ny;
    path.push([x, y]);
    const t = at(s, x, y).t;
    if (t === 'G') break;
    d = WIND[t] || d;
  }
  return path;
}
