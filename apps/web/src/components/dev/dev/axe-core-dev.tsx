'use client';

import { useEffect } from 'react';

/**
 * Development-only component that initialises @axe-core/react.
 * Reports WCAG violations to the browser console in real time.
 *
 * Only loaded when NODE_ENV === 'development' — tree-shaken in production.
 */
export function AxeCoreDev() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamic import to keep axe-core out of production bundles
    void Promise.all([
      import('@axe-core/react'),
      import('react'),
      import('react-dom'),
    ]).then(([axeModule, React, ReactDOM]) => {
      axeModule.default(React, ReactDOM, 1000);
    });
  }, []);

  return null;
}
