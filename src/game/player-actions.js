// Действия игрока — перевод тапов в работы ядра (П12: одна роль). Что показать в меню, решает здесь родитель,
// а не меню (П2); отказ двери становится вехой action.refused с причиной — её покажут тост и звук.
export class PlayerActions {
  #d;

  constructor({ scenario, towers, kinds, treasury, build, upgrade, menu, synth, spotOnScreen }, bus) {
    this.#d = { scenario, towers, kinds, treasury, build, upgrade, menu, synth, spotOnScreen, bus };
  }

  tapSpot(spotId) {
    const { scenario, towers, menu, synth, spotOnScreen } = this.#d;
    synth.unlock();
    if (!scenario.acceptsInput) return;
    const tower = towers.at(spotId);
    menu.open(spotId, spotOnScreen(spotId), tower ? this.#upgradeOptions(tower) : this.#buildOptions());
  }

  choose(spotId, option) {
    const { scenario, towers, build, upgrade, menu, bus } = this.#d;
    const verdict = option.action === 'build' ? build.run(spotId, option.key) : upgrade.run(towers.at(spotId));
    // меню закрывается после ответа работы: веха постройки приходит раньше вехи закрытия
    menu.close();
    if (!verdict.ok) {
      bus.emit({ type: 'action.refused', code: verdict.code, detail: verdict.detail });
      return verdict;
    }
    // бой начинается с первой башни: решает тот, кто строил, а не подписчик на веху (П25: сигнал — не команда)
    if (scenario.state === 'tutorial') scenario.begin();
    return verdict;
  }

  #buildOptions() {
    const { kinds, treasury } = this.#d;
    return kinds.keys().map((key) => {
      const { cost } = kinds.get(key);
      return { action: 'build', key, label: key.toUpperCase(), cost, affordable: treasury.canAfford(cost) };
    });
  }

  #upgradeOptions(tower) {
    const can = tower.canUpgrade();
    if (!can.ok) return [{ action: 'max', key: tower.kind.key, label: 'MAX', cost: 0, affordable: false }];
    return [{ action: 'upgrade', key: tower.kind.key, label: 'UPGRADE', cost: can.cost, affordable: this.#d.treasury.canAfford(can.cost) }];
  }
}
