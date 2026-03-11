const STYLE_ID = 'savspot-embed-styles';

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .savspot-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .savspot-overlay.savspot-visible {
      opacity: 1;
    }
    .savspot-popup-container {
      background: #fff;
      border-radius: 12px;
      width: 90vw;
      max-width: 480px;
      height: 80vh;
      max-height: 700px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    @media (max-width: 640px) {
      .savspot-popup-container {
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
    }
    .savspot-popup-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #333;
      z-index: 1;
      line-height: 1;
    }
    .savspot-popup-close:hover {
      background: rgba(0, 0, 0, 0.2);
    }
    .savspot-iframe {
      border: none;
      width: 100%;
      height: 100%;
    }
    .savspot-inline-container .savspot-iframe {
      display: block;
      width: 100%;
      min-height: 400px;
    }
    .savspot-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #fff;
      border: none;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      line-height: 1;
      transition: opacity 0.15s ease, transform 0.15s ease;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    }
    .savspot-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
}
