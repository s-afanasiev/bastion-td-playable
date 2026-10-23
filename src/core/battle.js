// Бой — родитель одного кадра ядра (П1, П2): шаги идут в одном порядке и читаются как оглавление.
//   время сценария → выходы волн → шаг врагов → прицел башен → полёт снарядов → уборка → проверка итога
// Дети сообщают факты (дошёл до замка, снаряд приземлился, убит), решения и последствия — здесь:
// награда в казну, прорыв в ворота, итог в сценарий. Про Pixi, DOM и рекламную сеть бой не знает.
export class Battle {
  #d;
  #bus;
  #now = 0;
  #dt = 0;
  // вехи горячего пути — один объект на тип, подписчик читает сразу (см. milestones.js)
  #fired = { type: 'tower.fired', tower: null };
  #landed = { type: 'shot.landed', x: 0, y: 0, tower: null };

  constructor({ scenario, plan, creeps, towers, volleys, treasury, gate }, bus) {
    this.#d = { scenario, plan, creeps, towers, volleys, treasury, gate };
    this.#bus = bus;
  }

  get now() {
    return this.#now;
  }

  step(dt) {
    const { scenario, plan, creeps, towers, volleys } = this.#d;
    this.#now += dt;
    this.#dt = dt;
    const before = scenario.elapsed;
    scenario.tick(dt); // вне боя время сценария стоит — промежуток [before, elapsed) пуст, выходов нет
    plan.wavesStartingBetween(before, scenario.elapsed, this.#waveStarts);
    plan.spawnsBetween(before, scenario.elapsed, this.#spawn);
    creeps.advance(dt, this.#now, this.#breach);
    if (scenario.playing) towers.forEach(this.#aim);
    volleys.advance(dt, this.#land);
    creeps.sweep();
    if (scenario.playing && plan.finishedBy(scenario.elapsed) && creeps.walkingCount === 0) scenario.win('cleared');
  }

  #waveStarts = ({ wave }) => this.#bus.emit({ type: 'wave.started', wave, of: this.#d.plan.waves });

  #spawn = ({ kind }) => this.#d.creeps.spawn(kind);

  #breach = (creep) => {
    const breached = this.#d.gate.breach(creep);
    if (breached.ok && breached.fallen) this.#d.scenario.lose('overrun');
  };

  #aim = (tower) => {
    if (!tower.ready(this.#dt)) return;
    const { stats } = tower;
    const target = tower.kind.targeting.pick(tower.x, tower.y, stats.range, this.#d.creeps, this.#now);
    if (!target || !this.#d.volleys.fire(tower.x, tower.y - 30, target, tower)) return;
    tower.fired();
    this.#fired.tower = tower;
    this.#bus.emit(this.#fired);
  };

  #land = (x, y, target, tower) => {
    tower.kind.impact.apply(x, y, target, tower.stats, this.#d.creeps, this.#now, this.#kill);
    this.#landed.x = x;
    this.#landed.y = y;
    this.#landed.tower = tower;
    this.#bus.emit(this.#landed);
  };

  #kill = (creep) => {
    this.#d.treasury.earn(creep.bounty, 'bounty');
    this.#bus.emit({ type: 'creep.killed', creep });
  };
}
