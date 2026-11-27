// All of the game's state and flow, with no drawing in it. Mirrors Game.swift in the iPhone app:
// the same rules for what is open, the same timings, the same words.
import { gust } from './gust.js';
import { DIRS, at, canWalk, creaseFor, fold, isWon, move, parseLevel } from './logic.js';
import { T, STRIP_H, titleStrip } from './painter.js';
import { ELEMENTS, appears, elementById } from './tutorial.js';
import { PALETTES, joins, levels, mainLevelCount, neighbours, nodeIndex, roadBetween, worldIndex, worlds } from './worlds.js';

export const FOLD_TIME = 0.52;
const STEP_TIME = 0.07;
const UNSOLVED = -1;
/** how long a level's sheet takes to unfold, and to fold away */
export const OPEN_TIME = 0.4;
const CLOSE_TIME = 0.42;
const REVEAL_TIME = 1.6;
/** a peek fold of the map: over, held, and back */
const PEEK_TIME = 1.9;
const DIR_NAMES = Object.keys(DIRS); // left, right, up, down

export const clock = () => performance.now() / 1000;

// ---- saving: localStorage where it is allowed, memory where it is not (an iframe, private mode) ----

const memory = new Map();
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const v = JSON.parse(raw);
        // a value of another kind (the first web version kept some of these keys differently) does not count
        return fallback == null || typeof v === typeof fallback ? v : fallback;
      }
    } catch {}
    return memory.has(key) ? memory.get(key) : fallback;
  },
  set(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
const list = (key) => {
  const v = store.get(key, []);
  return Array.isArray(v) ? v : [];
};

const MAPS_NOTICE = {
  title: 'one door is still shut',
  text: 'four gold sheets are folded. but the old maps are paper too. go back to them and look closely: perhaps a map can be folded as well.',
};

export class Game {
  constructor(music) {
    this.music = music;
    this.canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.musicOn = store.get('fold.music', true) !== false;
    this.soundOn = store.get('fold.sound', true) !== false;
    this.hapticsOn = store.get('fold.haptics', true) !== false;
    // kept by level name, so scores stay with their level when the order changes
    const scores = store.get('fold.scores', {}) || {};
    this.best = levels.map((l) => (Number.isInteger(scores[l.name]) ? scores[l.name] : UNSOLVED));
    this.revealed = new Set(list('fold.bonus'));
    this.seen = new Set(list('fold.seen'));
    this.hinted = new Set(list('fold.hinted'));
    this.visited = new Set([...list('fold.visited'), 0]);
    this.mapsFound = new Set(list('fold.maps'));

    this.screen = 'title';
    this.won = false;
    this.drag = null; // the side of the sheet being dragged over the boat: { dir, turn }
    this.touched = null; // the side under a finger that has not started dragging yet: its crease shows
    this.note = '';
    this.menuOpen = false;
    this.appActive = true;
    this.result = null; // { folds, stars, newBest, secret, at }
    this.resultUp = false;
    this.starsShown = 0;
    this.cards = []; // explanation cards waiting to be read; the first one is on screen
    this.world = 0;
    this.mapNode = 0;
    this.notice = null; // a popup: { title, text }

    this.anim = null;
    this.cam = { x: 0, y: 0 };
    this.pdraw = { x: 0, y: 0 };
    this.shake = 0;
    this.now = clock();
    this.mapTile = { x: 0, y: 0 };
    this.mapDraw = { x: 0, y: 0 };
    this.revealStart = null;
    this.mapFolding = false;
    this.endingSecret = false;
    this.intro = false;
    this.voyage = null; // the island the boat is sailing to for the first time
    this.cut = null; // 'rising' or 'cave'
    this.endingStart = 0;
    this.mapPeek = null;
    this.mapDrag = null;
    this.mapFoundAt = null;
    this.peekHit = false;

    this.history = [];
    this.refusal = null; // a fold that was refused, and when the sheet will say so
    this.walk = [];
    this.trail = []; // tiles on the table the boat is still shown passing over while the wind carries it
    this.lastGust = 0;
    this.mapWalk = [];
    this.lastStep = 0;
    this.lastTick = 0;
    this.press_ = null; // a finger on the sheet: { layout, dir, reach }
    this.mapOpened = 0;
    this.titleStart = clock();
    this.titleClose = null;
    this.storyNext = false;
    this.eraseAsked = false;
    this.levelOpened = 0;
    this.levelClose = null;
    this.burns = [];
    this.burnStart = 0;
    this.opens = [];
    this.landSound = null;
    this.goingOn = null;
    this.noticeGone = 0;
    this.hintDue = null;
    this.guideSaid = '';

    let start = store.get('fold.level', 0);
    start = Number.isInteger(start) && this.hasProgress ? Math.min(Math.max(0, start), levels.length - 1) : 0;
    this.load(start);
    this.placeOnMap(this.levelIndex);
    this.show('title');
    this.syncSound();
  }

  // ---- the phone's little taps and buzzes, where the browser has them ----

  vibrate(pattern) {
    if (!this.canVibrate || !this.hapticsOn) return;
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
  tap() {
    this.vibrate(12);
  }
  light() {
    this.vibrate(6);
  }
  buzz(kind) {
    this.vibrate(kind === 'error' ? [18, 40, 18] : kind === 'warning' ? 28 : [10, 50, 14]);
  }

  get level() {
    return levels[this.levelIndex];
  }
  get here() {
    return worlds[this.world];
  }
  /** the last sheet, opened by folding the hidden halves together on every map */
  get hiddenLevel() {
    return levels.length - 1;
  }
  /** Every gold sheet but the last is solved. */
  get goldDone() {
    for (let i = mainLevelCount; i < this.hiddenLevel; i++) if (!this.solved(i)) return false;
    return true;
  }
  get lastFoldOpen() {
    return this.mapsFound.size >= worlds.filter((w) => w.halves).length;
  }

  // ---- stars (the player sees paper pinwheels) ----

  solved(i) {
    return this.best[i] !== UNSOLVED;
  }
  /** Three pinwheels for the fewest folds possible, two for up to two more, one for getting there at all. */
  starsFor(folds, i) {
    return folds <= levels[i].par ? 3 : folds <= levels[i].par + 2 ? 2 : 1;
  }
  stars(i) {
    return this.solved(i) ? this.starsFor(this.best[i], i) : 0;
  }
  /** three pinwheels on every level of the four worlds */
  get perfect() {
    for (let i = 0; i < mainLevelCount; i++) if (this.stars(i) !== 3) return false;
    return true;
  }

  // ---- what is open ----

  /** Which stops of a world the boat may sail to. A level opens when a level next to it is solved. */
  reach(w) {
    const map = worlds[w];
    const solvedLevel = (j) => map.nodes[j].kind === 'level' && this.solved(map.nodes[j].level);
    return map.nodes.map((node, i) => {
      if (node.kind === 'entry') return true;
      if (node.kind === 'level') {
        const n = node.level;
        // the secret world's last level waits for every map to be folded
        return (
          (!map.lastLocked || n !== map.end - 1 || this.lastFoldOpen) &&
          (this.solved(n) || (w === 0 && i === 0) || neighbours(map, i).some((j) => map.nodes[j].kind === 'entry' || solvedLevel(j)))
        );
      }
      // a hidden gate is open as soon as it has been revealed
      return i === map.hiddenNode ? this.revealed.has(w) : neighbours(map, i).some(solvedLevel);
    });
  }

  // ---- words on screen ----

  folds(n) {
    return `${n} fold${n === 1 ? '' : 's'}`;
  }
  label(i) {
    return i < mainLevelCount ? `${String(i + 1).padStart(2, '0')} ${levels[i].name}` : levels[i].name;
  }

  get palette() {
    switch (this.screen) {
      case 'title':
        return PALETTES.plain;
      case 'ending':
        return this.cut ? PALETTES.gold : this.voyage != null ? worlds[this.world].palette : this.endingSecret && !this.intro ? PALETTES.gold : PALETTES.plain;
      case 'map':
        return this.here.palette;
      default:
        return worlds[worldIndex(this.levelIndex)].palette;
    }
  }

  get headline() {
    if (this.screen === 'level') return this.label(this.levelIndex);
    if (this.screen !== 'map') return '';
    const stop = this.here.nodes[this.mapNode];
    return stop.kind === 'level' ? this.label(stop.level) : this.here.title;
  }

  /** The world the boat is in, for the small line over the island. */
  get worldTitle() {
    return this.here.title;
  }

  get status() {
    if (this.screen === 'map') return `${this.here.levelList.reduce((n, l) => n + this.stars(l), 0)}/${this.here.count * 3}`;
    if (this.screen === 'level') return `folds ${this.sheet.folds}`;
    return '';
  }

  get message() {
    switch (this.screen) {
      case 'title':
        return this.titleClose == null && this.eraseAsked ? 'this folds away every pinwheel you have won.' : '';
      case 'ending': {
        const t = this.now - this.endingStart;
        if (this.cut === 'rising') return t < 4.2 ? 'every pinwheel on four islands is turning. the sea begins to stir.' : 'gold island has risen. a new way opens on sky island.';
        if (this.cut === 'cave') return t < 3.6 ? 'every map is folded. on gold island the rock gives way.' : 'a cave. the last sheet waits inside.';
        if (this.voyage != null) return `land ahead: ${worlds[this.world].title}.`;
        if (this.intro) {
          if (t < 5.5) return 'morning. a little paper boat sails out.';
          if (t < 11) return 'on the horizon something rises: islands, folded out of paper.';
          return 'the paper islands. tap to set sail.';
        }
        if (this.endingSecret) return 'the last fold. every sheet, every pinwheel, every map. thank you for playing.';
        return 'the journey is folded and the boat sails on. thank you for playing.' + (this.perfect ? '' : ' some pinwheels are still missing.');
      }
      case 'map': {
        if (this.revealStart != null) return 'every pinwheel in every world is turning. something unfolds.';
        // folding the map is a quiet extra: it only speaks once the halves have met
        if (this.mapFolding) return `the two halves have met: a compass. ${this.mapsFound.size} of ${worlds.filter((w) => w.halves).length} found.`;
        const stop = this.here.nodes[this.mapNode];
        if (stop.kind === 'level') {
          // the pinwheels earned are shown; what three take is for the player to find out
          return (
            (this.solved(stop.level) ? `best: ${this.folds(this.best[stop.level])}. ` : '') +
            'tap again to play.' +
            (!this.here.lastLocked || this.lastFoldOpen ? '' : ' the last door here stays shut for now.')
          );
        }
        return stop.kind === 'exit' ? `the way on to the ${worlds[this.world + 1].title}.` : `the way back to the ${worlds[this.world - 1].title}.`;
      }
      default:
        if (this.won) return '';
        // the walkthrough's word for a side in the hand stands here, where it does not cover the sheet
        if (this.drag && this.sheet.folds === 0 && this.guide) return this.guide.text;
        // what a level has to teach comes as a popup; down here only a refused fold speaks
        return this.note;
    }
  }

  /** Everything the board needs to paint one frame. */
  get board() {
    const guide = this.guide;
    const side = this.touched ?? guide?.side ?? null;
    return {
      screen: this.screen,
      palette: this.palette,
      now: this.now,
      sheet: this.sheet,
      anim: this.anim,
      player: this.pdraw,
      won: this.won,
      creases: this.won || this.anim || this.drag || !side ? [] : [side],
      drag: this.drag,
      shake: this.shake,
      guideTile: !this.walk.length && !this.anim && !this.cards.length ? (guide?.tile ?? null) : null,
      world: this.world,
      reach: this.reach(this.world),
      stars: levels.map((_, i) => this.stars(i)),
      mapTile: this.mapTile,
      mapPlayer: this.mapDraw,
      mapWalking: this.mapWalk.length > 0,
      mapOpened: this.mapOpened,
      bonusShown: this.revealed.has(this.world),
      reveal: this.revealStart == null ? null : Math.min(1, Math.max(0, (this.now - this.revealStart) / REVEAL_TIME)),
      titleStart: this.titleStart,
      mapTitle: this.screen === 'map' ? this.headline : '',
      levelOpened: this.levelOpened,
      levelClose: this.levelClose,
      titleClose: this.titleClose,
      titleOptions: this.titleOptions,
      titleWarn: this.eraseAsked,
      compassHint: this.goldDone || this.mapsFound.size > 0,
      secretReached: worlds.some((w, i) => w.isSecret && this.visited.has(i)),
      burns: this.burns,
      burnStart: this.burnStart,
      opens: this.opens,
      gust: this.gust,
      endingSecret: this.endingSecret,
      intro: this.intro,
      voyage: this.voyage,
      cut: this.cut,
      endingStart: this.endingStart,
      dogEar: this.dogEar,
      mapFolding: this.mapFolding,
      mapsFound: this.mapsFound,
      mapPeek: this.mapPeek,
      mapDrag: this.mapDrag,
      mapFoundAt: this.mapFoundAt,
    };
  }

  // ---- teaching ----

  /** The first level is a walkthrough: one thing to do at a time, with a pointer. */
  get guide() {
    if (this.screen !== 'level' || this.levelIndex !== 0 || this.won) return null;
    const s = this.sheet;
    if (s.folds === 0) {
      if (this.drag) return { text: 'this side folds over you and lands on top. pull it all the way and let go.' };
      if (s.px === 1) return { text: 'you cannot cross the gap. but the paper can move. drag the far side of the sheet over yourself.', side: 'right' };
      return { text: 'this is you. tap the tile at the edge of the gap to walk there.', tile: { x: 1, y: 1 } };
    }
    // after the fold: point at the goal, wherever it has landed
    for (let y = 0; y < s.h; y++) {
      const x = s.cells[y].findIndex((c) => c.t === 'G');
      if (x >= 0) return { text: 'you did not move. the paper did. now tap the coloured sheet to walk to it.', tile: { x, y } };
    }
    return { text: 'the coloured sheet is gone. undo takes back a step.' };
  }

  get card() {
    return this.cards[0] ?? null;
  }

  /** What a level teaches pops up as a card: its hint the first time it is opened, and each step of the first level's walkthrough. */
  teach() {
    if (this.screen !== 'level' || this.won || this.card || this.notice || this.drag || this.anim || this.walk.length || this.trail.length) return;
    if (this.levelClose != null || this.now - this.levelOpened <= OPEN_TIME + 0.15) return;
    const g = this.guide;
    if (g) {
      if (g.text !== this.guideSaid) {
        this.guideSaid = g.text;
        this.notice = { title: 'how to play', text: g.text };
      }
    } else if (this.hintDue) {
      this.notice = { title: 'a hint', text: this.hintDue };
      this.hintDue = null;
    }
  }

  dismissNotice() {
    this.noticeGone = clock();
    this.notice = null;
    this.light();
  }

  /** The four gold sheets are solved: say once, as a popup, where to look next. */
  hintAtMaps() {
    if (this.screen !== 'map' || !this.goldDone || this.lastFoldOpen || store.get('fold.hint.maps', false)) return;
    store.set('fold.hint.maps', true);
    this.notice = MAPS_NOTICE;
    this.buzz('success');
  }

  dismissCard() {
    this.cards.shift();
    this.noticeGone = clock(); // the tap that put it away is not a tap on the board
    this.light();
  }

  /** The ? button: every element on this sheet, explained again. */
  showHelp() {
    this.settle();
    this.cards = ELEMENTS.filter((e) => appears(e, this.level.rows));
    // and what this level itself has to say, once more
    this.guideSaid = '';
    if (this.level.hint) this.hintDue = this.level.hint;
    if (!this.cards.length && !this.level.hint && !this.guide) this.note = 'only paper here. fold it over yourself to reach the coloured sheet.';
  }

  // ---- screens ----

  show(next) {
    this.finishReveal();
    this.screen = next;
    if (next !== 'map') {
      // a fold of the map does not outlive the map
      this.mapPeek = null;
      this.mapDrag = null;
      this.mapFoundAt = null;
      this.mapFolding = false;
    }
    if (next !== 'level') {
      // the result card belongs to the level it was won on
      this.result = null;
      this.resultUp = false;
      this.starsShown = 0;
    }
    if (next === 'map') {
      this.mapOpened = clock();
      // every level in the game has three pinwheels and this map's gate is still hidden: let it unfold
      if (this.here.hiddenNode >= 0 && this.perfect && !this.revealed.has(this.world)) this.revealStart = this.mapOpened + 0.7;
    }
    this.syncMusic();
  }

  finishReveal() {
    if (this.revealStart == null) return;
    this.revealStart = null;
    this.revealed.add(this.world);
    store.set('fold.bonus', [...this.revealed]);
  }

  /** The maps can be folded once the gold sheets before the last one are solved: that is when the game hints at it. */
  get dogEar() {
    return !!this.here.halves && this.goldDone;
  }

  /** Fold a side of the map over the boat for a moment. If that brings the two halves of the compass together, it is found. */
  peek(dir, turn = 1) {
    if (this.mapPeek || this.mapWalk.length) return;
    this.mapPeek = { dir, start: clock(), from: turn };
    this.peekHit = joins(this.here, this.mapTile, dir) && !this.mapsFound.has(this.world);
    this.tap();
    this.music.play('sfx-fold', 0.3);
  }

  /** Each world has its own soundtrack, on its map and in its levels. */
  syncMusic() {
    this.music.setTrack(worlds[this.screen === 'level' ? worldIndex(this.levelIndex) : this.world].track);
  }

  // ---- map ----

  placeOnMap(level) {
    this.world = worldIndex(level);
    this.place(Math.max(0, nodeIndex(this.here, 'level', level)));
  }

  place(node) {
    this.mapNode = node;
    const n = this.here.nodes[node];
    this.mapTile = { x: n.x, y: n.y };
    this.mapDraw = { x: n.x, y: n.y };
    this.mapWalk = [];
  }

  /** Sail along the roads to another stop, passing only through open ones. */
  walkToNode(target) {
    const open = this.reach(this.world);
    if (!this.here.nodes[target] || !open[target] || target === this.mapNode || this.mapWalk.length) return;
    const from = new Map([[this.mapNode, this.mapNode]]);
    const queue = [this.mapNode];
    for (let i = 0; i < queue.length && !from.has(target); i++) {
      for (const next of neighbours(this.here, queue[i])) {
        if (!open[next] || from.has(next)) continue;
        from.set(next, queue[i]);
        queue.push(next);
      }
    }
    if (!from.has(target)) return;
    const hops = [target];
    while (hops[hops.length - 1] !== this.mapNode) hops.push(from.get(hops[hops.length - 1]));
    hops.reverse();
    for (let k = 0; k + 1 < hops.length; k++) this.mapWalk.push(...(roadBetween(this.here, hops[k], hops[k + 1]) || []).slice(1));
    this.mapNode = target;
    this.light();
  }

  /** A swipe on the map takes the road that leaves that way, if there is one. */
  mapSwipe(dir) {
    if (this.mapWalk.length) return;
    const open = this.reach(this.world);
    const [dx, dy] = DIRS[dir];
    for (const next of neighbours(this.here, this.mapNode)) {
      if (!open[next]) continue;
      const pts = roadBetween(this.here, this.mapNode, next);
      if (!pts || pts.length < 2) continue;
      if (pts[1].x - pts[0].x === dx && pts[1].y - pts[0].y === dy) return this.walkToNode(next);
    }
  }

  /** The boat has reached the stop it was sailing to. An anchor leads to the neighbouring island. */
  arrive() {
    const kind = this.here.nodes[this.mapNode].kind;
    if (kind === 'exit') this.enterWorld(this.world + 1, 'entry');
    else if (kind === 'entry') this.enterWorld(this.world - 1, 'exit');
  }

  enterWorld(next, gate) {
    if (!worlds[next]) return;
    const node = nodeIndex(worlds[next], gate);
    if (node < 0) return;
    this.mapFolding = false;
    this.world = next;
    this.place(node);
    // the first time an island is reached, the boat is seen sailing over to it
    if (gate === 'entry' && !this.visited.has(next)) {
      this.visited.add(next);
      store.set('fold.visited', [...this.visited]);
      this.voyage = next;
      this.endingStart = clock();
      this.show('ending');
      this.music.play('sfx-gust', 0.3);
      return;
    }
    this.land();
  }

  /** Show one of the secret's films; a tap, or its end, leads back to the map. */
  play(film) {
    this.revealStart = null; // a gate about to unfold on this map waits until the film is over
    this.cut = film;
    this.endingStart = clock();
    this.show('ending');
    this.buzz('success');
    this.music.play('sfx-win');
  }

  endCut() {
    this.cut = null;
    this.show('map');
    this.light();
  }

  /** The boat has come to a new map: it is shown, and the boat sails in from the anchor. */
  land() {
    this.voyage = null;
    this.show('map');
    this.tap();
    const open = this.reach(this.world);
    const inward = neighbours(this.here, this.mapNode).find((n) => open[n]);
    if (inward != null) this.walkToNode(inward);
  }

  enterLevel() {
    if (this.mapWalk.length) return;
    const stop = this.here.nodes[this.mapNode];
    if (stop.kind !== 'level') return;
    this.load(stop.level);
    this.show('level');
    this.tap();
    // a new element is explained the first time its level is opened
    const el = elementById(this.level.intro);
    if (el && !this.seen.has(el.id)) {
      this.seen.add(el.id);
      store.set('fold.seen', [...this.seen]);
      this.cards = [el];
    }
    // its hint pops up the first time the level is opened
    if (this.level.hint && !this.hinted.has(this.level.name)) {
      this.hinted.add(this.level.name);
      store.set('fold.hinted', [...this.hinted]);
      this.hintDue = this.level.hint;
    }
  }

  /** Something is saved: the title offers to continue, or to start over. */
  get hasProgress() {
    return this.best.some((b) => b !== UNSOLVED);
  }

  /** Which way the wind is carrying the boat at this moment, for the streaks behind it. */
  get gust() {
    if (this.screen !== 'level' || this.anim || !this.trail.length) return null;
    const dx = this.trail[0].x - this.pdraw.x;
    const dy = this.trail[0].y - this.pdraw.y;
    const d = Math.hypot(dx, dy);
    return d > 0.08 ? { dx: dx / d, dy: dy / d } : null;
  }

  /** the choices on the cover: continue or start over with a game saved, otherwise only a start */
  get titleOptions() {
    return this.hasProgress ? ['continue', this.eraseAsked ? 'start over?' : 'new game'] : ['start'];
  }

  /** The title's "new game". With progress saved it asks once more before wiping it. */
  newGame() {
    if (this.screen !== 'title' || this.titleClose != null) return;
    if (this.hasProgress && !this.eraseAsked) {
      this.eraseAsked = true;
      this.light();
      return;
    }
    this.eraseAsked = false;
    for (const key of ['scores', 'level', 'seen', 'bonus', 'maps', 'ending.main', 'ending.secret', 'hint.maps', 'hint.door', 'hinted', 'visited', 'scene.gold']) {
      store.remove(`fold.${key}`);
    }
    this.best = levels.map(() => UNSOLVED);
    this.seen = new Set();
    this.hinted = new Set();
    this.visited = new Set([0]);
    this.revealed = new Set();
    this.mapsFound = new Set();
    this.load(0);
    this.placeOnMap(0);
    this.storyNext = true;
    this.leaveTitle();
  }

  /** The title's "continue". */
  continueGame() {
    if (this.screen === 'title') this.leaveTitle();
  }

  /** The title sheet folds away; what comes next is decided when it is gone. */
  leaveTitle() {
    if (this.titleClose != null) return;
    this.eraseAsked = false;
    this.titleClose = clock();
    this.music.play('sfx-fold', 0.3);
    this.light();
  }

  toTitle() {
    if (this.screen !== 'map') return;
    this.mapWalk = [];
    const n = this.here.nodes[this.mapNode];
    this.mapTile = { x: n.x, y: n.y };
    this.titleStart = clock(); // the title sheet unfolds again
    this.titleClose = null;
    this.show('title');
    this.light();
  }

  /** The level that follows this one, if it lies in the same world and is open: the result card offers it. */
  get nextLevel() {
    const n = this.levelIndex + 1;
    if (n >= levels.length || worldIndex(n) !== worldIndex(this.levelIndex)) return null;
    const w = worldIndex(n);
    const node = nodeIndex(worlds[w], 'level', n);
    return node >= 0 && this.reach(w)[node] ? n : null;
  }

  /** Straight on to the next level: this sheet folds away, the next one unfolds. */
  toNext() {
    const n = this.nextLevel;
    if (n == null || this.screen !== 'level' || this.levelClose != null) return;
    this.goingOn = n;
    this.toMap();
  }

  /** Leave the level: its sheet folds itself away first, then the map comes. */
  toMap() {
    if (this.screen !== 'level' || this.levelClose != null) return;
    this.settle();
    this.result = null;
    this.resultUp = false;
    this.levelClose = clock();
    this.music.play('sfx-fold', 0.2);
  }

  leaveLevel() {
    this.levelClose = null;
    if (this.goingOn != null) {
      // not to the map: the boat is moved on behind the scenes and the next sheet opens
      const n = this.goingOn;
      this.goingOn = null;
      this.placeOnMap(n);
      this.enterLevel();
      return;
    }
    this.placeOnMap(this.levelIndex);
    // The last level of the sky ends the journey; the last fold ends the secret one.
    // Each ending is shown once, and leads back to the map.
    for (const [level, key] of [[mainLevelCount - 1, 'fold.ending.main'], [this.hiddenLevel, 'fold.ending.secret']]) {
      if (!this.won || this.levelIndex !== level || store.get(key, false)) continue;
      store.set(key, true);
      this.endingSecret = level === this.hiddenLevel;
      this.endingStart = clock();
      this.show('ending');
      this.buzz('success');
      this.music.play('sfx-win');
      return;
    }
    this.show('map');
    this.hintAtMaps();
  }

  // ---- level flow ----

  load(i) {
    this.levelIndex = i;
    store.set('fold.level', i);
    this.sheet = parseLevel(this.level.rows);
    this.levelOpened = clock(); // the sheet unfolds
    this.hintDue = null;
    this.guideSaid = '';
    this.burns = [];
    this.opens = [];
    this.landSound = null;
    this.refusal = null;
    this.levelClose = null;
    this.history = [];
    this.walk = [];
    this.trail = [];
    this.won = false;
    this.anim = null;
    this.note = '';
    this.drag = null;
    this.touched = null;
    this.press_ = null;
    this.result = null;
    this.resultUp = false;
    this.starsShown = 0;
    this.cards = [];
    this.cam = { x: this.sheet.w / 2, y: this.sheet.h / 2 };
    this.pdraw = { x: this.sheet.px, y: this.sheet.py };
  }

  // ---- options ----

  openMenu() {
    if (this.notice || this.card || this.resultUp) return;
    this.settle();
    this.menuOpen = true;
    this.light();
  }

  closeMenu() {
    this.menuOpen = false;
    this.noticeGone = clock(); // the tap that closed it is not a tap on the board
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    store.set('fold.music', this.musicOn);
    this.syncSound();
  }

  toggleSound() {
    this.soundOn = !this.soundOn;
    store.set('fold.sound', this.soundOn);
    this.syncSound();
    this.music.play('sfx-star2', 0.5); // so the switch can be heard
  }

  toggleHaptics() {
    this.hapticsOn = !this.hapticsOn;
    store.set('fold.haptics', this.hapticsOn);
    this.tap();
  }

  syncSound() {
    this.music.set(this.appActive, this.musicOn, this.soundOn);
  }

  /** Called as the page comes to the front or leaves it. */
  setActive(active) {
    this.appActive = active;
    this.syncSound();
  }

  undo() {
    this.settle();
    const last = this.history.pop();
    if (!last) return;
    this.sheet = last;
    this.won = false;
    this.result = null;
    this.resultUp = false;
    this.starsShown = 0;
    this.note = '';
  }

  reset() {
    this.load(this.levelIndex);
  }

  /** Fold the side of the sheet lying in `dir` over the boat. `turn` is how far round the finger has already brought it. */
  fold(dir, turn = 1) {
    if (this.won) return;
    this.settle();
    this.note = '';
    const sheet = this.sheet;
    const r = fold(sheet, dir);
    if (r.error === 'edge') return this.refuse(r.error); // nothing there to lift
    if (r.error) {
      // the side lifts a little, will not go, and drops back; then the sheet says why
      this.anim = { from: sheet, dir, start: clock(), duration: 0.3, bump: 0.25, refused: true };
      this.refusal = { at: clock() + 0.3, error: r.error };
      return;
    }
    this.history.push(sheet);
    // the rest of the swing takes its share of the full time
    const left = (Math.PI - Math.acos(turn)) / Math.PI;
    const duration = Math.max(0.12, FOLD_TIME * left);
    this.anim = { from: sheet, dir, start: clock(), from0: turn, to: -1, duration };
    // where lava meets something as this side lands: there it will burn, once the paper is down
    this.burns = [];
    this.opens = [];
    const { vertical, line } = creaseFor(sheet, dir);
    for (let y = 0; y < sheet.h; y++) {
      for (let x = 0; x < sheet.w; x++) {
        const top = sheet.cells[y][x];
        const lifted = vertical ? (dir === 'left' ? x < line : x >= line) : dir === 'up' ? y < line : y >= line;
        if (!lifted || top.t === ' ') continue;
        const lx = vertical ? 2 * line - 1 - x : x;
        const ly = vertical ? y : 2 * line - 1 - y;
        const under = at(sheet, lx, ly);
        if (!under || under.t === ' ') continue;
        if (top.t === 'L' || under.t === 'L') this.burns.push({ x: sheet.ox + lx, y: sheet.oy + ly });
        else if ((top.t === 'k' && under.t === 'D') || (top.t === 'D' && under.t === 'k')) this.opens.push({ x: sheet.ox + lx, y: sheet.oy + ly });
      }
    }
    this.burnStart = clock() + duration;
    if (this.burns.length) this.buzz('warning');
    this.landSound = this.burns.length ? 'sfx-burn' : this.opens.length ? 'sfx-unlock' : null;
    // wind that landed on the boat: wait on the spot while the paper turns, then be carried
    const landed = { ...r, px: sheet.ox + sheet.px - r.ox, py: sheet.oy + sheet.py - r.oy };
    const path = gust(landed);
    if (path.length) {
      this.trail = [[landed.px, landed.py], ...path].map(([x, y]) => ({ x: r.ox + x, y: r.oy + y }));
      if (!this.landSound) this.landSound = 'sfx-gust';
    }
    this.sheet = r;
    this.tap();
    this.music.play('sfx-fold', 0.3);
    this.checkWin();
  }

  /** A fold that does not go: the sheet shakes and says why. Nothing else changes. */
  refuse(error) {
    this.refusal = null;
    this.note = { edge: 'nothing on that side to fold', pinned: 'that side is pinned down', crushed: 'ink would land on you', burned: 'lava would land on you' }[error];
    this.shake = 8;
    this.buzz('error');
  }

  /** A side that cannot be folded was lifted a little and let go: it snaps back flat, then the sheet says why. */
  dropRefused(dir, turn, error) {
    this.note = '';
    this.anim = { from: this.sheet, dir, start: clock(), from0: turn, to: 1, duration: 0.18, refused: true };
    this.refusal = { at: clock() + 0.18, error };
  }

  /** A point on screen, in tiles on the sheet, measured from the middle of the boat's tile. */
  offset(p, layout) {
    const s = this.sheet;
    return {
      x: (p.x - layout.x) / (T * layout.unit) - s.ox - (s.px + 0.5),
      y: (p.y - layout.y) / (T * layout.unit) - s.oy - (s.py + 0.5),
    };
  }

  /** Which side of the sheet a point lies on, seen from the boat; null on the boat's own tile. */
  side(p, layout) {
    const o = this.offset(p, layout);
    if (Math.max(Math.abs(o.x), Math.abs(o.y)) <= 0.5) return null;
    return Math.abs(o.x) > Math.abs(o.y) ? (o.x > 0 ? 'right' : 'left') : o.y > 0 ? 'down' : 'up';
  }

  /** How far a point is from the crease of a side, in tiles; negative once it has crossed over. */
  distance(p, dir, layout) {
    const o = this.offset(p, layout);
    const [dx, dy] = DIRS[dir];
    return (dx !== 0 ? o.x * dx : o.y * dy) - 0.5;
  }

  /**
   * How far round a dragged side is, from where the finger is now. The side follows the finger
   * as if held at the point it was picked up; a point far from the crease counts as nearer, so
   * no drag has to cross the whole sheet.
   */
  turnAt(p, press, distance) {
    if (!press.dir) return 1;
    const grip = Math.min(Math.max(press.reach, 0.6), 1.6);
    const pulled = press.reach - distance.call(this, p, press.dir, press.layout);
    return Math.min(1, Math.max(-1, (grip - pulled) / grip));
  }

  /** How far the finger is from the crease a fold of the map's `dir` side would make, in tiles. */
  mapDistance(p, dir, layout) {
    const x = (p.x - layout.x) / (T * layout.unit);
    const y = (p.y - layout.y) / (T * layout.unit);
    if (dir === 'left') return this.mapTile.x - x;
    if (dir === 'right') return x - (this.mapTile.x + 1);
    if (dir === 'up') return this.mapTile.y - y;
    return y - (this.mapTile.y + 1);
  }

  /** On a map that can be folded, a side grabbed and pulled towards the boat turns over with the finger. */
  pressMap(p, layout) {
    if (!this.dogEar || this.mapPeek || this.mapWalk.length || this.revealStart != null) return;
    if (!this.press_) {
      // the side the finger came down on: the one it is furthest out on
      let dir = DIR_NAMES[0];
      for (const d of DIR_NAMES) if (this.mapDistance(p, d, layout) > this.mapDistance(p, dir, layout)) dir = d;
      const reach = this.mapDistance(p, dir, layout);
      this.press_ = { layout, dir: reach > 0 ? dir : null, reach };
    }
    const press = this.press_;
    if (!press.dir) return;
    const turn = this.turnAt(p, press, this.mapDistance);
    if (!this.mapDrag && turn < 0.94) this.light();
    if (this.mapDrag || turn < 0.94) this.mapDrag = { dir: press.dir, turn };
  }

  /** A finger is down, or moving, on the board. Dragging a side of the sheet towards the boat turns it over with the finger. */
  press(p, layout) {
    if (this.screen === 'map') return this.pressMap(p, layout);
    if (this.screen !== 'level' || this.won || this.card || this.notice || this.menuOpen || this.levelClose != null) return;
    if (this.now - this.levelOpened < OPEN_TIME) return;
    if (!this.press_) {
      this.settle();
      // the view is remembered as it was at touch-down, so the paper stays under the finger
      let dir = this.side(p, layout);
      // a side that will not fold (pinned, or ink or lava would land on the boat) can still be
      // lifted a little; a side with nothing on it cannot
      const error = dir ? fold(this.sheet, dir).error : null;
      if (error === 'edge') dir = null;
      this.press_ = { layout, dir, reach: dir ? this.distance(p, dir, layout) : 0, refused: dir ? error || null : null };
      this.touched = dir && !error ? dir : null;
    }
    const press = this.press_;
    if (!press.dir) return;
    const raw = this.turnAt(p, press, this.distance);
    // a refused side follows the finger with resistance, and never far
    const turn = press.refused ? 1 - (0.3 * (1 - raw)) / 2 : raw;
    if (!this.drag && raw < 0.94) {
      // the finger has started pulling
      this.touched = null;
      this.light();
    }
    if (this.drag || raw < 0.94) this.drag = { dir: press.dir, turn, refused: !!press.refused };
  }

  /** A step with the keyboard. */
  move(dir) {
    if (this.won) return;
    this.settle();
    this.note = '';
    const r = move(this.sheet, dir);
    if (!r) return;
    if (r.px !== this.sheet.px || r.py !== this.sheet.py) this.history.push(this.sheet);
    this.carry(dir);
    this.sheet = r;
    this.checkWin();
  }

  /** Tap-to-walk: shortest path over walkable tiles, played back step by step. */
  walkTo(tx, ty) {
    if (this.won) return;
    this.settle();
    const sheet = this.sheet;
    if (!canWalk(sheet, tx, ty)) return;
    const w = sheet.w;
    // each step lands where the wind leaves the boat, so the search follows the wind too
    const prev = new Map([[sheet.py * w + sheet.px, null]]);
    const queue = [[sheet.px, sheet.py]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      if (x === tx && y === ty) break;
      for (const dir of DIR_NAMES) {
        const to = move({ ...sheet, px: x, py: y }, dir);
        if (!to || prev.has(to.py * w + to.px)) continue;
        prev.set(to.py * w + to.px, { from: y * w + x, dir });
        queue.push([to.px, to.py]);
      }
    }
    const trace = (k) => {
      const out = [];
      for (let hop = prev.get(k); hop; hop = prev.get(hop.from)) out.unshift(hop.dir);
      return out;
    };
    let path = trace(ty * w + tx);
    if (!path.length && (tx !== sheet.px || ty !== sheet.py)) {
      // not a tile the boat can rest on: walk into the wind that crosses it and be carried
      search: for (const [x, y] of queue) {
        for (const dir of DIR_NAMES) {
          const [dx, dy] = DIRS[dir];
          if (!canWalk(sheet, x + dx, y + dy)) continue;
          const from = { ...sheet, px: x + dx, py: y + dy };
          if (![[from.px, from.py], ...gust(from)].some(([gx, gy]) => gx === tx && gy === ty)) continue;
          path = [...trace(y * w + x), dir];
          break search;
        }
      }
    }
    if (!path.length) return;
    let end = sheet;
    for (const dir of path) end = move(end, dir) ?? end;
    if (end.px !== sheet.px || end.py !== sheet.py) this.history.push(sheet);
    this.note = '';
    this.walk = path;
    this.lastStep = 0;
  }

  // ---- touch ----

  /**
   * How the desk maps onto the screen: CSS pixels per art pixel, and where desk (0,0) lies.
   * Unlike the app, which knows its one screen, what is shown is fitted into the room the
   * buttons and the words leave free, whatever the window's shape.
   */
  layout(room, dpr) {
    let w;
    let h;
    let cx;
    let cy;
    if (this.screen === 'level') {
      // the camera drifts to the middle of the sheet as it is folded
      w = (Math.max(...this.level.rows.map((r) => r.length)) + 1.5) * T;
      h = (this.level.rows.length + 1.5) * T;
      cx = this.cam.x * T;
      cy = this.cam.y * T;
    } else if (this.screen === 'map') {
      // the level's name above the map and its pinwheels below belong to the picture
      w = (this.here.w + 1.5) * T;
      h = this.here.h * T + 15 + 21;
      cx = (this.here.w * T) / 2;
      cy = (this.here.h * T + 6) / 2;
    } else if (this.screen === 'title') {
      // from the top of the pinwheel down to the game's total
      w = 105;
      h = 186;
      cx = 45;
      cy = 58;
    } else {
      w = 100;
      h = 166;
      cx = 45;
      cy = 17;
    }
    const fit = Math.min((room.w * dpr) / w, (room.h * dpr) / h);
    // whole device pixels per art pixel, so the pixel art stays crisp
    const unit = Math.max(1, Math.min(Math.floor(8 * dpr), Math.floor(fit))) / dpr;
    const snap = (v) => Math.round(v * dpr) / dpr;
    return { unit, x: snap(room.x + room.w / 2 - cx * unit), y: snap(room.y + room.h / 2 - cy * unit) };
  }

  /** The finger has lifted: a tap walks, a drag folds. `flick` is where the finger was heading. */
  touch(start, end, flick, layout) {
    const held = this.press_;
    const dragged = this.drag;
    this.press_ = null;
    this.drag = null;
    this.touched = null;
    if (this.card) return this.dismissCard();
    // a popup is up, or the tap that put it away is only now arriving here
    if (this.notice || this.menuOpen || clock() - this.noticeGone < 0.2) return;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const swiped = Math.hypot(dx, dy) >= 24;
    // where the finger went down, in tiles on the desk
    let tx = (start.x - layout.x) / (T * layout.unit);
    let ty = (start.y - layout.y) / (T * layout.unit);
    const axis = (x, y) => (Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up');
    switch (this.screen) {
      case 'ending':
        if (this.cut) return this.endCut();
        if (this.voyage != null) return this.land();
        this.intro = false;
        this.show('map');
        this.light();
        return;
      case 'title': {
        if (this.titleClose != null || this.now - this.titleStart <= 0.7) return;
        // the strips under the name: the first continues (or starts), the second starts over
        const y = ty * T;
        const on = (n) => y >= titleStrip(n) - 2 && y < titleStrip(n) + STRIP_H + 2;
        if (!this.hasProgress) this.newGame(); // nothing saved yet: a tap anywhere begins, story and all
        else if (on(0)) this.continueGame();
        else if (on(1)) this.newGame();
        else this.eraseAsked = false; // a tap beside them takes "start over?" back
        return;
      }
      case 'map': {
        if (this.mapPeek) return;
        // A tap sails; a drag folds. Once this world's map can be folded, a side pulled
        // towards the boat turns over with the finger. Let go past upright, or flick it,
        // and it falls over the boat; otherwise it drops back. Before that a swipe sails.
        if (this.mapDrag) {
          const d = this.mapDrag;
          this.mapDrag = null;
          if (held && (d.turn < 0.15 || this.turnAt(flick, held, this.mapDistance) < -0.3)) this.peek(d.dir, d.turn);
          return;
        }
        if (swiped && this.dogEar) return;
        if (swiped) return this.mapSwipe(axis(dx, dy));
        if (this.mapWalk.length) return;
        // the nearest stop, if the tap landed on or right next to it
        const nodes = this.here.nodes;
        const far = (i) => Math.hypot(tx - nodes[i].x - 0.5, ty - nodes[i].y - 0.5);
        const open = this.reach(this.world);
        let hit = -1;
        nodes.forEach((_, i) => {
          if (i === this.here.hiddenNode && !open[i]) return; // the secret stays secret
          if (hit < 0 || far(i) < far(hit)) hit = i;
        });
        if (hit < 0 || far(hit) >= 0.9) return;
        if (hit !== this.mapNode && open[hit]) this.mapFolding = false;
        if (hit === this.mapNode) this.enterLevel();
        else if (open[hit]) this.walkToNode(hit);
        else if (this.here.lastLocked && this.goldDone && !this.lastFoldOpen && nodes[hit].kind === 'level') this.notice = MAPS_NOTICE; // the shut door repeats the hint
        else this.buzz('error');
        return;
      }
      default: {
        if (this.won) return; // the result card has the buttons
        // a touch that did not begin on this sheet (it came down on a card, or before the
        // sheet had unfolded) is not a tap on it
        if (!held || this.now - this.levelOpened < OPEN_TIME) return;
        tx -= this.sheet.ox;
        ty -= this.sheet.oy;
        if (dragged && held.refused) {
          this.dropRefused(dragged.dir, dragged.turn, held.refused); // not even a flick takes it over
        } else if (dragged) {
          // Let go with the side past upright, or flicked that way, and it
          // falls over the boat. Otherwise it drops back where it was.
          if (dragged.turn < 0.15 || this.turnAt(flick, held, this.distance) < -0.3) this.fold(dragged.dir, dragged.turn);
          else this.anim = { from: this.sheet, dir: dragged.dir, start: clock(), from0: dragged.turn, to: 1, duration: 0.16 };
        } else if (swiped) {
          // a drag that turned nothing: say why that side will not fold
          const dir = this.side(start, held.layout);
          if (dir && fold(this.sheet, dir).error && this.distance(end, dir, held.layout) < this.distance(start, dir, held.layout) - 0.3) this.fold(dir);
        } else {
          this.walkTo(Math.floor(tx), Math.floor(ty));
        }
      }
    }
  }

  /** A touch that the browser took away (a call, a gesture of its own): nothing happens, the paper drops back. */
  cancelTouch() {
    if (this.drag && this.screen === 'level' && !this.drag.refused) this.anim = { from: this.sheet, dir: this.drag.dir, start: clock(), from0: this.drag.turn, to: 1, duration: 0.16 };
    this.press_ = null;
    this.drag = null;
    this.touched = null;
    this.mapDrag = null;
  }

  // ---- time ----

  /** Finish anything still in motion so the next input acts on the real state. */
  settle() {
    while (this.walk.length) this.step();
    this.trail = [];
    this.anim = null;
    this.refusal = null;
  }

  step() {
    const dir = this.walk.shift();
    const r = move(this.sheet, dir);
    if (r) {
      this.carry(dir);
      this.sheet = r;
    }
    this.checkWin();
  }

  /** Before a step in `dir` is taken: if wind will carry the boat on, remember the way it goes. */
  carry(dir) {
    const [dx, dy] = DIRS[dir];
    const s = { ...this.sheet, px: this.sheet.px + dx, py: this.sheet.py + dy };
    const path = gust(s);
    if (!path.length) return;
    this.trail.push(...[[s.px, s.py], ...path].map(([x, y]) => ({ x: s.ox + x, y: s.oy + y })));
    this.music.play('sfx-gust', 0.4);
  }

  checkWin() {
    if (this.won || !isWon(this.sheet)) return;
    this.won = true;
    this.walk = [];
    const i = this.levelIndex;
    const folds = this.sheet.folds;
    const newBest = this.solved(i) && folds < this.best[i];
    if (!this.solved(i) || folds < this.best[i]) {
      this.best[i] = folds;
      const scores = {};
      levels.forEach((l, n) => {
        if (this.solved(n)) scores[l.name] = this.best[n];
      });
      store.set('fold.scores', scores);
    }
    this.buzz('success');
    this.music.play('sfx-win');
    this.result = {
      folds,
      stars: this.starsFor(folds, i),
      newBest,
      // this win gave every level three pinwheels, and the way to the secret world is still hidden
      secret: this.perfect && !worlds.some((w, n) => w.hiddenNode >= 0 && this.revealed.has(n)),
      at: clock() + 0.55,
    };
    this.resultUp = false;
    this.starsShown = 0;
  }

  tick() {
    const t = clock();
    const frames = this.lastTick === 0 ? 1 : Math.min(4, (t - this.lastTick) * 60);
    this.lastTick = t;
    this.now = t;
    switch (this.screen) {
      case 'title':
        if (this.titleClose != null && t - this.titleClose >= 0.75) {
          this.titleClose = null;
          // a new game opens with the story, between the title and the map
          if (this.storyNext) {
            this.storyNext = false;
            this.intro = true;
            this.endingStart = t;
            this.show('ending');
          } else {
            this.show('map');
          }
        }
        break;
      case 'ending':
        if (this.cut && t - this.endingStart > 8) this.endCut();
        else if (this.voyage != null && t - this.endingStart > 4.6) this.land(); // the crossing ends by itself
        break;
      case 'map': {
        if (this.revealStart != null && t - this.revealStart >= REVEAL_TIME) {
          this.finishReveal();
          this.buzz('success');
        }
        if (this.mapPeek) {
          // the halves meet as the side lands
          if (this.peekHit && t - this.mapPeek.start >= 0.55) {
            this.peekHit = false;
            this.mapsFound.add(this.world);
            this.mapFolding = true; // say so until the boat moves on
            this.mapFoundAt = t;
            store.set('fold.maps', [...this.mapsFound]);
            this.buzz('success');
            this.music.play('sfx-win');
          }
          if (t - this.mapPeek.start >= PEEK_TIME) this.mapPeek = null;
        }
        // once the celebration of the last map is over, say what it opened
        if (this.mapFoundAt != null && t - this.mapFoundAt > 2.8 && this.lastFoldOpen && !store.get('fold.hint.door', false)) {
          store.set('fold.hint.door', true);
          this.play('cave'); // the cave where the last sheet lies opens on gold island
          break;
        }
        // every level on the four islands has its three pinwheels: gold island rises, once
        if (!this.cut && this.perfect && !this.mapWalk.length && !this.mapPeek && !this.notice && !this.menuOpen && t - this.mapOpened > 0.5 && !store.get('fold.scene.gold', false)) {
          store.set('fold.scene.gold', true);
          this.play('rising');
          break;
        }
        if (this.mapWalk.length && t - this.lastStep > 0.055) {
          this.lastStep = t;
          this.mapTile = this.mapWalk.shift();
          if (!this.mapWalk.length) this.arrive();
        }
        const k = 1 - 0.5 ** frames;
        this.mapDraw.x += (this.mapTile.x - this.mapDraw.x) * k;
        this.mapDraw.y += (this.mapTile.y - this.mapDraw.y) * k;
        break;
      }
      default: {
        if (this.levelClose != null && t - this.levelClose >= CLOSE_TIME) {
          this.leaveLevel();
          break;
        }
        if (this.landSound && t >= this.burnStart) {
          const sound = this.landSound;
          this.landSound = null;
          this.music.play(sound, sound === 'sfx-gust' ? 0.4 : 0.6);
          if (sound === 'sfx-unlock') this.buzz('success');
        }
        if (this.refusal && t >= this.refusal.at) this.refuse(this.refusal.error);
        this.teach();
        if (this.trail.length && !this.anim && t - this.lastGust > 0.09) {
          this.lastGust = t;
          this.trail.shift();
        }
        if (this.walk.length && !this.trail.length && t - this.lastStep > STEP_TIME) {
          this.lastStep = t;
          this.step();
        }
        if (this.anim && t - this.anim.start >= this.anim.duration) this.anim = null;
        // the result card comes up a moment after the win, then its stars arrive one at a time
        const r = this.result;
        if (r && t >= r.at) {
          this.resultUp = true;
          const due = Math.min(r.stars, Math.max(0, Math.floor((t - r.at - 0.3) / 0.32) + 1));
          if (t - r.at >= 0.3 && due > this.starsShown) {
            this.starsShown = due;
            this.music.play(`sfx-star${due}`);
            this.light();
          }
        }
        // The camera waits for the fold to finish, then drifts to the new centre,
        // so the paper is seen to move and the boat is seen to stay put.
        const s = this.sheet;
        if (!this.anim && !this.press_) {
          // and not while a finger holds the paper
          const k = 1 - 0.93 ** frames;
          this.cam.x += (s.ox + s.w / 2 - this.cam.x) * k;
          this.cam.y += (s.oy + s.h / 2 - this.cam.y) * k;
        }
        const k = 1 - 0.55 ** frames;
        const goal = this.trail[0] ?? { x: s.ox + s.px, y: s.oy + s.py };
        this.pdraw.x += (goal.x - this.pdraw.x) * k;
        this.pdraw.y += (goal.y - this.pdraw.y) * k;
        if (this.shake > 0) this.shake -= 1;
      }
    }
  }
}
