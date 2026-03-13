export const TIER_FEATURES = {
  FREE: {
    maxStaff: 1,
    maxBookingsPerMonth: 100,
    smsAllocation: 0,
    embedModes: ['redirect'] as const,
    clientManagement: 'basic' as const,
    contracts: 'basic' as const,
    analytics: 'basic' as const,
    teamManagement: false,
    multiLocation: false,
    customTemplates: false,
  },
  PRO: {
    maxStaff: 15,
    maxBookingsPerMonth: Infinity,
    smsAllocation: 500,
    embedModes: ['redirect', 'popup', 'inline'] as const,
    clientManagement: 'full' as const,
    contracts: 'full' as const,
    analytics: 'advanced' as const,
    teamManagement: true,
    multiLocation: true,
    customTemplates: true,
  },
} as const;

export type FeatureKey = keyof typeof TIER_FEATURES.FREE;
