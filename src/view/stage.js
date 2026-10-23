import { Application, Container } from 'pixi.js';

// Приложение Pixi и «мир» — логическое поле layout.width × layout.height, вписанное в экран целиком.
// Игра мыслит в логических координатах; экран, плотность пикселей и ориентация — только здесь.
export class Stage {
  app = new Application();
  world = new Container();
  #host;
  #settings;
  #layout;
  #size = '';

  constructor(host, settings, layout) {
    this.#host = host;
    this.#settings = settings;
    this.#layout = layout;
  }

  // GPU-контекст и холст. Цикл кадра запускает run(): между ними собирается всё, чему нужен рендерер.
  async init() {
    await this.app.init({
      resizeTo: this.#host,
      preference: 'webgl',
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, this.#settings.maxResolution),
      autoDensity: true,
    });
    this.#host.append(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.app.stage.eventMode = 'static';
    this.#fit();
    return this;
  }

  run(frame) {
    this.app.ticker.add((ticker) => {
      this.#fit();
      frame(Math.min(ticker.deltaMS / 1000, 1 / 20));
    });
    return this;
  }

  pause() {
    this.app.ticker.stop();
  }

  resume() {
    this.app.ticker.start();
  }

  // Освобождение GPU-контекста и холста — зеркало init() (П20, П39).
  stop() {
    this.app.destroy({ removeView: true }, { children: true, texture: true });
  }

  // Логическая точка → пиксели экрана (CSS) — для DOM-подсказок поверх холста.
  toScreen(x, y, out) {
    const s = this.world.scale.x;
    out.x = this.world.x + x * s;
    out.y = this.world.y + y * s;
    return out;
  }

  toWorld(x, y, out) {
    const s = this.world.scale.x;
    out.x = (x - this.world.x) / s;
    out.y = (y - this.world.y) / s;
    return out;
  }

  // Размер проверяется каждый кадр: дешевле сравнения строк ничего нет, а поворот экрана ловится сразу.
  #fit() {
    const { width: w, height: h } = this.app.screen;
    const key = `${w}x${h}`;
    if (key === this.#size) return;
    this.#size = key;
    const L = this.#layout;
    const s = Math.min(w / L.width, h / L.height);
    this.world.scale.set(s);
    this.world.position.set((w - L.width * s) / 2, (h - L.height * s) / 2);
    this.app.stage.hitArea = this.app.screen;
  }
}
