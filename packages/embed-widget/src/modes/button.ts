import type { SavSpotConfig } from '../types';
import { injectStyles } from '../styles';

export function renderButton(
  config: SavSpotConfig,
  insertAfter: Element,
  onClick: () => void,
): HTMLButtonElement {
  injectStyles();

  const btn = document.createElement('button');
  btn.className = 'savspot-btn';
  btn.textContent = 'Book Now';

  const color = config.theme?.primaryColor ?? '#6366f1';
  const radius = config.theme?.borderRadius ?? '8px';
  btn.style.backgroundColor = color;
  btn.style.borderRadius = radius;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });

  insertAfter.parentNode?.insertBefore(btn, insertAfter.nextSibling);
  return btn;
}
