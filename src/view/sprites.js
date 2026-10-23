import { Sprite } from 'pixi.js';

// Спрайт с якорем в точке начала рисунка (см. texture.origin в art.js).
export function placed(texture) {
  const sprite = new Sprite(texture);
  sprite.anchor.set(texture.origin.x, texture.origin.y);
  return sprite;
}

// Аренда спрайтов (П22): дефицитный ресурс выдаётся ручкой с одной идемпотентной кнопкой release(),
// маршрут возврата скрыт. Спрайты созданы заранее под ёмкость — в бою ничего не создаётся и не удаляется.
// lease() → ручка или null: пул исчерпан, враг просто не будет нарисован (ядро от этого не зависит).
export class SpritePool {
  #free = [];

  constructor(layer, capacity) {
    for (let i = 0; i < capacity; i++) {
      const sprite = new Sprite();
      sprite.visible = false;
      layer.addChild(sprite);
      this.#free.push(sprite);
    }
  }

  get available() {
    return this.#free.length;
  }

  // anchor по умолчанию — точка начала рисунка из art.js
  lease(texture, anchor = texture.origin) {
    const sprite = this.#free.pop();
    if (!sprite) return null;
    sprite.texture = texture;
    sprite.anchor.set(anchor.x, anchor.y);
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.scale.set(1);
    sprite.tint = 0xffffff;
    let returned = false;
    return {
      sprite,
      release: () => {
        if (returned) return;
        returned = true;
        sprite.visible = false;
        this.#free.push(sprite);
      },
    };
  }
}
