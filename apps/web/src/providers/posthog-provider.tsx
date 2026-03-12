'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
    if (key) {
      posthog.init(key, {
        api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
      });
    }
  }, []);

  if (!process.env['NEXT_PUBLIC_POSTHOG_KEY']) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
