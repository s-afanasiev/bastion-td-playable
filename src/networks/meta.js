// Meta (Facebook, Instagram, Audience Network): переход в стор — FbPlayableAd.onCTAClick(),
// ссылку на стор подставляет сама платформа.
export function createNetwork() {
  return {
    name: 'meta',
    ready: () => Promise.resolve(),
    onVisibility: (fn) => {
      const listener = () => fn(!document.hidden);
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener); // выход — пара ко входу
    },
    openStore: () => window.FbPlayableAd?.onCTAClick(),
    gameEnd: () => {},
  };
}
