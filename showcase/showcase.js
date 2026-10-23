// Витрина: телефон с рекламой, переключение ориентации, оверлей производительности, таблица сборок.
const frame = document.getElementById('playable');
const device = document.querySelector('.device');
const events = document.getElementById('events');
const debug = document.getElementById('debug');
const HINT = 'Tap a stone spot to build a tower.';

function reload() {
  frame.src = `play/preview/index.html${debug.checked ? '?debug' : ''}`;
  events.textContent = HINT;
}

document.querySelectorAll('button[data-orientation]').forEach((button) => {
  button.addEventListener('click', () => {
    device.dataset.orientation = button.dataset.orientation;
    document.querySelectorAll('button[data-orientation]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});
document.getElementById('restart').addEventListener('click', reload);
debug.addEventListener('change', reload);

// Сборка preview сообщает о нажатии CTA и конце игры — в настоящей сети здесь открылся бы стор.
window.addEventListener('message', (e) => {
  if (e.data?.source !== 'bastion') return;
  if (e.data.type === 'cta') events.textContent = 'CTA tapped → the network opens the store.';
  if (e.data.type === 'end') events.textContent = 'Gameplay over → end card is shown.';
});

fetch('play/manifest.json')
  .then((r) => r.json())
  .then(({ builds }) => {
    const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
    document.getElementById('builds').innerHTML = builds.map((b) => `
      <tr>
        <td><a href="play/${b.network}/index.html" download="bastion-${b.network}.html">${b.network}</a></td>
        <td>${kb(b.bytes)}</td>
        <td>${kb(b.gzip)}</td>
        <td>${kb(b.budget)}</td>
        <td>${b.ok ? '✓' : '✗'}</td>
      </tr>`).join('');
  })
  .catch(() => {
    document.getElementById('builds').innerHTML = '<tr><td colspan="5">Run <code>npm run build</code> to produce builds.</td></tr>';
  });
