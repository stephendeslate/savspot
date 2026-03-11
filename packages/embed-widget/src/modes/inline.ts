import type { SavSpotConfig } from '../types';
import { injectStyles } from '../styles';
import { createIframe, setupMessageListener } from '../iframe-manager';

export function renderInline(config: SavSpotConfig): (() => void) | undefined {
  if (!config.container) {
    console.error('[SavSpot] Inline mode requires a "container" CSS selector.');
    return undefined;
  }

  const target = document.querySelector(config.container);
  if (!target) {
    console.error(`[SavSpot] Container "${config.container}" not found.`);
    return undefined;
  }

  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'savspot-inline-container';

  const iframe = createIframe(config);
  wrapper.appendChild(iframe);
  target.appendChild(wrapper);

  const removeListener = setupMessageListener(config, iframe);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      iframe.style.width = `${wrapper.clientWidth}px`;
    });
    resizeObserver.observe(wrapper);
  }

  return () => {
    removeListener();
    resizeObserver?.disconnect();
    wrapper.remove();
  };
}
