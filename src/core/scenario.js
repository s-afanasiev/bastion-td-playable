// Сценарий рекламы — сущность с именованными состояниями (П20) и таблицей переходов (П27):
//   intro → tutorial → battle → won | lost → end
// Перехода, которого нет в таблице, не бывает: победа после поражения или бой до первой башни невыразимы.
// Таймер боя идёт только в battle; у финальных состояний выход один — финальная карточка.
const TRANSITIONS = {
  intro: ['tutorial'],
  tutorial: ['battle'],
  battle: ['won', 'lost'],
  won: ['end'],
  lost: ['end'],
  end: [],
};

export class Scenario {
  state = 'intro';
  elapsed = 0; // секунды боя
  result = null; // { won, cause }
  #inState = 0;
  #settings;
  #bus;

  constructor({ introSeconds, timeLimit, endCardDelay }, bus) {
    this.#settings = { introSeconds, timeLimit, endCardDelay };
    this.#bus = bus;
  }

  get playing() {
    return this.state === 'battle';
  }

  // Игрок может строить в обучении и в бою — вопрос, ничего не меняет (П14).
  get acceptsInput() {
    return this.state === 'tutorial' || this.state === 'battle';
  }

  get timeLeft() {
    return Math.max(0, this.#settings.timeLimit - this.elapsed);
  }

  tick(dt) {
    const { introSeconds, timeLimit, endCardDelay } = this.#settings;
    this.#inState += dt;
    if (this.state === 'intro' && this.#inState >= introSeconds) this.#go('tutorial');
    if (this.state === 'battle') {
      this.elapsed += dt;
      if (this.elapsed >= timeLimit) this.lose('timeout');
    }
    if ((this.state === 'won' || this.state === 'lost') && this.#inState >= endCardDelay) this.#go('end');
  }

  // Бой начинается с первой построенной башни: решение принимает тот, кто строил, а не подписчик на веху.
  begin() {
    return this.#go('battle', 'first_tower');
  }

  win(cause) {
    return this.#finish(true, cause);
  }

  lose(cause) {
    return this.#finish(false, cause);
  }

  #finish(won, cause) {
    const verdict = this.#go(won ? 'won' : 'lost', cause);
    if (verdict.ok) this.result = { won, cause };
    return verdict;
  }

  #go(to, cause) {
    if (!TRANSITIONS[this.state].includes(to)) return { ok: false, code: 'no_transition', detail: { from: this.state, to } };
    const from = this.state;
    this.state = to;
    this.#inState = 0;
    this.#bus.emit({ type: 'scenario', from, to, cause });
    return { ok: true };
  }
}
