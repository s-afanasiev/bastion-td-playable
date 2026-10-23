// Звук: синтезатор WebAudio (механизм) и таблица «веха → звук» (П18). Новый звук — строка таблицы.
// Ни одного аудиофайла в сборке. Контекст создаётся по первому касанию, на паузе рекламы — приостанавливается.
export class Synth {
  #ctx = null;
  #out = null;
  #noise = null;
  #muted = false;
  #last = new Map();

  unlock() {
    if (this.#ctx) {
      if (this.#ctx.state === 'suspended') this.#ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.#ctx = new AudioCtx();
    this.#out = this.#ctx.createGain();
    this.#out.gain.value = this.#muted ? 0 : 0.5;
    this.#out.connect(this.#ctx.destination);
    const length = this.#ctx.sampleRate;
    this.#noise = this.#ctx.createBuffer(1, length, this.#ctx.sampleRate);
    const data = this.#noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMuted() {
    this.#muted = !this.#muted;
    if (this.#out) this.#out.gain.value = this.#muted ? 0 : 0.5;
    return this.#muted;
  }

  // Пауза и возобновление — пара у одного владельца (П39).
  suspend() {
    this.#ctx?.suspend();
  }

  resume() {
    if (this.#ctx?.state === 'suspended') this.#ctx.resume();
  }

  // Одинаковые звуки чаще gap секунд сливаются в один: десяток выстрелов разом звучит как треск.
  throttled(key, gap) {
    const ctx = this.#ctx;
    if (!ctx || ctx.currentTime - (this.#last.get(key) ?? -1) < gap) return false;
    this.#last.set(key, ctx.currentTime);
    return true;
  }

  tone(type, from, to, gain, duration, delay = 0) {
    const ctx = this.#ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    osc.connect(this.#envelope(gain, t, duration));
    osc.start(t);
    osc.stop(t + duration);
  }

  noise(filterType, from, to, gain, duration) {
    const ctx = this.#ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.#noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    src.connect(filter).connect(this.#envelope(gain, t, duration));
    src.start(t, Math.random() * 0.5, duration);
  }

  #envelope(gain, t, duration) {
    const env = this.#ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    env.connect(this.#out);
    return env;
  }
}

const SHOTS = {
  archer: (s) => s.throttled('archer', 0.08) && s.tone('triangle', 1400, 700, 0.06, 0.06),
  cannon: (s) => s.throttled('cannon', 0.1) && s.noise('lowpass', 900, 120, 0.35, 0.3),
  frost: (s) => s.throttled('frost', 0.1) && s.tone('sine', 1900, 1300, 0.06, 0.12),
};

const SOUNDS = {
  'tower.built': (s) => { s.tone('triangle', 330, 660, 0.18, 0.15); s.tone('triangle', 660, 990, 0.14, 0.18, 0.08); },
  'tower.upgraded': (s) => { s.tone('sine', 660, 1320, 0.2, 0.22); s.tone('triangle', 990, 1980, 0.14, 0.25, 0.09); },
  'tower.fired': (s, e) => SHOTS[e.tower.kind.key](s),
  'creep.killed': (s, e) => (e.creep.kind === 'boss' ? s.noise('lowpass', 900, 100, 0.7, 0.8) : s.throttled('pop', 0.04) && s.tone('sine', 320, 90, 0.18, 0.14)),
  'gate.breached': (s) => s.tone('square', 220, 110, 0.15, 0.3),
  'wave.started': (s) => s.tone('sawtooth', 160, 120, 0.12, 0.5),
  'action.refused': (s) => s.tone('square', 170, 150, 0.1, 0.12),
  'menu.opened': (s) => s.tone('sine', 900, 1200, 0.08, 0.05),
};

export function soundsFor(synth) {
  return (e) => SOUNDS[e.type]?.(synth, e);
}
