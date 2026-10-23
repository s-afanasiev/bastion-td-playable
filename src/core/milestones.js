// Вехи — единственный механизм наблюдаемости (П25). Узлы объявляют факты, подписчики — интерфейс, звук, эффекты,
// подсказки, адаптер сети — подключаются в точке сборки. Веха — сигнал, а не команда: по ней ничего не решают в ядре.
//
// Алфавит:
//   scenario        { from, to, cause }        переход сценария рекламы
//   wave.started    { wave, of }
//   creep.spawned   { creep }
//   creep.killed    { creep }
//   gate.breached   { lives, creep }
//   gold.changed    { gold, delta, reason }
//   tower.built     { tower }      tower.upgraded { tower }
//   tower.fired     { tower }      shot.landed    { x, y, tower }   — горячий путь: объект переиспользуется,
//                                                                    подписчик читает сразу и не хранит
//   action.refused  { code, detail }            отказ двери на действие игрока
//   menu.opened     { spot, options }  menu.closed {}   — от интерфейса, для подсказок
export class Milestones {
  #listeners = new Set();

  // Подписка и отписка — пара у одного владельца (П39).
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(event) {
    for (const listener of this.#listeners) listener(event);
  }
}
