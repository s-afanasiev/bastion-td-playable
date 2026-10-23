// Сборка для браузера и витрины. «Стор» внутри витрины — сообщение родительской странице,
// отдельно открытая сборка открывает ссылку в новой вкладке.
// Контракт адаптера (общий для всех сетей):
//   ready() → Promise — среда готова показать рекламу
//   onVisibility(fn(visible)) → отписка — реклама скрыта или снова на экране
//   openStore() — кнопка установки
//   gameEnd() — геймплей окончен
export function createNetwork({ storeUrl }) {
  const embedded = window.parent !== window;
  const tell = (type) => window.parent.postMessage({ source: 'bastion', type }, '*');
  return {
    name: 'preview',
    ready: () => Promise.resolve(),
    onVisibility: (fn) => {
      const listener = () => fn(!document.hidden);
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener); // выход — пара ко входу
    },
    openStore: () => (embedded ? tell('cta') : window.open(storeUrl, '_blank')),
    gameEnd: () => embedded && tell('end'),
  };
}
