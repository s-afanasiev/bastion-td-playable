import { Graphics, Container } from 'pixi.js';

// Вся графика рисуется векторно один раз и запекается в текстуры: на экране дальше только спрайты,
// которые Pixi сводит в батчи, а в сборке нет ни одного файла картинок.
// texture.origin — где на текстуре лежит точка (0, 0) рисунка: у башни это основание, а не центр.
export function bakeArt(renderer) {
  const bake = (draw) => {
    const g = draw(new Graphics());
    const b = g.getLocalBounds();
    const texture = renderer.generateTexture({ target: g, resolution: 2, antialias: true });
    texture.origin = { x: -b.minX / b.width, y: -b.minY / b.height };
    g.destroy();
    return texture;
  };
  return {
    creep: {
      grunt: bake((g) => drawCreep(g, 0x6fbf4a, 22)),
      runner: bake((g) => drawCreep(g, 0xf2c94c, 18)),
      brute: bake((g) => drawCreep(g, 0xc0392b, 30, 'horns')),
      boss: bake((g) => drawCreep(g, 0x8e44ad, 42, 'crown')),
    },
    tower: {
      archer: [1, 2].map((level) => bake((g) => drawArcher(g, level))),
      cannon: [1, 2].map((level) => bake((g) => drawCannon(g, level))),
      frost: [1, 2].map((level) => bake((g) => drawFrost(g, level))),
    },
    spot: bake((g) => g.circle(0, 0, 44).fill({ color: 0x3e4a33, alpha: 0.55 }).circle(0, 0, 38).fill(0x9a9178).stroke({ width: 4, color: 0x6b6450 })
      .rect(-3, -14, 6, 28).fill(0xf4efe0).rect(-14, -3, 28, 6).fill(0xf4efe0)),
    shot: bake((g) => g.circle(0, 0, 9).fill({ color: 0xffffff, alpha: 0.35 }).circle(0, 0, 5).fill(0xffffff)),
    spark: bake((g) => g.circle(0, 0, 6).fill(0xffffff)),
  };
}

function drawCreep(g, color, r, crown) {
  g.ellipse(0, r * 0.85, r * 0.9, r * 0.3).fill({ color: 0x000000, alpha: 0.28 });
  if (crown === 'horns') {
    g.poly([-r * 0.7, -r * 0.5, -r * 1.0, -r * 1.15, -r * 0.3, -r * 0.85]).fill(0xf3e9d2);
    g.poly([r * 0.7, -r * 0.5, r * 1.0, -r * 1.15, r * 0.3, -r * 0.85]).fill(0xf3e9d2);
  }
  g.circle(0, 0, r).fill(color).stroke({ width: 4, color: shade(color, 0.55) });
  if (crown === 'crown') g.poly([-r * 0.55, -r * 0.8, -r * 0.55, -r * 1.3, -r * 0.25, -r * 1.05, 0, -r * 1.4, r * 0.25, -r * 1.05, r * 0.55, -r * 1.3, r * 0.55, -r * 0.8]).fill(0xffd36b).stroke({ width: 3, color: 0xb8860b });
  g.circle(-r * 0.35, -r * 0.15, r * 0.25).fill(0xffffff);
  g.circle(r * 0.35, -r * 0.15, r * 0.25).fill(0xffffff);
  g.circle(-r * 0.3, -r * 0.1, r * 0.12).fill(0x1b1b1b);
  g.circle(r * 0.4, -r * 0.1, r * 0.12).fill(0x1b1b1b);
  g.moveTo(-r * 0.3, r * 0.35).lineTo(r * 0.3, r * 0.35).stroke({ width: 3, color: 0x1b1b1b });
  return g;
}

// Уровень 2 у всех видов — золотая кромка и флажок: разницу видно с одного взгляда.
function trim(g, level) {
  if (level < 2) return;
  g.moveTo(0, -78).lineTo(0, -104).stroke({ width: 4, color: 0x5a3e1b });
  g.poly([0, -104, 24, -96, 0, -88]).fill(0xff4d4d);
}

function base(g, level) {
  g.ellipse(0, 18, 40, 13).fill({ color: 0x000000, alpha: 0.3 });
  g.roundRect(-34, -6, 68, 26, 10).fill(0x8d939b).stroke({ width: 4, color: level >= 2 ? 0xffd36b : 0x5d636b });
}

function drawArcher(g, level) {
  base(g, level);
  g.rect(-24, -62, 48, 60).fill(0x9c6b3c).stroke({ width: 4, color: 0x5a3e1b });
  g.rect(-8, -44, 16, 22).fill(0x3a2a18);
  g.poly([-34, -60, 0, -84, 34, -60]).fill(level >= 2 ? 0x3fa34d : 0x4f8a3a).stroke({ width: 4, color: 0x2f5a25 });
  trim(g, level);
  return g;
}

function drawCannon(g, level) {
  base(g, level);
  g.roundRect(-30, -50, 60, 50, 12).fill(0x7d848c).stroke({ width: 4, color: 0x4d535a });
  for (const x of [-24, -6, 12]) g.rect(x, -60, 12, 12).fill(0x7d848c).stroke({ width: 3, color: 0x4d535a });
  g.roundRect(-10, -42, 46, 20, 8).fill(0x2b2f35);
  g.circle(36, -32, 8).fill(0x111111);
  trim(g, level);
  return g;
}

function drawFrost(g, level) {
  base(g, level);
  g.poly([0, -86, 26, -40, 0, 0, -26, -40]).fill(level >= 2 ? 0x9fe8ff : 0x7fd8ff).stroke({ width: 4, color: 0x2b7fae });
  g.poly([0, -70, 12, -40, 0, -14, -12, -40]).fill({ color: 0xffffff, alpha: 0.65 });
  trim(g, level);
  return g;
}

// Статичный фон: трава, дорога, портал, замок, деревья. Рисуется один раз.
export function drawTerrain(layout) {
  const root = new Container();
  const g = new Graphics();
  g.rect(0, 0, layout.width, layout.height).fill(0x5c9e48);
  for (const [x, y, r] of PATCHES) g.circle(x, y, r).fill({ color: 0x6fb257, alpha: 0.55 });
  const pts = layout.road;
  for (const [width, color] of [[80, 0x6e5233], [64, 0xc8a46a], [4, 0xdcc08a]]) {
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.stroke({ width, color, join: 'round', cap: 'round' });
  }
  // портал, из которого выходят враги
  const [px, py] = pts[0];
  g.circle(px, py - 20, 56).fill({ color: 0x8e44ad, alpha: 0.35 }).circle(px, py - 20, 40).fill(0x2a1640).stroke({ width: 6, color: 0xc77dff });
  // замок у конца дороги
  const [gx, gy] = layout.gate;
  g.roundRect(gx - 90, gy - 46, 180, 92, 10).fill(0x9aa1aa).stroke({ width: 6, color: 0x5d636b });
  for (const dx of [-90, 60]) g.roundRect(gx + dx, gy - 86, 30, 130, 6).fill(0xaab1ba).stroke({ width: 5, color: 0x5d636b });
  for (const dx of [-60, -30, 0, 30]) g.rect(gx + dx, gy - 62, 18, 18).fill(0x9aa1aa).stroke({ width: 4, color: 0x5d636b });
  g.roundRect(gx - 26, gy - 10, 52, 56, 24).fill(0x3b2a18);
  g.moveTo(gx + 75, gy - 86).lineTo(gx + 75, gy - 130).stroke({ width: 4, color: 0x3b2a18 });
  g.poly([gx + 75, gy - 130, gx + 112, gy - 118, gx + 75, gy - 106]).fill(0x3d7bd9);
  for (const [x, y, r] of TREES) {
    g.ellipse(x, y + r * 0.8, r, r * 0.35).fill({ color: 0x000000, alpha: 0.22 });
    g.circle(x, y, r).fill(0x2f6b33).circle(x - r * 0.3, y - r * 0.3, r * 0.55).fill(0x3d8a41);
  }
  root.addChild(g);
  return root;
}

const PATCHES = [[90, 160, 70], [620, 200, 90], [640, 420, 60], [60, 760, 80], [660, 1000, 90], [140, 1180, 70], [520, 1220, 60]];
const TREES = [[70, 90, 34], [150, 60, 26], [620, 90, 38], [680, 300, 30], [40, 420, 30], [680, 700, 34], [40, 900, 36], [90, 1060, 30], [640, 1100, 34], [560, 1180, 26]];

function shade(hex, k) {
  const r = ((hex >> 16) & 255) * k, gr = ((hex >> 8) & 255) * k, b = (hex & 255) * k;
  return (r << 16) | (gr << 8) | b;
}
