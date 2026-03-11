import type { SavSpotConfig, PostMessageData, BookingResult } from './types';

const BASE_URL_DEFAULT = 'https://app.savspot.com';

function getBaseUrl(): string {
  const scripts = document.querySelectorAll('script[data-slug]');
  const script = scripts[scripts.length - 1] as HTMLScriptElement | undefined;
  return (script?.getAttribute('data-base-url') ?? BASE_URL_DEFAULT).replace(/\/$/, '');
}

export function buildIframeSrc(config: SavSpotConfig): string {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  params.set('mode', config.mode);
  if (config.service) params.set('service', config.service);
  params.set('source', config.source ?? 'WIDGET');
  return `${base}/embed/book/${encodeURIComponent(config.slug)}?${params.toString()}`;
}

export function createIframe(config: SavSpotConfig): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = buildIframeSrc(config);
  iframe.className = 'savspot-iframe';
  iframe.setAttribute('allow', 'payment');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

export function setupMessageListener(
  config: SavSpotConfig,
  iframe: HTMLIFrameElement,
  onClose?: () => void,
): () => void {
  function handler(event: MessageEvent): void {
    if (!iframe.contentWindow || event.source !== iframe.contentWindow) return;

    const data = event.data as PostMessageData | undefined;
    if (!data || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'savspot:ready':
        sendThemeToIframe(iframe, config);
        break;
      case 'savspot:resize':
        if (data.payload && typeof data.payload['height'] === 'number') {
          iframe.style.height = `${data.payload['height']}px`;
        }
        break;
      case 'savspot:booked':
        if (config.onBooked && data.payload) {
          config.onBooked(data.payload as unknown as BookingResult);
        }
        break;
      case 'savspot:close':
        config.onClose?.();
        onClose?.();
        break;
    }
  }

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

function sendThemeToIframe(iframe: HTMLIFrameElement, config: SavSpotConfig): void {
  if (!iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'savspot:theme',
      payload: config.theme ?? {},
    },
    '*',
  );
}
