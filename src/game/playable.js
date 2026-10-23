// Корень рекламы — жизнь целиком (П20): конструктор говорит, из чего она состоит, run() запускает в записанном
// порядке, stop() — зеркально в обратном. Кадр — оглавление: шаг ядра, затем проекции видов.
// Пауза и возобновление — пара у одного владельца (П39): реклама скрыта — ни кадров, ни звука.
export class Playable {
  #d;
  #stopped = false;

  constructor({ network, stage, battle, layers, views, tutorial, synth, debug }) {
    this.#d = { network, stage, battle, layers, views, tutorial, synth, debug };
  }

  run() {
    const { network, stage, layers } = this.#d;
    stage.world.addChild(...layers);
    network.onVisibility((visible) => (visible ? this.resume() : this.pause()));
    stage.run(this.#frame);
    return this;
  }

  pause() {
    this.#d.stage.pause();
    this.#d.synth.suspend();
  }

  resume() {
    if (this.#stopped) return;
    this.#d.stage.resume();
    this.#d.synth.resume();
  }

  // Обратный порядок запуска; повторный вызов ничего не делает.
  stop() {
    if (this.#stopped) return;
    this.#stopped = true;
    this.#d.synth.suspend();
    this.#d.stage.stop();
  }

  #frame = (dt) => {
    const { battle, views, tutorial, debug } = this.#d;
    battle.step(dt);
    views.creeps.sync(dt, battle.now);
    views.volleys.sync();
    views.sparks.update(dt);
    views.spots.update(dt);
    tutorial.update(dt);
    debug?.frame(dt);
  };
}
