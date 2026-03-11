import type { SavSpotConfig } from './types';
import { renderButton } from './modes/button';
import { openPopup } from './modes/popup';
import { renderInline } from './modes/inline';

function init(config: SavSpotConfig): void {
  if (!config.slug) {
    console.error('[SavSpot] "slug" is required.');
    return;
  }

  const mode = config.mode ?? 'button';

  switch (mode) {
    case 'inline':
      renderInline(config);
      break;
    case 'popup':
      initButtonWithPopup(config);
      break;
    case 'button':
    default:
      initButtonWithPopup(config);
      break;
  }
}

function initButtonWithPopup(config: SavSpotConfig): void {
  const scripts = document.querySelectorAll('script[data-slug]');
  const currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  renderButton(config, currentScript, () => {
    openPopup(config);
  });
}

function autoInit(): void {
  const scripts = document.querySelectorAll('script[data-slug]');
  const currentScript = scripts[scripts.length - 1] as HTMLScriptElement | undefined;
  if (!currentScript) return;

  const slug = currentScript.getAttribute('data-slug');
  if (!slug) return;

  const mode = (currentScript.getAttribute('data-mode') ?? 'button') as SavSpotConfig['mode'];
  const service = currentScript.getAttribute('data-service') ?? undefined;
  const source = currentScript.getAttribute('data-source') ?? undefined;
  const container = currentScript.getAttribute('data-container') ?? undefined;
  const primaryColor = currentScript.getAttribute('data-color') ?? undefined;

  const config: SavSpotConfig = {
    slug,
    mode,
    service,
    source,
    container,
    theme: primaryColor ? { primaryColor } : undefined,
  };

  init(config);
}

declare global {
  interface Window {
    SavSpot?: { init: (config: SavSpotConfig) => void };
  }
}

window.SavSpot = { init };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

export type { SavSpotConfig, BookingResult } from './types';
