'use client';

import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import type { PostHog } from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<PostHog | null>(null);

  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
    if (key) {
      import('posthog-js').then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] || 'https://us.i.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: false,
          capture_pageleave: true,
        });
        setClient(posthog);
      });
    }
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return <PHProvider client={client}>{children}</PHProvider>;
}
