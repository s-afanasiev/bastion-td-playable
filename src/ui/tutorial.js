// Обучение — процесс со своими состояниями, а не набор флагов (П20):
//   off → build → choose → wait → upgrade → choose_upgrade → done
// Переходы — по вехам (подписчик, П25); рука только показывает, ничего за игрока не делает.
// Вопросы к ядру — через двери-вопросы (П14): хватает ли золота, есть ли улучшение.
export class Tutorial {
  state = 'off';
  #hand;
  #menu;
  #towers;
  #treasury;
  #spotOnScreen;
  #settings;
  #affordableFor = 0;
  #firstTower = null;

  constructor({ hand, menu, towers, treasury, spotOnScreen }, { firstSpot, firstKind, upgradeAfter }) {
    this.#hand = hand;
    this.#menu = menu;
    this.#towers = towers;
    this.#treasury = treasury;
    this.#spotOnScreen = spotOnScreen;
    this.#settings = { firstSpot, firstKind, upgradeAfter };
  }

  observe = (e) => {
    const { firstSpot, firstKind } = this.#settings;
    switch (this.state) {
      case 'off':
        if (e.type === 'scenario' && e.to === 'tutorial') this.#go('build');
        break;
      case 'build':
      case 'choose':
        // постройка принимается в обоих состояниях: порядок вех menu.closed / tower.built не должен ломать обучение
        if (e.type === 'tower.built') { this.#firstTower = e.tower; this.#go('wait'); }
        else if (e.type === 'menu.opened') this.#go('choose', () => this.#hand.point(this.#menu.optionOnScreen(firstKind) ?? this.#spotOnScreen(firstSpot), `BUILD ${firstKind.toUpperCase()}`));
        else if (e.type === 'menu.closed' && this.state === 'choose') this.#go('build');
        break;
      case 'upgrade':
        if (e.type === 'menu.opened' && e.spot === this.#firstTower.spot.id) this.#go('choose_upgrade', () => this.#hand.point(this.#menu.optionOnScreen(this.#firstTower.kind.key), 'UPGRADE'));
        break;
      case 'choose_upgrade':
        if (e.type === 'tower.upgraded') this.#go('done');
        else if (e.type === 'menu.closed') this.#go('upgrade');
        break;
    }
    if (e.type === 'tower.upgraded' && this.state !== 'done') this.#go('done');
    if (e.type === 'scenario' && (e.to === 'won' || e.to === 'lost')) this.#go('done');
  };

  // Подсказка «улучши» — когда улучшение по карману уже несколько секунд, а игрок им не воспользовался.
  update(dt) {
    if (this.state !== 'wait') return;
    const tower = this.#firstTower;
    const can = tower.canUpgrade();
    this.#affordableFor = can.ok && this.#treasury.canAfford(can.cost) ? this.#affordableFor + dt : 0;
    if (this.#affordableFor >= this.#settings.upgradeAfter) this.#go('upgrade');
  }

  #go(state, show) {
    this.state = state;
    if (show) return show();
    if (state === 'build') this.#hand.point(this.#spotOnScreen(this.#settings.firstSpot), 'TAP TO BUILD');
    else if (state === 'upgrade') this.#hand.point(this.#spotOnScreen(this.#firstTower.spot.id), 'TAP TO UPGRADE');
    else this.#hand.hide();
  }
}
