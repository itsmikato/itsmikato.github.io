// Loops the chiptunes rendered by tools/song.mjs, one per island, and plays the sound effects
// from tools/sfx.mjs over them. Mirrors Music.swift. A loop is decoded into memory and played
// as one repeating buffer, so the join is exact to the sample. Nothing sounds before the first
// touch or key: browsers do not allow it.

const SFX = ['sfx-fold', 'sfx-win', 'sfx-star1', 'sfx-star2', 'sfx-star3', 'sfx-burn', 'sfx-unlock', 'sfx-gust'];

export class Music {
  constructor() {
    this.ctx = null;
    this.buffers = new Map(); // name -> AudioBuffer, or a promise of one
    this.track = '';
    this.playing = ''; // the track the looping source was made for
    this.source = null;
    this.effect = null;
    this.active = true; // the page is in front
    this.music = true;
    this.sound = true;
  }

  /** Call from a touch or a key press: the first one starts the audio. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && this.active && (this.music || this.sound)) this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.ctx.destination);
    this.effectGain = this.ctx.createGain();
    this.effectGain.connect(this.ctx.destination);
    for (const name of SFX) this.load(name);
    this.resume();
  }

  /** Music and sound effects are switched separately; neither plays while the page is hidden. */
  set(active, music, sound) {
    this.active = active;
    this.music = music;
    this.sound = sound;
    this.resume();
  }

  setTrack(name) {
    if (name === this.track) return;
    this.track = name;
    this.resume();
  }

  /** A one-off sound effect over the music; a new one cuts the last one short. Silent while sound is off. */
  play(name, volume = 0.8) {
    if (!this.ctx || !this.active || !this.sound || this.ctx.state !== 'running') return;
    const buffer = this.buffers.get(name);
    if (!(buffer instanceof AudioBuffer)) return;
    try {
      this.effect?.stop();
    } catch {}
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    this.effectGain.gain.value = volume;
    src.connect(this.effectGain);
    src.start();
    this.effect = src;
  }

  load(name) {
    const have = this.buffers.get(name);
    if (have) return Promise.resolve(have);
    const loading = fetch(`${name}.wav`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(name))))
      .then((data) => new Promise((ok, no) => this.ctx.decodeAudioData(data, ok, no)))
      .then((buffer) => {
        this.buffers.set(name, buffer);
        return buffer;
      })
      .catch(() => {
        this.buffers.delete(name);
        return null;
      });
    this.buffers.set(name, loading);
    return loading;
  }

  stopLoop() {
    try {
      this.source?.stop();
    } catch {}
    this.source = null;
    this.playing = '';
  }

  resume() {
    if (!this.ctx) return;
    if (!this.active || (!this.music && !this.sound)) {
      this.ctx.suspend().catch(() => {});
      return;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this.music || !this.track) return this.stopLoop();
    if (this.playing === this.track) return;
    const want = this.track;
    this.stopLoop();
    this.playing = want;
    this.load(want).then((buffer) => {
      // by now another island may have been reached, or the music switched off
      if (!buffer || this.track !== want || this.playing !== want || !this.music || this.source) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(this.musicGain);
      src.start();
      this.source = src;
    });
  }
}
