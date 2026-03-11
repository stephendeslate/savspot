import type { SavSpotConfig } from '../types';
import { injectStyles } from '../styles';
import { createIframe, setupMessageListener } from '../iframe-manager';

let activeOverlay: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

export function openPopup(config: SavSpotConfig): void {
  if (activeOverlay) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'savspot-overlay';
  activeOverlay = overlay;

  const container = document.createElement('div');
  container.className = 'savspot-popup-container';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'savspot-popup-close';
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.setAttribute('aria-label', 'Close');

  const iframe = createIframe(config);

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('savspot-visible');
  });

  function close(): void {
    overlay.classList.remove('savspot-visible');
    setTimeout(() => {
      overlay.remove();
      activeOverlay = null;
      activeCleanup?.();
      activeCleanup = null;
    }, 200);
    config.onClose?.();
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);

  const removeListener = setupMessageListener(config, iframe, close);
  activeCleanup = () => {
    removeListener();
    document.removeEventListener('keydown', onKeyDown);
  };
}

export function closePopup(): void {
  if (activeOverlay) {
    activeOverlay.classList.remove('savspot-visible');
    setTimeout(() => {
      activeOverlay?.remove();
      activeOverlay = null;
      activeCleanup?.();
      activeCleanup = null;
    }, 200);
  }
}
