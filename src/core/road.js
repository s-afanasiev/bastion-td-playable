// Дорога — ломаная. Позиция врага — пройденное расстояние; точка на поле выводится из него.
// Так скорость не зависит от длины отрезков, а «кто ближе к замку» — сравнение чисел.
export class Road {
  #points;
  #starts = []; // расстояние от начала дороги до начала каждого отрезка

  constructor(points) {
    this.#points = points.map(([x, y]) => ({ x, y }));
    let total = 0;
    for (let i = 0; i < this.#points.length - 1; i++) {
      this.#starts.push(total);
      const a = this.#points[i], b = this.#points[i + 1];
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    this.length = total;
  }

  get points() {
    return this.#points;
  }

  // Записывает точку на расстоянии d в out.x/out.y; за концами — крайние точки.
  pointAt(d, out) {
    const pts = this.#points;
    if (d <= 0) { out.x = pts[0].x; out.y = pts[0].y; return out; }
    if (d >= this.length) { out.x = pts[pts.length - 1].x; out.y = pts[pts.length - 1].y; return out; }
    let i = this.#starts.length - 1;
    while (this.#starts[i] > d) i--;
    const a = pts[i], b = pts[i + 1];
    const t = (d - this.#starts[i]) / Math.hypot(b.x - a.x, b.y - a.y);
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    return out;
  }
}

// Расписание волн — чистое решение (П15): какие враги выходят в промежутке боя [from, to).
// Ни состояния, ни часов: время приходит аргументом, поэтому план проверяется как функция.
export class WavePlan {
  #spawns = []; // { at, kind, wave } по возрастанию at
  #starts = []; // { at, wave } — первый выход каждой волны

  constructor(groups) {
    for (const { wave, at, kind, count, every } of groups) {
      for (let i = 0; i < count; i++) this.#spawns.push({ at: at + i * every, kind, wave });
    }
    this.#spawns.sort((a, b) => a.at - b.at);
    for (const s of this.#spawns) if (!this.#starts.some((w) => w.wave === s.wave)) this.#starts.push({ at: s.at, wave: s.wave });
    this.waves = this.#starts.length;
    this.lastAt = this.#spawns.at(-1)?.at ?? 0;
    this.total = this.#spawns.length;
  }

  spawnsBetween(from, to, fn) {
    for (const s of this.#spawns) if (s.at >= from && s.at < to) fn(s);
  }

  wavesStartingBetween(from, to, fn) {
    for (const w of this.#starts) if (w.at >= from && w.at < to) fn(w);
  }

  finishedBy(time) {
    return time > this.lastAt;
  }
}
