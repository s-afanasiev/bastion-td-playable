// Враг — сущность с путём (П21): рождается при выходе волны, живёт, пока идёт по дороге,
// умирает одним из двух исходов — убит (killed) или прорвался к замку (breached). Условие смерти объявлено здесь.
export class Creep {
  state = 'walking';
  distance = 0;
  x = 0;
  y = 0;
  chillUntil = 0;
  chillFactor = 0;
  #road;

  constructor(kind, { hp, speed, bounty, radius }, road) {
    this.kind = kind;
    this.hp = this.maxHp = hp;
    this.speed = speed;
    this.bounty = bounty;
    this.radius = radius;
    this.#road = road;
    road.pointAt(0, this);
  }

  get walking() {
    return this.state === 'walking';
  }

  isChilled(now) {
    return now < this.chillUntil;
  }

  // Шаг по дороге. true — именно этим шагом дошёл до замка.
  advance(dt, now) {
    if (!this.walking) return false;
    this.distance += this.speed * (this.isChilled(now) ? 1 - this.chillFactor : 1) * dt;
    if (this.distance >= this.#road.length) {
      this.state = 'breached';
      return true;
    }
    this.#road.pointAt(this.distance, this);
    return false;
  }

  // Урон по идущему врагу. true — именно этот удар его убил; по павшему и прорвавшемуся урона нет.
  hit(damage) {
    if (!this.walking) return false;
    this.hp -= damage;
    if (this.hp > 0) return false;
    this.hp = 0;
    this.state = 'killed';
    return true;
  }

  chill(factor, until) {
    if (!this.walking) return;
    this.chillFactor = Math.max(this.chillFactor, factor);
    this.chillUntil = Math.max(this.chillUntil, until);
  }
}

// Повторитель врагов (П16): рождает свежий экземпляр на каждый выход, ведёт идущих, убирает отживших.
// Правило повторения — здесь; состояние одного врага — в его экземпляре, общего накопителя нет.
export class Creeps {
  all = []; // только для чтения снаружи: политики цели перебирают без аллокаций
  #road;
  #kinds;
  #bus;

  constructor(road, kinds, bus) {
    this.#road = road;
    this.#kinds = kinds;
    this.#bus = bus;
  }

  get walkingCount() {
    let n = 0;
    for (const c of this.all) if (c.walking) n++;
    return n;
  }

  spawn(kind) {
    const creep = new Creep(kind, this.#kinds[kind], this.#road);
    this.all.push(creep);
    this.#bus.emit({ type: 'creep.spawned', creep });
    return creep;
  }

  advance(dt, now, onBreach) {
    for (const c of this.all) if (c.advance(dt, now)) onBreach(c);
  }

  // Отжившие уходят из списка на месте, без нового массива.
  sweep() {
    let w = 0;
    for (const c of this.all) if (c.walking) this.all[w++] = c;
    this.all.length = w;
  }
}
