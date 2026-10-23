// Google Ads (HTML5 playable в App-кампаниях): переход в стор — ExitApi.exit(),
// объект ExitApi предоставляет среда показа объявления.
export function createNetwork() {
  return {
    name: 'google',
    ready: () => Promise.resolve(),
    onVisibility: (fn) => {
      const listener = () => fn(!document.hidden);
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener); // выход — пара ко входу
    },
    openStore: () => window.ExitApi?.exit(),
    gameEnd: () => {},
  };
}
