// Интерфейс поверх сцены — обычный DOM: чёткий текст на любом экране, ноль байт шрифтов и текстур.
// Компоненты — подписчики вех (observe) и источники фактов нажатия; решений о бое они не принимают.

const press = (el, fn) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });

export class Hud {
  #root;
  #gold;
  #lives;
  #wave;
  #mute;
  #maxLives;

  constructor(root, { lives, gold }) {
    this.#root = root;
    this.#gold = root.querySelector('[data-hud="gold"]');
    this.#lives = root.querySelector('[data-hud="lives"]');
    this.#wave = root.querySelector('[data-hud="wave"]');
    this.#mute = root.querySelector('[data-hud="mute"]');
    this.#maxLives = lives;
    this.#drawLives(lives);
    this.#gold.textContent = gold;
  }

  observe = (e) => {
    if (e.type === 'scenario' && e.to === 'tutorial') this.#root.hidden = false;
    else if (e.type === 'gold.changed') {
      this.#gold.textContent = e.gold;
      this.#gold.parentElement.classList.toggle('is-up', e.delta > 0);
    } else if (e.type === 'gate.breached') this.#drawLives(e.lives);
    else if (e.type === 'wave.started') this.#wave.textContent = `WAVE ${e.wave}/${e.of}`;
  };

  onMute(fn) {
    press(this.#mute, fn);
  }

  muted(on) {
    this.#mute.setAttribute('aria-pressed', String(on));
  }

  #drawLives(n) {
    this.#lives.innerHTML = Array.from({ length: this.#maxLives }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  }
}

// Меню постройки и улучшения у площадки. Содержимое решает родитель; меню показывает и сообщает выбор.
export class BuildMenu {
  #el;
  #bus;
  #spot = -1;
  #positions = new Map(); // ключ варианта → центр кнопки на экране (по геометрии, а не по DOM: кнопки ещё анимируются)
  #onChoose = () => {};
  #onDismiss;

  constructor(el, bus) {
    this.#el = el;
    this.#bus = bus;
    // тап мимо кнопок закрывает меню; закрытие — пара к открытию у того же владельца (П39)
    this.#onDismiss = (e) => { if (!this.#el.contains(e.target)) this.close(); };
  }

  get isOpen() {
    return this.#spot >= 0;
  }

  onChoose(fn) {
    this.#onChoose = fn;
  }

  // options: [{ action: 'build' | 'upgrade' | 'max', key, label, cost, affordable }]
  open(spot, at, options) {
    this.close();
    this.#spot = spot;
    this.#el.style.setProperty('--x', `${at.x}px`);
    this.#el.style.setProperty('--y', `${at.y}px`);
    const step = (Math.PI * 2) / Math.max(options.length, 3);
    const start = -Math.PI / 2 - (step * (options.length - 1)) / 2;
    this.#el.innerHTML = '';
    this.#positions.clear();
    options.forEach((option, i) => {
      const a = options.length === 1 ? -Math.PI / 2 : start + step * i;
      const dx = Math.cos(a) * RADIUS, dy = Math.sin(a) * RADIUS;
      const button = document.createElement('button');
      button.className = `menu-option kind-${option.key}`;
      button.dataset.key = option.key;
      button.dataset.action = option.action;
      button.classList.toggle('is-poor', !option.affordable);
      button.style.setProperty('--dx', `${dx}px`);
      button.style.setProperty('--dy', `${dy}px`);
      this.#positions.set(option.key, { x: at.x + dx, y: at.y + dy });
      button.innerHTML = `<b>${option.label}</b>${option.cost ? `<span><i class="coin"></i>${option.cost}</span>` : ''}`;
      if (option.action !== 'max') press(button, () => this.#onChoose(spot, option));
      this.#el.append(button);
    });
    this.#el.hidden = false;
    setTimeout(() => window.addEventListener('pointerdown', this.#onDismiss), 0);
    this.#bus.emit({ type: 'menu.opened', spot, options });
  }

  close() {
    if (!this.isOpen) return;
    this.#spot = -1;
    this.#el.hidden = true;
    window.removeEventListener('pointerdown', this.#onDismiss);
    this.#bus.emit({ type: 'menu.closed' });
  }

  optionOnScreen(key) {
    return this.#positions.get(key) ?? null;
  }
}

const RADIUS = 78; // px от центра площадки до центра кнопки меню

// Рука-подсказка: «нажми сюда».
export class Hand {
  #el;
  #text;

  constructor(el) {
    this.#el = el;
    this.#text = el.querySelector('[data-hand="text"]');
  }

  point(at, text) {
    this.#el.style.setProperty('--x', `${at.x}px`);
    this.#el.style.setProperty('--y', `${at.y}px`);
    this.#text.textContent = text;
    this.#el.hidden = false;
  }

  hide() {
    this.#el.hidden = true;
  }
}

// Отказы дверей — короткое сообщение с причиной: игрок понимает, почему не построилось.
const REFUSALS = {
  not_enough_gold: (d) => `Need ${d.need} gold`,
  spot_taken: () => 'Spot is taken',
  max_level: () => 'Already max level',
};

export class Toast {
  #el;
  #timer = 0;

  constructor(el) {
    this.#el = el;
  }

  observe = (e) => {
    if (e.type !== 'action.refused') return;
    this.#el.textContent = (REFUSALS[e.code] ?? (() => e.code))(e.detail ?? {});
    this.#el.hidden = false;
    this.#el.classList.remove('is-on');
    void this.#el.offsetWidth;
    this.#el.classList.add('is-on');
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#el.hidden = true; }, 1400);
  };
}

export class EndCard {
  #el;

  constructor(el) {
    this.#el = el;
  }

  // Итог — из вехи финала сценария (won | lost и причина), показ — по вехе end.
  observe = (e) => {
    if (e.type !== 'scenario') return;
    if (e.to === 'won' || e.to === 'lost') this.#fill(e.to === 'won', e.cause);
    if (e.to === 'end') this.#el.hidden = false;
  };

  #fill(won, cause) {
    this.#el.dataset.result = won ? 'won' : 'lost';
    this.#el.querySelector('[data-end="title"]').textContent = won ? 'VICTORY' : cause === 'timeout' ? 'TIME OUT' : 'CASTLE FELL';
    this.#el.querySelector('[data-end="subtitle"]').textContent = won
      ? 'Build mighty towers and defend every kingdom!'
      : 'Build stronger towers and take your revenge!';
  }

  // Весь экран карточки — кнопка стора: промахнуться невозможно.
  onCta(fn) {
    press(this.#el, fn);
  }
}

// Вспышки по вехам — вид каждой в таблице.
const FLASHES = { 'gate.breached': 'hit', 'tower.upgraded': 'gold' };

export class Flash {
  #el;

  constructor(el) {
    this.#el = el;
  }

  observe = (e) => {
    const kind = FLASHES[e.type] ?? (e.type === 'creep.killed' && e.creep.kind === 'boss' ? 'boom' : null);
    if (!kind) return;
    this.#el.dataset.kind = kind;
    this.#el.classList.remove('is-on');
    void this.#el.offsetWidth;
    this.#el.classList.add('is-on');
  };
}

export class Button {
  #el;

  constructor(el) {
    this.#el = el;
  }

  onPress(fn) {
    press(this.#el, fn);
  }
}

// Оверлей ?debug: кадр, худший кадр, объекты на сцене, занятость пулов, куча JS.
export class DebugOverlay {
  #el;
  #probes;
  #budget;
  #frames = 0;
  #time = 0;
  #worst = 0;

  constructor(el, { probes, budget }) {
    this.#el = el;
    this.#probes = probes;
    this.#budget = budget;
    el.hidden = false;
  }

  frame(dt) {
    this.#frames++;
    this.#time += dt;
    this.#worst = Math.max(this.#worst, dt);
    if (this.#time < 0.5) return;
    const fps = this.#frames / this.#time;
    const p = this.#probes();
    const heap = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'n/a';
    const over = (bad) => (bad ? ' class="over"' : '');
    this.#el.innerHTML = [
      `<b${over(fps < 55)}>${fps.toFixed(0)} fps</b> · worst ${(this.#worst * 1000).toFixed(1)} ms`,
      `<span${over(p.visible > this.#budget.sprites)}>visible ${p.visible}</span> · creeps ${p.creeps} · towers ${p.towers}`,
      `shots ${p.shots} · fx ${p.sparks} · heap ${heap}`,
    ].join('<br>');
    this.#frames = 0;
    this.#time = 0;
    this.#worst = 0;
  }
}
