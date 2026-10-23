// Казна — сущность с одним инвариантом: золота не бывает меньше нуля (П27).
// Писатель только один — дверь spend(); отказ называет причину и ничего не меняет.
export class Treasury {
  #gold;
  #bus;

  constructor(gold, bus) {
    this.#gold = gold;
    this.#bus = bus;
  }

  get gold() {
    return this.#gold;
  }

  canAfford(cost) {
    return this.#gold >= cost;
  }

  spend(cost, reason) {
    if (!this.canAfford(cost)) return { ok: false, code: 'not_enough_gold', detail: { need: cost, have: this.#gold } };
    this.#change(-cost, reason);
    return { ok: true };
  }

  earn(amount, reason) {
    this.#change(amount, reason);
  }

  #change(delta, reason) {
    this.#gold += delta;
    this.#bus.emit({ type: 'gold.changed', gold: this.#gold, delta, reason });
  }
}

// Замок у дороги: держит заданное число прорывов. Ниже нуля жизни не уходят — прорывы после падения ничего не меняют.
export class Gate {
  #lives;
  #bus;

  constructor(lives, bus) {
    this.#lives = lives;
    this.#bus = bus;
  }

  get lives() {
    return this.#lives;
  }

  get fallen() {
    return this.#lives === 0;
  }

  breach(creep) {
    if (this.fallen) return { ok: false, code: 'already_fallen' };
    this.#lives--;
    this.#bus.emit({ type: 'gate.breached', lives: this.#lives, creep });
    return { ok: true, fallen: this.fallen };
  }
}
