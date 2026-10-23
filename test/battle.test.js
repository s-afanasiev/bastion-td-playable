import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, LAYOUT } from '../src/config.js';
import { Milestones } from '../src/core/milestones.js';
import { Scenario } from '../src/core/scenario.js';
import { Treasury, Gate } from '../src/core/treasury.js';
import { Road, WavePlan } from '../src/core/road.js';
import { Creeps } from '../src/core/creeps.js';
import { TowerKinds, Towers } from '../src/core/towers.js';
import { FirstOnRoad, FirstUnchilled, SingleHit, SplashHit, ChillHit } from '../src/core/combat.js';
import { Volleys } from '../src/core/volleys.js';
import { BuildTower, UpgradeTower } from '../src/core/works.js';
import { Battle } from '../src/core/battle.js';

// Сборка ядра — та же, что в main.js, только без вида: бой проигрывается в node за доли секунды.
function assemble() {
  const bus = new Milestones();
  const events = [];
  bus.subscribe((e) => events.push(e.type === 'scenario' ? `scenario:${e.to}` : e.type));
  const kinds = new TowerKinds(CONFIG.towers, CONFIG.levels, {
    targeting: { first: new FirstOnRoad(), unchilled: new FirstUnchilled() },
    impacts: { single: new SingleHit(), splash: new SplashHit(), chill: new ChillHit() },
  });
  const scenario = new Scenario(CONFIG.scenario, bus);
  const treasury = new Treasury(CONFIG.economy.startGold, bus);
  const gate = new Gate(CONFIG.lives, bus);
  const creeps = new Creeps(new Road(LAYOUT.road), CONFIG.creeps, bus);
  const towers = new Towers(LAYOUT.spots);
  const battle = new Battle({ scenario, plan: new WavePlan(CONFIG.waves), creeps, towers, volleys: new Volleys(CONFIG.volleys), treasury, gate }, bus);
  return { bus, events, scenario, treasury, gate, towers, battle, build: new BuildTower(treasury, towers, kinds, bus), upgrade: new UpgradeTower(treasury, bus) };
}

const play = (g, seconds, everyStep = () => {}) => {
  for (let t = 0; t < seconds && g.scenario.state !== 'end'; t += 1 / 60) {
    g.battle.step(1 / 60);
    everyStep();
  }
};

test('бой без защиты: волны прорываются, ворота падают, сценарий — поражение и финальная карточка', () => {
  const g = assemble();
  play(g, 1);
  g.scenario.begin();
  play(g, 60);
  assert.deepEqual(g.scenario.result, { won: false, cause: 'overrun' });
  assert.equal(g.gate.lives, 0);
  assert.equal(g.scenario.state, 'end');
});

test('бой с разумной игрой: строим на золото, улучшаем — волны отбиты, победа', () => {
  const g = assemble();
  play(g, 1);
  assert.equal(g.build.run(0, 'archer').ok, true);
  g.scenario.begin();
  // простой игрок: как только хватает золота — ставит следующую башню, потом улучшает все
  const order = [[3, 'cannon'], [1, 'frost'], [2, 'archer'], [4, 'archer'], [5, 'cannon']];
  play(g, 60, () => {
    const next = order[0];
    if (next && g.build.run(next[0], next[1]).ok) order.shift();
    else if (!next) g.towers.forEach((t) => g.upgrade.run(t));
  });
  assert.deepEqual(g.scenario.result, { won: true, cause: 'cleared' });
  assert.ok(g.gate.lives > 0);
  for (const type of ['wave.started', 'creep.spawned', 'tower.fired', 'shot.landed', 'creep.killed', 'gold.changed', 'tower.built']) {
    assert.ok(g.events.includes(type), `нет вехи ${type}`);
  }
  assert.ok(g.events.indexOf('scenario:battle') < g.events.indexOf('wave.started'), 'волны — только после начала боя');
});
