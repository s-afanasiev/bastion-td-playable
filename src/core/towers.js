// Каталог видов башен — таблица, принадлежащая своему агрегату (П18): цифры приходят из конфига,
// политика цели и вид попадания подключаются по имени из реестров, переданных в точке сборки (П8).
// Новый вид башни — строка в конфиге, а не ветка в коде.
export class TowerKinds {
  #kinds = new Map();

  constructor(table, levels, { targeting, impacts }) {
    for (const [key, k] of Object.entries(table)) {
      const stats = [];
      for (let level = 1; level <= levels.max; level++) {
        const n = level - 1;
        stats.push(Object.freeze({
          ...k,
          damage: k.damage * levels.damage ** n,
          range: k.range * levels.range ** n,
          interval: k.interval * levels.interval ** n,
        }));
      }
      this.#kinds.set(key, Object.freeze({
        key,
        cost: k.cost,
        upgradeCost: k.upgrade,
        maxLevel: levels.max,
        targeting: targeting[k.targeting],
        impact: impacts[k.impact],
        stats,
      }));
    }
  }

  get(key) {
    return this.#kinds.get(key) ?? null;
  }

  keys() {
    return [...this.#kinds.keys()];
  }
}

// Башня — сущность: построена (уровень 1) → улучшена (уровень 2). Выше уровня нет — отказ с причиной.
// Перезарядка — состояние самой башни, общее для всех её выстрелов, а не одного выстрела.
export class Tower {
  level = 1;
  #cooldown = 0;

  constructor(id, spot, kind) {
    this.id = id;
    this.spot = spot;
    this.kind = kind;
  }

  get x() {
    return this.spot.x;
  }

  get y() {
    return this.spot.y;
  }

  get stats() {
    return this.kind.stats[this.level - 1];
  }

  canUpgrade() {
    if (this.level >= this.kind.maxLevel) return { ok: false, code: 'max_level', detail: { level: this.level } };
    return { ok: true, cost: this.kind.upgradeCost };
  }

  upgrade() {
    const verdict = this.canUpgrade();
    if (verdict.ok) this.level++;
    return verdict;
  }

  // Готова ли к выстрелу после шага времени.
  ready(dt) {
    this.#cooldown -= dt;
    return this.#cooldown <= 0;
  }

  fired() {
    this.#cooldown = this.stats.interval;
  }
}

// Реестр башен по площадкам (П11: поиск сущностей — отдельный реестр). Инвариант: одна башня на площадку.
export class Towers {
  #spots;
  #bySpot = new Map(); // поиск по площадке
  #list = []; // перебор в кадре — индексом по массиву, без итератора Map
  #nextId = 1;

  constructor(spots) {
    this.#spots = spots.map(([x, y], id) => Object.freeze({ id, x, y }));
  }

  get spots() {
    return this.#spots;
  }

  get count() {
    return this.#bySpot.size;
  }

  at(spotId) {
    return this.#bySpot.get(spotId) ?? null;
  }

  canPlace(spotId) {
    if (!this.#spots[spotId]) return { ok: false, code: 'unknown_spot', detail: { spot: spotId } };
    if (this.#bySpot.has(spotId)) return { ok: false, code: 'spot_taken', detail: { spot: spotId } };
    return { ok: true };
  }

  place(spotId, kind) {
    const verdict = this.canPlace(spotId);
    if (!verdict.ok) return verdict;
    const tower = new Tower(this.#nextId++, this.#spots[spotId], kind);
    this.#bySpot.set(spotId, tower);
    this.#list.push(tower);
    return { ok: true, tower };
  }

  forEach(fn) {
    for (let i = 0; i < this.#list.length; i++) fn(this.#list[i]);
  }
}
