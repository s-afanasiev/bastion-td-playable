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
  // Копия при записи: подписка и отписка редки и создают новый массив, emit на горячем пути перебирает
  // текущий массив индексом без аллокаций, а отписка посреди обхода его не ломает.
  #listeners = [];

  // Подписка и отписка — пара у одного владельца (П39).
  subscribe(listener) {
    this.#listeners = [...this.#listeners, listener];
    return () => { this.#listeners = this.#listeners.filter((l) => l !== listener); };
  }

  emit(event) {
    const listeners = this.#listeners;
    for (let i = 0; i < listeners.length; i++) listeners[i](event);
  }
}
