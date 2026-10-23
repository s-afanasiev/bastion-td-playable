// Сети на MRAID (Unity Ads, AppLovin и др.): ждём ready и видимости, стор — mraid.open(url).
// Без window.mraid (открыли в браузере) ведёт себя как обычная страница.
export function createNetwork({ storeUrl }) {
  const mraid = () => window.mraid;
  return {
    name: 'mraid',
    ready: () => new Promise((resolve) => {
      const m = mraid();
      if (!m) return resolve();
      const whenViewable = () => {
        if (m.isViewable()) return resolve();
        const onChange = (viewable) => {
          if (!viewable) return;
          m.removeEventListener('viewableChange', onChange);
          resolve();
        };
        m.addEventListener('viewableChange', onChange);
      };
      if (m.getState() === 'loading') m.addEventListener('ready', whenViewable);
      else whenViewable();
    }),
    onVisibility: (fn) => {
      const onViewable = (viewable) => fn(Boolean(viewable));
      const onPage = () => fn(!document.hidden);
      mraid()?.addEventListener('viewableChange', onViewable);
      document.addEventListener('visibilitychange', onPage);
      return () => { // выход — пара ко входу
        mraid()?.removeEventListener('viewableChange', onViewable);
        document.removeEventListener('visibilitychange', onPage);
      };
    },
    openStore: () => (mraid() ? mraid().open(storeUrl) : window.open(storeUrl, '_blank')),
    gameEnd: () => {},
  };
}
