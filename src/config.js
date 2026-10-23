// Все числа поведения и бюджеты — здесь, а не в глубине модулей (П6).

// Сборки под рекламные сети: одна сборка — один HTML-файл со своим адаптером (src/networks/<имя>.js).
export const NETWORKS = ['preview', 'meta', 'google', 'mraid'];

// Размер проверяет scripts/build.mjs, кадр — оверлей ?debug.
export const BUDGET = {
  htmlBytes: 700 * 1024, // один HTML-файл без сжатия; у сетей лимиты 2–5 МБ
  sprites: 400, // видимых объектов сцены одновременно
};

// Логическое поле 720 × 1280 вписывается в экран целиком; все координаты — в нём.
export const LAYOUT = {
  width: 720,
  height: 1280,
  // дорога змейкой от портала наверху к замку внизу
  road: [[360, 180], [360, 300], [130, 300], [130, 560], [590, 560], [590, 820], [360, 820], [360, 1050]],
  gate: [360, 1110],
  // площадки под башни — в петлях дороги, каждая достаёт до двух-трёх её отрезков
  spots: [[250, 430], [470, 430], [470, 690], [250, 690], [250, 940], [470, 940]],
};

export const CONFIG = {
  storeUrl: 'https://example.com/store', // подставляется под кампанию
  render: { maxResolution: 2 },
  scenario: { introSeconds: 0.6, timeLimit: 50, endCardDelay: 1.3 },
  hints: { upgradeAfter: 1.2 }, // секунды с момента, когда улучшение стало по карману
  economy: { startGold: 100 },
  lives: 5,

  creeps: {
    grunt: { hp: 70, speed: 120, bounty: 10, radius: 22 },
    runner: { hp: 45, speed: 160, bounty: 8, radius: 18 },
    brute: { hp: 230, speed: 80, bounty: 20, radius: 30 },
    boss: { hp: 700, speed: 95, bounty: 60, radius: 42 },
  },
  // волна: с момента at выходят count врагов вида kind с интервалом every (секунды боя)
  waves: [
    { wave: 1, at: 0.5, kind: 'grunt', count: 5, every: 1.0 },
    { wave: 2, at: 6, kind: 'runner', count: 6, every: 0.55 },
    { wave: 2, at: 8, kind: 'brute', count: 2, every: 1.5 },
    { wave: 3, at: 11, kind: 'grunt', count: 4, every: 0.7 },
    { wave: 3, at: 12, kind: 'boss', count: 1, every: 0 },
  ],

  // вид башни: цена, улучшение, характеристики уровня 1; политика цели и вид попадания — по имени из реестра
  towers: {
    archer: { cost: 40, upgrade: 50, range: 210, interval: 0.42, damage: 13, targeting: 'first', impact: 'single' },
    cannon: { cost: 60, upgrade: 70, range: 190, interval: 1.15, damage: 32, splash: 70, targeting: 'first', impact: 'splash' },
    frost: { cost: 50, upgrade: 55, range: 200, interval: 0.7, damage: 6, chill: 0.5, chillFor: 1.4, targeting: 'unchilled', impact: 'chill' },
  },
  levels: { max: 2, damage: 1.8, range: 1.15, interval: 0.85 }, // уровень 2: урон ×1.8, радиус ×1.15, интервал ×0.85
  tutorialTower: 'archer', // что подсказывает рука в первом меню

  volleys: { capacity: 96, speed: 720 },
  sparks: { capacity: 300 },

  // внешний вид снарядов и вспышек — таблица, а не ветки в видах
  looks: {
    shots: {
      archer: { tint: 0xfff3c4, size: 0.7 },
      cannon: { tint: 0x2b2f35, size: 1.3 },
      frost: { tint: 0x9fe8ff, size: 0.9 },
    },
    sparks: {
      shot: {
        archer: { count: 4, speed: 160, life: 0.22, size: 0.6, tint: 0xfff3c4 },
        cannon: { count: 14, speed: 260, life: 0.45, size: 1.2, tint: 0xffa53d },
        frost: { count: 6, speed: 160, life: 0.35, size: 0.8, tint: 0x9fe8ff },
      },
      kill: { count: 12, speed: 260, life: 0.45, size: 1.1, tint: 0xff6b5b },
      bossKill: { count: 46, speed: 420, life: 1.0, size: 1.8, tint: 0xc77dff },
      build: { count: 18, speed: 300, life: 0.5, size: 1.2, tint: 0xffd36b },
      breach: { count: 16, speed: 280, life: 0.5, size: 1.2, tint: 0xff4d4d },
    },
  },
};
