// Things on a sheet that need a word of explanation the first time they turn up.
// Mirrors Tutorial.swift.

// `demo` is a one-row sheet that shows what the element does, for the little film on its card:
// the boat stands at P, the `dir` side is folded over it, and the boat goes on to the goal.
// `refused` is a fold that is tried first and does not go.
export const ELEMENTS = [
  {
    id: 'wall',
    title: 'ink wall',
    text: 'you cannot walk through ink. fold blank paper onto it and the ink is covered.',
    demo: { rows: '..P#G', dir: 'left' }, // blank paper lands on the ink
    marks: '#',
  },
  {
    id: 'hole',
    title: 'hole',
    text: 'paper folded onto a hole makes a floor. a hole folded onto something works as a window: what lies under it shows through.',
    demo: { rows: '..P_G', dir: 'left' }, // paper lands on the hole and makes a floor
    marks: '_',
  },
  {
    id: 'pin',
    title: 'pin',
    text: 'a pin holds the sheet to the desk. the side of the sheet with a pin on it cannot be folded.',
    demo: { rows: 'o.P_G', dir: 'right', refused: 'left' }, // the pinned side will not lift; the other one does
    marks: 'o',
  },
  {
    id: 'key',
    title: 'key and door',
    text: 'paper cannot cover a door. fold the key onto the door, or the door onto the key, and it opens.',
    demo: { rows: 'k.PDG', dir: 'left' }, // the key lands on the door
    marks: 'kD',
  },
  {
    id: 'lava',
    title: 'lava',
    text: 'lava burns whatever is folded onto it, and whatever it is folded onto. both burn away and a hole is left. even ink, doors and pins burn.',
    demo: { rows: '#.PL.G', dir: 'left' }, // ink lands on the lava: both burn away and a hole is left
    marks: 'L',
  },
  {
    id: 'wind',
    title: 'wind',
    text: 'wind carries the boat along until something stops it, and lifts it over gaps. a folded side lands mirrored, so the wind on it turns round.',
    demo: { rows: '<P_.G', dir: 'left' }, // the gust lands mirrored on the boat and throws it over the gap
    marks: '<>^v',
  },
];

export const elementById = (id) => ELEMENTS.find((e) => e.id === id) || null;

/** whether a level has this element on it */
export const appears = (el, rows) => rows.some((row) => [...row].some((ch) => el.marks.includes(ch)));
