// '.' paper  '#' ink wall  '_' hole  'G' goal  'o' pin  'k' key  'D' door  'L' lava
// '<' '>' '^' 'v' wind  'P' player
// `intro` names the element a level introduces; the iPhone app explains it on first entry.
// Every level is checked by `node tools/check.mjs`.
export const LEVELS = [
  // grass: the sheet, ink walls, holes and pins. Shaped by three passes: a teaching
  // order, a check that each level has one real idea, and a redraw for readability.
  // Levels 1-5 are played in order; then 6-7 and 8-9 are two branches that meet at 10.
  {
    name: 'crease',
    hint: 'hold shift + arrow to fold that side of the sheet over yourself',
    touchHint: 'drag a side of the sheet over yourself to fold it.',
    rows: ['.._...', 'P.__.G', '.._...'],
  },
  { name: 'cover', hint: 'blank paper covers ink', intro: 'wall', rows: ['...#..', 'P..#.G', '...#..'] },
  { name: 'upright', hint: 'the sheet folds up and down too', rows: ['...', 'P..', '...', '###', '..G'] },
  { name: 'window', hint: 'a hole on top is a window: what is under it stays', intro: 'hole', rows: ['..__._', 'P...#G', '..__._'] },
  { name: 'panes', hint: '', rows: ['P._..', '.._..', '_____', '.._..', '.._.G'] },
  { name: 'pin', hint: 'a pinned side cannot be lifted', intro: 'pin', rows: ['P.._.', '..._o', '_____', '..._G'] },
  { name: 'stencil', hint: '', rows: ['__..#G', '_.#P#.'] },
  { name: 'notch', hint: 'ink cannot be folded onto you', rows: ['....G', '##_##', 'P....'] },
  { name: 'layers', hint: '', rows: ['.._#.G', '##_###', 'P.....'] },
  { name: 'quilt', hint: '', rows: ['P.#..', '.#.#.', '#.#.#', '.#.#.', '..#.G'] },
  // water: keys and doors. Shaped by the same three passes as grass.
  // Levels 1-4 are played in order; then 5-6 and 7 are two branches that meet at 8.
  { name: 'lock', hint: 'paper cannot cover a door. fold the key onto it.', intro: 'key', rows: ['Pk..D.G'] },
  { name: 'knock', hint: 'the door can come to the key, too', rows: ['.....D.', 'P.k..DG', '.....D.'] },
  { name: 'gate', hint: '', rows: ['.#.#.', 'P.D.G', '.#k#.'] },
  { name: 'shift', hint: 'key and door must meet exactly. move the key first.', rows: ['.....D.', 'Pk...DG', '.....D.'] },
  { name: 'pier', hint: '', rows: ['P.D.G', '__.__', '__k__'] },
  { name: 'countdown', hint: 'walk the key along its row until it stands over the door', rows: ['#P...k', 'GD....', '#.....'] },
  { name: 'keyhole', hint: '', rows: ['#_P..k', 'GD.#..'] },
  { name: 'anchor', hint: '', rows: ['..#..', '_#k#_', '..#..', 'P.D.G'] },
  // ember island: lava burns holes. Levels 1-4 in order; then 5-6 and 7 are two branches that meet at 8.
  { name: 'singe', hint: 'what is folded onto lava burns away with it. a hole is left.', intro: 'lava', rows: ['..._..', 'P..L.G', '..._..'] },
  { name: 'patch', hint: 'a burnt hole can be papered over', rows: ['...L..', 'P..L.G', '...L..'] },
  { name: 'torch', hint: 'no key? fire opens doors too.', rows: ['#.P.', 'GDL.', '.#..'] },
  { name: 'tack', hint: 'fire frees a pinned side', rows: ['#P..', 'G#..', 'L..o'] },
  { name: 'peephole', hint: '', rows: ['#.P.', 'GD.L', '.#..'] },
  { name: 'raft', hint: 'lava folded onto a hole stays lava', rows: ['#.P.', '.D_.', 'G.L.'] },
  { name: 'kindling', hint: '', rows: ['#...', 'P##G', '..L.'] },
  { name: 'pyre', hint: '', rows: ['..._', 'P.oL', '..LG'] },
  // sky: wind. Levels 1-4 in order; then 5-6 and 7 are two branches that meet at 8.
  { name: 'breeze', hint: 'wind carries you. a folded side lands mirrored, so its wind turns round.', intro: 'wind', rows: ['..<..', 'P.<.G', '..<..'] },
  { name: 'updraft', hint: 'folding up or down turns wind that blows up or down', rows: ['..G', 'vvv', '...', 'P..'] },
  { name: 'lull', hint: 'paper folded onto wind calms it', rows: ['...<<.', '.P.<<G', '...<<.'] },
  { name: 'glide', hint: 'wind lifts you over gaps', rows: ['...#>_.', 'P..#>_G', '...#>_.'] },
  { name: 'geyser', hint: 'turn it the right way first', rows: ['oGo', '___', '___', '.P.', 'vvv'] },
  { name: 'bank', hint: 'wind needs somewhere to land', rows: ['.._oG.', '<P____'] },
  { name: 'ladder', hint: '', rows: ['oGo', '_._', '.#.', '...', '___', '.P.', '.v.'] },
  { name: 'cliff', hint: '', rows: ['<._.#_.', '<P_.#_G', '<._.#_.'] },
];

// Levels taken out of the game as the worlds were reshaped. Kept to reuse.
export const ARCHIVE = [
  // from when ink put lava out and left paper: unsolvable or trivial now that lava burns holes
  { name: 'spark', hint: 'paper burns on lava. ink puts it out.', intro: 'lava', rows: ['...L..', '#P.L.G', '...L..'] },
  { name: 'ford', hint: 'one wall puts out one tile of lava', rows: ['..G', 'LLL', 'P..', '...', '.#.'] },
  { name: 'aim', hint: '', rows: ['__G', 'LLL', 'P..', '...', '.#.'] },
  { name: 'soot', hint: 'a wall that has put out lava is used up', rows: ['...L.#.', '#P.L.#G', '...L.#.'] },
  { name: 'stones', hint: '', rows: ['_#.._', 'PL.LG', '_..._'] },
  { name: 'fissure', hint: '', rows: ['P._.', '#.L#', '.L..', 'L..G'] },
  { name: 'chain', hint: '', rows: ['#PLG', '..#L', '.._.'] },
  { name: 'forge', hint: '', rows: ['G.#..', 'LLLLL', '.....', '....#', '.P#..'] },
  { name: 'plume', hint: '', rows: ['..G..', '..#..', 'LL.LL', '.....', '^^^^^', '..P..'] },
  { name: 'vane', hint: '', rows: ['.#D.k', 'GL_..', '__#__', '>.P_.'] },
  { name: 'old last fold', hint: '', rows: ['.#DPk#.', 'GL_.>_.'] },
  // replaced after the full-game review
  { name: 'moat', hint: '', rows: ['..G..', '..D..', 'LL.LL', '.....', '..P..', '..k..'] },
  { name: 'slingshot', hint: '', rows: ['___oGo', '______', '<P_...', '___vvv'] },
  { name: 'blot', hint: '', rows: ['__...._', 'Pk#..DG'] },
  // sky levels replaced when the world was rebuilt around the leap
  { name: 'leap', hint: 'wind lifts you over gaps. turn it the right way first.', rows: ['<P__.oG'] },
  { name: 'hop', hint: '', rows: ['o.G', '...', '___', '___', 'P..', 'v..'] },
  { name: 'kite', hint: '', rows: ['_G_', '_v_', '_v_', '.P.'] },
  { name: 'gap', hint: '', rows: ['..#..', '..#..', 'P<<<G', '..#..', '..#..'] },
  { name: 'bend', hint: '', rows: ['P<<<.', '###^^', '....G'] },
  // the one-mechanic sheets the gold world held before it mixed them
  { name: 'relay', hint: '', rows: ['..P.', '###_', 'G.#_'] },
  { name: 'eddy', hint: '', rows: ['#...._', '#P.#.k', 'GD....'] },
  { name: 'caldron', hint: '', rows: ['#P.#._', '.L.#LG', '...L..'] },
  { name: 'downdraft', hint: '', rows: ['#.v..', 'G#v#P', '.#..#'] },
  { name: 'first last fold', hint: '', rows: ['#_P..k', 'GD_#..', '#....#'] },
  // sky levels that made way when wind learned to carry the boat over gaps
  { name: 'wake', hint: '', rows: ['.>..#..', 'P>..#.G', '.>..#..'] },
  { name: 'pitfall', hint: '', rows: ['#.v..', 'G#.#P'] },
  // the search-made volcano and sky levels that the hand-shaped ones replaced
  { name: 'ember', hint: '', rows: ['.#.PL.G'] },
  { name: 'cinder', hint: '', rows: ['P.L..', '...L.', 'L.#..', 'LLoG.'] },
  { name: 'magma', hint: '', rows: ['.G.#..', '.L#_o.', '#._L..', '_..#LL', '_#L_.P'] },
  { name: 'crater', hint: '', rows: ['P._...', '_.._..', '_#_L_L', 'G...L.', '.o....'] },
  { name: 'summit', hint: '', rows: ['#GL...', 'LL..L_', '_....#', '.._.#.', '..P_.L'] },
  { name: 'caldera', hint: '', rows: ['_#.o._', '.##D..', '.___.#', 'G##._.', '#P.._k'] },
  { name: 'gust', hint: '', rows: ['#...#', '.<.^G', '##P.#'] },
  { name: 'draft', hint: '', rows: ['_v>._', '_.<G_', 'P._..'] },
  { name: 'squall', hint: '', rows: ['___G.', '.ov##', '#_...', '..<P_'] },
  { name: 'gale', hint: '', rows: ['#..oG.', '>##._.', '#._.._', '.v__..', '.P_.#.'] },
  { name: 'storm', hint: '', rows: ['v##<#.', '..#..#', '>#<_..', '^.#_o#', '.P##G.'] },
  { name: 'zephyr', hint: '', rows: ['#._._G', '>_<#..', '_.#_..', '.#^_..', 'P#.^..'] },
  { name: 'porthole', hint: '', rows: ['....#G', '_..P##'] },
  { name: 'latch', hint: '', rows: ['#G.#.', '..#k_', '.._DP', '#.#..'] },
  { name: 'spiral', hint: '', rows: ['.#...', '__.o#', '#.._.', 'G##.P', '#..._'] },
  { name: 'vault', hint: '', rows: ['G...#.', '#####_', '.#.._.', '_o__Pk', '.._..D'] },
  { name: 'undertow', hint: '', rows: ['##k...', '.#o...', '._D..o', 'G##.#.', '##...P'] },
  // a water finale candidate from the teaching pass: crease, cover, windows, then shift
  { name: 'harbor', hint: '', rows: ['__...._', '_______', 'Pk#..DG'] },
  { name: 'corner', hint: '', rows: ['P._..', '.._..', '_____', '..__G'] },
  { name: 'twice', hint: '', rows: ['P..#.#G', '...#.#.', '...#.#.'] },
  { name: 'thicket', hint: '', rows: ['.#..o', '#._..', '..__.', '.P#o.', '_._G.'] },
  // a finale candidate: the cover fold three times, then turn round and pull the goal back over the hole
  { name: 'zipper', hint: '', rows: ['..#.#..', 'P#.#_.G', '..#.#..'] },
  { name: 'far shore', hint: '', rows: ['.._.oG', '...#..', '##._..', '______', '_.P._.'] },
  { name: 'ink', hint: '', rows: ['..#...', '..P#..', '_o#...', '..#.##', '#..#G.'] },
  { name: 'bolt', hint: '', rows: ['o.#.G.', '.####_', '_#_#_D', '_#...k', '.P..__'] },
  { name: 'skeleton', hint: '', rows: ['...#.G', '.oo##.', '.D..#_', '.##._#', 'P_.o.k'] },
  { name: 'origami', hint: '', rows: ['.#....', '._G.o.', '##__#_', '._P...', '_..o..', '_.#_..'] },
];

// The four hardest sheets, one in the style of each world. In the iPhone app they
// make up the secret world, which opens when every level has three pinwheels.
export const BONUS = [
  { name: 'crown', hint: '', rows: ['..G..', '..L..', '##D##', 'vvvvv', '.....', '..P..', '..k..'] },
  { name: 'sentry', hint: '', rows: ['....D..', 'k..PD<G', '....D..'] },
  { name: 'flare', hint: '', rows: ['..LP', 'v..<', '.LG.'] },
  { name: 'brand', hint: '', rows: ['.P.<', '.D.L', '.oLG'] },
];

// The last sheet, at the end of the secret world: it opens when the hidden
// half-pinwheels on all four world maps have been folded together.
export const HIDDEN = [{ name: 'the last fold', hint: '', rows: ['.#Pk', '..D.', 'GL#o', '__>_', '....'] }];

// The overworld: a sheet the player walks across from level to level.
// `rows` is scenery in the same characters as a level; `nodes` are the tiles
// the levels sit on, in order. Paths run vertically first, then horizontally.
export const MAP = {
  rows: [
    '__.....',
    '..o....',
    '......#',
    '...##..',
    '.......',
    '#..._..',
    '......_',
    '...__..',
    '......o',
    '_.#.#..',
    '.......',
  ],
  nodes: [
    [1, 10], [3, 10], [5, 10],
    [5, 8], [3, 8], [1, 8],
    [1, 6], [3, 6], [5, 6],
    [5, 4], [3, 4], [1, 4],
    [1, 2], [3, 2], [5, 2],
    [3, 0],
  ],
};
