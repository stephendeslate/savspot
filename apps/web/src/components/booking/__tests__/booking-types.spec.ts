import { describe, it, expect } from 'vitest';
import { API_URL } from '../booking-types';
import type {
  BookingStepType,
  BookingSession,
  BookingSessionData,
  TenantData,
  GuestConfig,
  ServiceAddon,
  IntakeFormConfig,
} from '../booking-types';

describe('booking-types', () => {
  it('should export API_URL defaulting to localhost:3001', () => {
    expect(API_URL).toBe('http://localhost:3001');
  });

  it('should have correct step type literals', () => {
    const validSteps: BookingStepType[] = [
      'SERVICE_SELECTION',
      'VENUE_SELECTION',
      'DATE_TIME_PICKER',
      'GUEST_COUNT',
      'QUESTIONNAIRE',
      'ADD_ONS',
      'PRICING_SUMMARY',
      'CLIENT_INFO',
      'PAYMENT',
      'CONFIRMATION',
    ];

    // Type check: all 10 step types are valid
    expect(validSteps).toHaveLength(10);
  });

  it('should have structurally valid BookingSession shape', () => {
    const session: BookingSession = {
      id: 'session-1',
      serviceId: 'svc-1',
      resolvedSteps: [
        { type: 'DATE_TIME_PICKER', label: 'Pick a time', order: 0 },
        { type: 'CONFIRMATION', label: 'Done', order: 1 },
      ],
      status: 'ACTIVE',
      currentStep: 0,
      data: {},
    };

    expect(session.resolvedSteps).toHaveLength(2);
    expect(session.data).toBeDefined();
  });

  it('should have structurally valid TenantData shape', () => {
    const tenant: TenantData = {
      id: 'tenant-1',
      name: 'Test Salon',
      slug: 'test-salon',
      description: 'A great salon',
      logoUrl: null,
      coverPhotoUrl: null,
      brandColor: '#ff0000',
      timezone: 'America/New_York',
      currency: 'USD',
      address: { street: '123 Main St', city: 'New York', state: 'NY', zip: '10001' },
      contactEmail: 'test@salon.com',
      contactPhone: '+1234567890',
      category: 'BEAUTY',
      categoryLabel: 'Beauty & Wellness',
      services: [],
    };

    expect(tenant.slug).toBe('test-salon');
    expect(tenant.services).toEqual([]);
  });

  it('should have structurally valid GuestConfig shape', () => {
    const config: GuestConfig = {
      min_guests: 1,
      max_guests: 10,
      price_per_guest: 25,
      age_tiers: [
        { label: 'Adult', min_age: 18, max_age: 99, price: 50 },
        { label: 'Child', min_age: 5, max_age: 17, price: 25 },
      ],
    };

    expect(config.age_tiers).toHaveLength(2);
    expect(config.min_guests).toBeLessThan(config.max_guests);
  });

  it('should have structurally valid ServiceAddon shape', () => {
    const addon: ServiceAddon = {
      id: 'addon-1',
      name: 'Deep Conditioning',
      description: 'Extra conditioning treatment',
      price: 15,
    };

    expect(addon.price).toBeGreaterThan(0);
  });

  it('should have structurally valid IntakeFormConfig shape', () => {
    const config: IntakeFormConfig = {
      fields: [
        {
          id: 'field-1',
          label: 'Allergies',
          type: 'TEXT',
          required: true,
          placeholder: 'List any allergies...',
        },
        {
          id: 'field-2',
          label: 'Preferred stylist',
          type: 'SELECT',
          required: false,
          options: ['Any', 'Alice', 'Bob'],
        },
      ],
    };

    expect(config.fields).toHaveLength(2);
    expect(config.fields[0]!.required).toBe(true);
  });

  it('should allow arbitrary keys in BookingSessionData', () => {
    const data: BookingSessionData = {
      serviceId: 'svc-1',
      customField: 'custom value',
    };

    expect(data['customField']).toBe('custom value');
  });
});
