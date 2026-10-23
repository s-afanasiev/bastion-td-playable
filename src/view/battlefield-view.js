import { Container, Sprite, Texture } from 'pixi.js';
import { placed, SpritePool } from './sprites.js';
import { SlotPool } from '../core/slot-pool.js';

// Виды поля — проекции ядра (П25, П40): читают состояние и слушают вехи, но ничем в ядре не владеют
// и ничего в нём не меняют. Сняли вид — бой идёт как шёл (это проверяет battle.test.js без единого вида).
// В кадре — только циклы по массивам с индексом: ни итераторов Map, ни новых объектов.

const TOP_LEFT = { x: 0, y: 0 };

// Площадки и башни. Тап по площадке — факт для родителя; что открыть, решает он.
export class SpotsView {
  layer = new Container();
  #art;
  #towers = []; // спрайты башен; у каждого своя отдача после выстрела (kick)
  #bySpot = new Map(); // id площадки → спрайт — только для событий, не для кадра

  constructor(art, spots, { onTap }) {
    this.#art = art;
    for (const spot of spots) {
      const base = placed(art.spot);
      base.scale.set(1);
      base.position.set(spot.x, spot.y);
      base.eventMode = 'static';
      base.cursor = 'pointer';
      base.on('pointertap', () => onTap(spot.id));
      this.layer.addChild(base);
    }
    this.layer.sortableChildren = true;
  }

  // Подписчик вех: построили, улучшили, выстрелили.
  observe = (e) => {
    if (e.type === 'tower.built' || e.type === 'tower.upgraded') this.#draw(e.tower);
    else if (e.type === 'tower.fired') {
      const sprite = this.#bySpot.get(e.tower.spot.id);
      if (sprite) sprite.kick = 0.12;
    }
  };

  update(dt) {
    for (let i = 0; i < this.#towers.length; i++) {
      const s = this.#towers[i];
      if (!(s.kick > 0)) continue;
      s.kick = Math.max(0, s.kick - dt);
      s.scale.set(1 + s.kick * 0.5, 1 - s.kick * 0.6);
    }
  }

  #draw(tower) {
    const old = this.#bySpot.get(tower.spot.id);
    if (old) {
      this.#towers.splice(this.#towers.indexOf(old), 1);
      old.destroy();
    }
    const sprite = placed(this.#art.tower[tower.kind.key][tower.level - 1]);
    sprite.scale.set(1);
    sprite.position.set(tower.x, tower.y + 14);
    sprite.zIndex = tower.y;
    sprite.eventMode = 'none'; // тапы проходят на площадку под башней
    sprite.kick = 0;
    this.layer.addChild(sprite);
    this.#towers.push(sprite);
    this.#bySpot.set(tower.spot.id, sprite);
  }
}

// Враги: спрайт и полоска здоровья берутся в аренду при рождении врага и возвращаются после анимации смерти.
export class CreepsView {
  layer = new Container();
  #art;
  #bodies;
  #backs;
  #fills;
  #shown = []; // { creep, body, back, fill, fade }

  constructor(art, capacity) {
    this.#art = art;
    const bodies = new Container();
    const bars = new Container();
    this.layer.addChild(bodies, bars);
    this.#bodies = new SpritePool(bodies, capacity);
    this.#backs = new SpritePool(bars, capacity);
    this.#fills = new SpritePool(bars, capacity);
  }

  get shown() {
    return this.#shown.length;
  }

  observe = (e) => {
    if (e.type === 'creep.spawned') this.#show(e.creep);
  };

  // Кадр: позиции идущих, затухание павших и прорвавшихся, возврат аренды по окончании.
  sync(dt, now) {
    for (let i = this.#shown.length - 1; i >= 0; i--) {
      const v = this.#shown[i];
      const { creep } = v;
      if (creep.walking) {
        const body = v.body.sprite;
        body.position.set(creep.x, creep.y);
        body.rotation = Math.sin(now * 10 + creep.radius) * 0.08;
        body.tint = creep.isChilled(now) ? 0x9fdcff : 0xffffff;
        const w = creep.radius * 2.2;
        v.back.sprite.position.set(creep.x - w / 2, creep.y - creep.radius - 14);
        v.back.sprite.width = w;
        v.fill.sprite.position.set(creep.x - w / 2 + 1, creep.y - creep.radius - 13);
        v.fill.sprite.width = (w - 2) * (creep.hp / creep.maxHp);
        continue;
      }
      v.back.sprite.visible = v.fill.sprite.visible = false;
      v.fade -= dt * 3;
      v.body.sprite.alpha = Math.max(0, v.fade);
      v.body.sprite.scale.set(1 + (1 - v.fade) * 0.4);
      if (v.fade > 0) continue;
      v.body.release();
      v.back.release();
      v.fill.release();
      this.#shown[i] = this.#shown[this.#shown.length - 1]; // удаление обменом с последним: без нового массива
      this.#shown.pop();
    }
  }

  #show(creep) {
    const body = this.#bodies.lease(this.#art.creep[creep.kind]);
    const back = this.#backs.lease(Texture.WHITE, TOP_LEFT);
    const fill = this.#fills.lease(Texture.WHITE, TOP_LEFT);
    if (!body || !back || !fill) {
      body?.release(); back?.release(); fill?.release();
      return; // пул исчерпан: враг идёт невидимым, бой от этого не меняется
    }
    back.sprite.tint = 0x1b1b1b;
    fill.sprite.tint = 0xff4d4d;
    back.sprite.height = 7;
    fill.sprite.height = 5;
    body.sprite.position.set(creep.x, creep.y);
    this.#shown.push({ creep, body, back, fill, fade: 1 });
  }
}

// Снаряды: спрайт на каждый слот ядра заранее; вид только повторяет координаты активных слотов.
export class VolleysView {
  layer = new Container();
  #sprites = [];
  #volleys;
  #looks;

  constructor(art, volleys, looks) {
    this.#volleys = volleys;
    this.#looks = looks;
    for (let i = 0; i < volleys.capacity; i++) {
      const s = new Sprite(art.shot);
      s.anchor.set(0.5);
      s.visible = false;
      this.#sprites.push(s);
      this.layer.addChild(s);
    }
  }

  sync() {
    for (let i = 0; i < this.#sprites.length; i++) this.#sprites[i].visible = false;
    this.#volleys.forEachActive(this.#place);
  }

  #place = (slot, x, y, tower) => {
    const s = this.#sprites[slot];
    const look = this.#looks[tower.kind.key];
    s.visible = true;
    s.position.set(x, y);
    s.tint = look.tint;
    s.scale.set(look.size);
  };
}

// Искры по вехам: попадание, гибель, постройка, прорыв. Вид каждой вспышки — таблица в точке сборки.
export class Sparks {
  layer = new Container();
  #pool;
  #sprites = [];
  #vx;
  #vy;
  #life;
  #max;
  #size;
  #looks;

  constructor(art, { capacity }, looks) {
    this.#looks = looks;
    this.#pool = new SlotPool(capacity);
    this.#vx = new Float32Array(capacity);
    this.#vy = new Float32Array(capacity);
    this.#life = new Float32Array(capacity);
    this.#max = new Float32Array(capacity);
    this.#size = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) {
      const s = new Sprite(art.spark);
      s.anchor.set(0.5);
      s.visible = false;
      this.#sprites.push(s);
      this.layer.addChild(s);
    }
  }

  get active() {
    return this.#pool.used;
  }

  observe = (e) => {
    const L = this.#looks;
    if (e.type === 'shot.landed') this.#burst(e.x, e.y, L.shot[e.tower.kind.key]);
    else if (e.type === 'creep.killed') this.#burst(e.creep.x, e.creep.y, e.creep.kind === 'boss' ? L.bossKill : L.kill);
    else if (e.type === 'tower.built' || e.type === 'tower.upgraded') this.#burst(e.tower.x, e.tower.y - 20, L.build);
    else if (e.type === 'gate.breached') this.#burst(e.creep.x, e.creep.y, L.breach);
  };

  update(dt) {
    const drag = Math.max(0, 1 - dt * 3);
    for (let i = 0; i < this.#pool.capacity; i++) {
      if (!this.#pool.active[i]) continue;
      const s = this.#sprites[i];
      this.#life[i] -= dt;
      if (this.#life[i] <= 0) {
        s.visible = false;
        this.#pool.release(i);
        continue;
      }
      this.#vx[i] *= drag;
      this.#vy[i] *= drag;
      s.x += this.#vx[i] * dt;
      s.y += this.#vy[i] * dt;
      const k = this.#life[i] / this.#max[i];
      s.scale.set(this.#size[i] * k);
      s.alpha = Math.min(1, k * 1.5);
    }
  }

  #burst(x, y, { count, speed, life, size, tint }) {
    for (let n = 0; n < count; n++) {
      const i = this.#pool.acquire();
      if (i < 0) return;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.#vx[i] = Math.cos(a) * v;
      this.#vy[i] = Math.sin(a) * v;
      this.#life[i] = this.#max[i] = life * (0.6 + Math.random() * 0.4);
      this.#size[i] = size * (0.5 + Math.random() * 0.5);
      const s = this.#sprites[i];
      s.tint = tint;
      s.position.set(x, y);
      s.visible = true;
    }
  }
}
