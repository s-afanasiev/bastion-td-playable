import './styles.css';
import { createNetwork } from '@network'; // адаптер подставляет сборка: src/networks/<сеть>.js
import { BUDGET, CONFIG, LAYOUT } from './config.js';
import { Milestones } from './core/milestones.js';
import { Scenario } from './core/scenario.js';
import { Treasury, Gate } from './core/treasury.js';
import { Road, WavePlan } from './core/road.js';
import { Creeps } from './core/creeps.js';
import { TowerKinds, Towers } from './core/towers.js';
import { FirstOnRoad, FirstUnchilled, SingleHit, SplashHit, ChillHit } from './core/combat.js';
import { Volleys } from './core/volleys.js';
import { BuildTower, UpgradeTower } from './core/works.js';
import { Battle } from './core/battle.js';
import { Stage } from './view/stage.js';
import { bakeArt, drawTerrain } from './view/art.js';
import { SpotsView, CreepsView, VolleysView, Sparks } from './view/battlefield-view.js';
import { Synth, soundsFor } from './audio/sfx.js';
import { Hud, BuildMenu, Hand, Toast, EndCard, Flash, Button, DebugOverlay } from './ui/overlay.js';
import { Tutorial } from './ui/tutorial.js';
import { PlayerActions } from './game/player-actions.js';
import { Playable } from './game/playable.js';

// Точка сборки (П3): из чего состоит реклама. Ниже — только сборка и запуск.
//
// Рассказ (П31). Реклама показывает короткий бой: игрок строит башни на площадках у дороги, волны врагов
// идут к замку, башни стреляют по первому на дороге, за убитых платят золото, золото тратится на новые
// башни и улучшения. Замок выдерживает пять прорывов. После волн — финальная карточка со ссылкой на стор.
// Ядро (src/core) — правила боя без Pixi и DOM; вид и интерфейс — проекции ядра и подписчики вех.

const $ = (selector) => document.querySelector(selector);
const bus = new Milestones();
const network = createNetwork({ storeUrl: CONFIG.storeUrl });
const stage = new Stage($('#stage'), CONFIG.render, LAYOUT);

// ---- ядро: собирается без GPU и проигрывается в тестах без единого вида ----
const kinds = new TowerKinds(CONFIG.towers, CONFIG.levels, {
  targeting: { first: new FirstOnRoad(), unchilled: new FirstUnchilled() },
  impacts: { single: new SingleHit(), splash: new SplashHit(), chill: new ChillHit() },
});
const plan = new WavePlan(CONFIG.waves);
const scenario = new Scenario(CONFIG.scenario, bus);
const treasury = new Treasury(CONFIG.economy.startGold, bus);
const towers = new Towers(LAYOUT.spots);
const volleys = new Volleys(CONFIG.volleys);
const battle = new Battle({
  scenario,
  plan,
  creeps: new Creeps(new Road(LAYOUT.road), CONFIG.creeps, bus),
  towers,
  volleys,
  treasury,
  gate: new Gate(CONFIG.lives, bus),
}, bus);

// ---- вид и интерфейс: после того как сеть готова и есть GPU-контекст ----
Promise.all([network.ready(), stage.init()]).then(() => {
  const art = bakeArt(stage.app.renderer);
  const spotOnScreen = (id) => ({ ...stage.toScreen(towers.spots[id].x, towers.spots[id].y, {}) });
  const synth = new Synth();
  const menu = new BuildMenu($('#menu'), bus);
  const actions = new PlayerActions({
    scenario, towers, kinds, treasury, menu, synth, spotOnScreen,
    build: new BuildTower(treasury, towers, kinds, bus),
    upgrade: new UpgradeTower(treasury, bus),
  }, bus);
  const views = {
    spots: new SpotsView(art, towers.spots, { onTap: (id) => actions.tapSpot(id) }),
    creeps: new CreepsView(art, plan.total),
    volleys: new VolleysView(art, volleys, CONFIG.looks.shots),
    sparks: new Sparks(art, CONFIG.sparks, CONFIG.looks.sparks),
  };
  const hud = new Hud($('#hud'), { lives: CONFIG.lives, gold: CONFIG.economy.startGold });
  const tutorial = new Tutorial(
    { hand: new Hand($('#hand')), menu, towers, treasury, spotOnScreen },
    { firstSpot: 0, firstKind: CONFIG.tutorialTower, upgradeAfter: CONFIG.hints.upgradeAfter },
  );
  const endCard = new EndCard($('#endcard'));

  // подписчики вех — все в одном месте (П25)
  const reportGameEnd = (e) => e.type === 'scenario' && (e.to === 'won' || e.to === 'lost') && network.gameEnd();
  for (const observer of [
    views.spots.observe, views.creeps.observe, views.sparks.observe,
    hud.observe, tutorial.observe, endCard.observe,
    new Toast($('#toast')).observe, new Flash($('#flash')).observe,
    soundsFor(synth), reportGameEnd,
  ]) bus.subscribe(observer);

  menu.onChoose((spot, option) => actions.choose(spot, option));
  hud.onMute(() => hud.muted(synth.toggleMuted()));
  endCard.onCta(() => network.openStore());
  new Button($('#cta')).onPress(() => network.openStore());
  window.addEventListener('pointerdown', () => synth.unlock(), { once: true });

  const debug = new URLSearchParams(location.search).has('debug');
  new Playable({
    network,
    stage,
    battle,
    layers: [drawTerrain(LAYOUT), views.spots.layer, views.creeps.layer, views.volleys.layer, views.sparks.layer],
    views,
    tutorial,
    synth,
    debug: debug ? new DebugOverlay($('#debug'), {
      budget: BUDGET,
      probes: () => ({ visible: countVisible(stage.world), creeps: views.creeps.shown, towers: towers.count, shots: volleys.active, sparks: views.sparks.active }),
    }) : null,
  }).run();

  if (debug) window.__playable = { scenario, towers, treasury, spotOnScreen, menu, actions }; // ручка для автотеста сценария
});

function countVisible(node) {
  let n = 0;
  for (const child of node.children) if (child.visible) n += 1 + countVisible(child);
  return n;
}
