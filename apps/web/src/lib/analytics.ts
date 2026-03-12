import posthog from 'posthog-js';

export const analytics = {
  track(event: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture(event, properties);
    }
  },

  identify(userId: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.identify(userId, properties);
    }
  },

  reset() {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.reset();
    }
  },

  group(type: string, key: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.group(type, key, properties);
    }
  },
};
