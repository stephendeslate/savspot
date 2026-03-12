import '@testing-library/jest-dom/vitest';

// Polyfill pointer capture APIs for Radix UI components in JSDOM
if (typeof Element.prototype.hasPointerCapture !== 'function') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// Polyfill scrollIntoView for Radix Select
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}

// Polyfill ResizeObserver for Radix Tooltip/Popover
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}
