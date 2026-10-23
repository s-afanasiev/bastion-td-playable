import { SlotPool } from './slot-pool.js';

// Снаряды в полёте: состояние — в типизированных массивах по слотам пула, в кадре ничего не создаётся.
// Снаряд самонаводится на цель, павшую цель догоняет до последней известной точки и там «приземляется».
// Пул полон — выстрел не состоялся (fire → false), башня попробует в следующий раз.
export class Volleys {
  #pool;
  #x;
  #y;
  #tx;
  #ty;
  #target;
  #tower;
  #speed;

  constructor({ capacity, speed }) {
    this.#pool = new SlotPool(capacity);
    this.#x = new Float32Array(capacity);
    this.#y = new Float32Array(capacity);
    this.#tx = new Float32Array(capacity);
    this.#ty = new Float32Array(capacity);
    this.#target = new Array(capacity).fill(null);
    this.#tower = new Array(capacity).fill(null);
    this.#speed = speed;
  }

  get active() {
    return this.#pool.used;
  }

  get capacity() {
    return this.#pool.capacity;
  }

  fire(x, y, target, tower) {
    const i = this.#pool.acquire();
    if (i < 0) return false;
    this.#x[i] = x;
    this.#y[i] = y;
    this.#tx[i] = target.x;
    this.#ty[i] = target.y;
    this.#target[i] = target;
    this.#tower[i] = tower;
    return true;
  }

  advance(dt, onLand) {
    const step = this.#speed * dt;
    for (let i = 0; i < this.#pool.capacity; i++) {
      if (!this.#pool.active[i]) continue;
      const t = this.#target[i];
      if (t.walking) { this.#tx[i] = t.x; this.#ty[i] = t.y; }
      const dx = this.#tx[i] - this.#x[i], dy = this.#ty[i] - this.#y[i];
      const dist = Math.hypot(dx, dy);
      if (dist > step) {
        this.#x[i] += (dx / dist) * step;
        this.#y[i] += (dy / dist) * step;
        continue;
      }
      const tower = this.#tower[i];
      this.#target[i] = null;
      this.#tower[i] = null;
      this.#pool.release(i);
      onLand(this.#tx[i], this.#ty[i], t, tower);
    }
  }

  // Для вида: активные снаряды по слотам.
  forEachActive(fn) {
    for (let i = 0; i < this.#pool.capacity; i++) if (this.#pool.active[i]) fn(i, this.#x[i], this.#y[i], this.#tower[i]);
  }

  isActive(slot) {
    return this.#pool.active[slot] === 1;
  }
}
