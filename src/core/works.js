// Работы игрока (П10, П11): процессы получают сущности аргументами и меняют их только через их двери.
// Порядок «сначала все проверки, потом все изменения»: отказ не оставляет половины — золото не списано
// без башни, башня не стоит без оплаты. Сценарий проверки (П42): «площадка свободна, но золота не хватает» →
// отказ not_enough_gold, казна и реестр не тронуты; вариант «списать, потом ставить» оставил бы игрока без денег.

export class BuildTower {
  #treasury;
  #towers;
  #kinds;
  #bus;

  constructor(treasury, towers, kinds, bus) {
    this.#treasury = treasury;
    this.#towers = towers;
    this.#kinds = kinds;
    this.#bus = bus;
  }

  run(spotId, kindKey) {
    const kind = this.#kinds.get(kindKey);
    if (!kind) return { ok: false, code: 'unknown_kind', detail: { kind: kindKey } };
    const free = this.#towers.canPlace(spotId);
    if (!free.ok) return free;
    if (!this.#treasury.canAfford(kind.cost)) {
      return { ok: false, code: 'not_enough_gold', detail: { need: kind.cost, have: this.#treasury.gold } };
    }
    this.#treasury.spend(kind.cost, 'build');
    const placed = this.#towers.place(spotId, kind);
    this.#bus.emit({ type: 'tower.built', tower: placed.tower });
    return placed;
  }
}

export class UpgradeTower {
  #treasury;
  #bus;

  constructor(treasury, bus) {
    this.#treasury = treasury;
    this.#bus = bus;
  }

  run(tower) {
    const can = tower.canUpgrade();
    if (!can.ok) return can;
    if (!this.#treasury.canAfford(can.cost)) {
      return { ok: false, code: 'not_enough_gold', detail: { need: can.cost, have: this.#treasury.gold } };
    }
    this.#treasury.spend(can.cost, 'upgrade');
    tower.upgrade();
    this.#bus.emit({ type: 'tower.upgraded', tower });
    return { ok: true, tower };
  }
}
