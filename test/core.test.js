import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { Milestones } from '../src/core/milestones.js';
import { Scenario } from '../src/core/scenario.js';
import { Treasury, Gate } from '../src/core/treasury.js';
import { Road, WavePlan } from '../src/core/road.js';
import { Creeps } from '../src/core/creeps.js';
import { TowerKinds, Towers } from '../src/core/towers.js';
import { FirstOnRoad, FirstUnchilled, SingleHit, SplashHit, ChillHit } from '../src/core/combat.js';
import { Volleys } from '../src/core/volleys.js';
import { BuildTower, UpgradeTower } from '../src/core/works.js';

const recorder = () => {
  const bus = new Milestones();
  const seen = [];
  bus.subscribe((e) => seen.push({ ...e }));
  return { bus, seen, types: () => seen.map((e) => e.type) };
};
const KINDS = { grunt: { hp: 100, speed: 100, bounty: 10, radius: 20 } };
const TOWERS = {
  archer: { cost: 40, upgrade: 50, range: 200, interval: 0.5, damage: 10, targeting: 'first', impact: 'single' },
  frost: { cost: 50, upgrade: 55, range: 200, interval: 0.5, damage: 5, chill: 0.5, chillFor: 1, targeting: 'unchilled', impact: 'chill' },
};
const LEVELS = { max: 2, damage: 2, range: 1.5, interval: 0.5 };
const kinds = () => new TowerKinds(TOWERS, LEVELS, {
  targeting: { first: new FirstOnRoad(), unchilled: new FirstUnchilled() },
  impacts: { single: new SingleHit(), chill: new ChillHit() },
});

test('граница: ядро не знает про Pixi, DOM и рекламную сеть (П30, замок через греп)', () => {
  const dir = new URL('../src/core/', import.meta.url);
  for (const file of readdirSync(dir)) {
    const code = readFileSync(new URL(file, dir), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /pixi|document\.|window\.|@network|mraid|localStorage/i, `${file} протекает наружу`);
  }
});

test('казна: золота не бывает меньше нуля, отказ называет причину и ничего не меняет', () => {
  const { bus, seen } = recorder();
  const treasury = new Treasury(50, bus);
  assert.deepEqual(treasury.spend(60, 'build'), { ok: false, code: 'not_enough_gold', detail: { need: 60, have: 50 } });
  assert.equal(treasury.gold, 50);
  assert.equal(seen.length, 0);
  assert.deepEqual(treasury.spend(40, 'build'), { ok: true });
  treasury.earn(15, 'bounty');
  assert.equal(treasury.gold, 25);
  assert.deepEqual(seen.map((e) => e.delta), [-40, 15]);
});

test('ворота: жизни не уходят ниже нуля, прорыв после падения — отказ', () => {
  const { bus } = recorder();
  const gate = new Gate(2, bus);
  assert.deepEqual(gate.breach(), { ok: true, fallen: false });
  assert.deepEqual(gate.breach(), { ok: true, fallen: true });
  assert.equal(gate.breach().code, 'already_fallen');
  assert.equal(gate.lives, 0);
});

test('сценарий: переходы только по таблице, таймер идёт лишь в бою', () => {
  const { bus, seen } = recorder();
  const s = new Scenario({ introSeconds: 1, timeLimit: 10, endCardDelay: 1 }, bus);
  assert.equal(s.begin().code, 'no_transition');
  s.tick(1.01);
  s.tick(100);
  assert.equal(s.state, 'tutorial');
  assert.equal(s.elapsed, 0);
  assert.deepEqual(s.begin(), { ok: true });
  s.tick(10);
  assert.deepEqual(s.result, { won: false, cause: 'timeout' });
  assert.equal(s.win('cleared').code, 'no_transition');
  s.tick(1.01);
  assert.deepEqual(seen.map((e) => e.to), ['tutorial', 'battle', 'lost', 'end']);
});

test('расписание волн — чистая функция времени', () => {
  const plan = new WavePlan([{ wave: 1, at: 0, kind: 'a', count: 3, every: 1 }, { wave: 2, at: 5, kind: 'b', count: 1, every: 0 }]);
  const between = (a, b) => { const out = []; plan.spawnsBetween(a, b, (s) => out.push(`${s.kind}@${s.at}`)); return out; };
  assert.deepEqual(between(0, 1), ['a@0']);
  assert.deepEqual(between(1, 5.5), ['a@1', 'a@2', 'b@5']);
  assert.deepEqual(between(0, 1), ['a@0'], 'повторный вопрос — тот же ответ');
  assert.equal(plan.waves, 2);
  assert.equal(plan.finishedBy(5), false);
  assert.equal(plan.finishedBy(5.01), true);
});

test('враг: идёт по дороге, замедляется, умирает одним из двух исходов; по павшему урона нет', () => {
  const { bus, types } = recorder();
  const road = new Road([[0, 0], [100, 0], [100, 100]]);
  const creeps = new Creeps(road, KINDS, bus);
  const a = creeps.spawn('grunt');
  const b = creeps.spawn('grunt');
  creeps.advance(1, 0, () => {});
  assert.deepEqual({ x: a.x, y: a.y }, { x: 100, y: 0 });
  b.chill(0.5, 10);
  const breached = [];
  creeps.advance(1, 1, (c) => breached.push(c));
  assert.deepEqual(breached, [a]);
  assert.equal(a.state, 'breached');
  assert.equal(b.distance, 150, 'замедленный прошёл половину шага');
  assert.equal(b.hit(60), false);
  assert.equal(b.hit(60), true);
  assert.equal(b.hit(60), false, 'второй раз не убить');
  creeps.sweep();
  assert.equal(creeps.all.length, 0);
  assert.deepEqual(types(), ['creep.spawned', 'creep.spawned']);
});

test('постройка: сначала все проверки, потом все изменения — отказ ничего не оставляет', () => {
  const { bus, types } = recorder();
  const treasury = new Treasury(45, bus);
  const towers = new Towers([[0, 0], [10, 10]]);
  const build = new BuildTower(treasury, towers, kinds(), bus);
  assert.equal(build.run(0, 'frost').code, 'not_enough_gold');
  assert.equal(treasury.gold, 45);
  assert.equal(towers.count, 0);
  assert.equal(build.run(0, 'catapult').code, 'unknown_kind');
  assert.equal(build.run(7, 'archer').code, 'unknown_spot');
  assert.equal(build.run(0, 'archer').ok, true);
  assert.equal(build.run(0, 'archer').code, 'spot_taken');
  assert.equal(treasury.gold, 5);
  assert.deepEqual(types(), ['gold.changed', 'tower.built']);
});

test('улучшение: уровень 2 сильнее, выше уровня нет, без денег — отказ без изменений', () => {
  const { bus } = recorder();
  const treasury = new Treasury(200, bus);
  const towers = new Towers([[0, 0]]);
  const { tower } = new BuildTower(treasury, towers, kinds(), bus).run(0, 'archer');
  const upgrade = new UpgradeTower(treasury, bus);
  const before = tower.stats;
  assert.equal(upgrade.run(tower).ok, true);
  assert.deepEqual([tower.stats.damage, tower.stats.range, tower.stats.interval], [before.damage * 2, before.range * 1.5, before.interval * 0.5]);
  assert.equal(upgrade.run(tower).code, 'max_level');
  const poor = new Treasury(10, bus);
  const { tower: t2 } = new BuildTower(new Treasury(100, bus), new Towers([[0, 0]]), kinds(), bus).run(0, 'archer');
  assert.equal(new UpgradeTower(poor, bus).run(t2).code, 'not_enough_gold');
  assert.equal(t2.level, 1);
});

test('политики цели: первый на дороге в радиусе; лёд — первый незамедленный', () => {
  const road = new Road([[0, 0], [1000, 0]]);
  const creeps = new Creeps(road, KINDS, new Milestones());
  const [near, far, out] = [creeps.spawn('grunt'), creeps.spawn('grunt'), creeps.spawn('grunt')];
  near.distance = 50; far.distance = 150; out.distance = 900;
  for (const c of creeps.all) road.pointAt(c.distance, c);
  assert.equal(new FirstOnRoad().pick(100, 0, 200, creeps), far);
  far.chill(0.5, 10);
  assert.equal(new FirstUnchilled().pick(100, 0, 200, creeps, 0), near);
  near.chill(0.5, 10);
  assert.equal(new FirstUnchilled().pick(100, 0, 200, creeps, 0), far, 'все замедлены — первый на дороге');
  assert.equal(new FirstOnRoad().pick(100, 0, 10, creeps), null);
});

test('попадания: по площади задевает всех рядом, лёд замедляет, убийство сообщается один раз', () => {
  const road = new Road([[0, 0], [1000, 0]]);
  const creeps = new Creeps(road, KINDS, new Milestones());
  const [a, b, c] = [creeps.spawn('grunt'), creeps.spawn('grunt'), creeps.spawn('grunt')];
  a.distance = 100; b.distance = 120; c.distance = 400;
  for (const x of creeps.all) road.pointAt(x.distance, x);
  const killed = [];
  new SplashHit().apply(110, 0, a, { damage: 100, splash: 30 }, creeps, 0, (x) => killed.push(x));
  assert.deepEqual(killed, [a, b]);
  new ChillHit().apply(400, 0, c, { damage: 10, chill: 0.4, chillFor: 2 }, creeps, 5, (x) => killed.push(x));
  assert.equal(c.isChilled(6), true);
  assert.equal(c.isChilled(7.1), false);
  new SingleHit().apply(0, 0, a, { damage: 100 }, creeps, 0, (x) => killed.push(x));
  assert.equal(killed.length, 2);
});

test('снаряды: летят к цели, приземляются один раз, полный пул отказывает', () => {
  const volleys = new Volleys({ capacity: 2, speed: 100 });
  const target = { walking: true, x: 50, y: 0 };
  const landed = [];
  assert.equal(volleys.fire(0, 0, target, 't1'), true);
  assert.equal(volleys.fire(0, 0, target, 't2'), true);
  assert.equal(volleys.fire(0, 0, target, 't3'), false);
  volleys.advance(0.3, (x, y, t, tower) => landed.push(tower));
  assert.deepEqual(landed, []);
  volleys.advance(0.3, (x, y, t, tower) => landed.push(tower));
  assert.deepEqual(landed.sort(), ['t1', 't2']);
  assert.equal(volleys.active, 0);
});
