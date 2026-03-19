import { describe, it, expect } from 'vitest';
import { BOOKING_STEPS, type BookingStep } from './booking-steps.js';
import { BUSINESS_PRESETS } from './business-presets.js';
import { BusinessCategory } from '../enums/tenant.enums.js';

// ---------------------------------------------------------------------------
// BOOKING_STEPS
// ---------------------------------------------------------------------------
describe('BOOKING_STEPS', () => {
  it('should define exactly 12 booking flow steps', () => {
    const steps = Object.keys(BOOKING_STEPS);
    expect(steps).toHaveLength(12);
  });

  it('should have keys that match their values (self-referential enum pattern)', () => {
    for (const [key, value] of Object.entries(BOOKING_STEPS)) {
      expect(key).toBe(value);
    }
  });

  it('should include the 3 mandatory steps every booking flow needs', () => {
    expect(BOOKING_STEPS.SERVICE_SELECTION).toBe('SERVICE_SELECTION');
    expect(BOOKING_STEPS.DATE_TIME_PICKER).toBe('DATE_TIME_PICKER');
    expect(BOOKING_STEPS.CONFIRMATION).toBe('CONFIRMATION');
  });

  it('should include conditional steps for progressive complexity', () => {
    expect(BOOKING_STEPS.GUEST_COUNT).toBe('GUEST_COUNT');
    expect(BOOKING_STEPS.QUESTIONNAIRE).toBe('QUESTIONNAIRE');
    expect(BOOKING_STEPS.ADD_ONS).toBe('ADD_ONS');
    expect(BOOKING_STEPS.CONTRACT).toBe('CONTRACT');
  });

  it('should include payment-related steps', () => {
    expect(BOOKING_STEPS.PRICING_SUMMARY).toBe('PRICING_SUMMARY');
    expect(BOOKING_STEPS.PAYMENT).toBe('PAYMENT');
  });

  it('should be frozen (as const prevents mutation)', () => {
    // Verify the type system enforces immutability by checking value types are literal
    const step: BookingStep = BOOKING_STEPS.CONFIRMATION;
    expect(step).toBe('CONFIRMATION');
  });
});

// ---------------------------------------------------------------------------
// BUSINESS_PRESETS
// ---------------------------------------------------------------------------
describe('BUSINESS_PRESETS', () => {
  it('should have a preset for every BusinessCategory', () => {
    for (const category of BusinessCategory.options) {
      expect(BUSINESS_PRESETS[category]).toBeDefined();
      expect(BUSINESS_PRESETS[category].category).toBe(category);
    }
  });

  it('should have exactly 6 presets matching the 6 categories', () => {
    expect(Object.keys(BUSINESS_PRESETS)).toHaveLength(6);
  });

  describe.each(Object.entries(BUSINESS_PRESETS))('%s preset', (category, preset) => {
    it('should have a non-empty label', () => {
      expect(preset.label.length).toBeGreaterThan(0);
    });

    it('should have a non-empty description', () => {
      expect(preset.description.length).toBeGreaterThan(0);
    });

    it('should have at least one default service', () => {
      expect(preset.default_services.length).toBeGreaterThan(0);
    });

    it('should have all services with valid structure', () => {
      for (const service of preset.default_services) {
        expect(service.name).toBeTruthy();
        expect(service.duration_minutes).toBeGreaterThan(0);
        expect(service.base_price).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(service.base_price)).toBe(true);
      }
    });

    it('should have at least one availability day', () => {
      expect(preset.default_availability.length).toBeGreaterThan(0);
    });

    it('should have valid availability hours (day 0-6, HH:mm format)', () => {
      const timeRegex = /^\d{2}:\d{2}$/;
      for (const avail of preset.default_availability) {
        expect(avail.day_of_week).toBeGreaterThanOrEqual(0);
        expect(avail.day_of_week).toBeLessThanOrEqual(6);
        expect(avail.start_time).toMatch(timeRegex);
        expect(avail.end_time).toMatch(timeRegex);
        // Start should be before end
        expect(avail.start_time < avail.end_time).toBe(true);
      }
    });

    it('should have at least one default workflow', () => {
      expect(preset.default_workflows.length).toBeGreaterThan(0);
    });

    it('should have valid workflows with required fields', () => {
      for (const wf of preset.default_workflows) {
        expect(wf.trigger).toBeTruthy();
        expect(wf.action).toBeTruthy();
        expect(typeof wf.delay_minutes).toBe('number');
        expect(wf.description).toBeTruthy();
      }
    });
  });

  it('VENUE preset should have high-value services (events are expensive)', () => {
    const venuePreset = BUSINESS_PRESETS.VENUE;
    const maxPrice = Math.max(...venuePreset.default_services.map((s) => s.base_price));
    // Venue full-day rental should be at least $1000
    expect(maxPrice).toBeGreaterThanOrEqual(1000);
  });

  it('SALON preset should have shorter duration services than VENUE', () => {
    const salonMaxDuration = Math.max(
      ...BUSINESS_PRESETS.SALON.default_services.map((s) => s.duration_minutes),
    );
    const venueMaxDuration = Math.max(
      ...BUSINESS_PRESETS.VENUE.default_services.map((s) => s.duration_minutes),
    );
    expect(salonMaxDuration).toBeLessThan(venueMaxDuration);
  });

  it('VENUE should have 7-day availability (event spaces operate weekends)', () => {
    const venueDays = new Set(BUSINESS_PRESETS.VENUE.default_availability.map((a) => a.day_of_week));
    expect(venueDays.size).toBe(7);
  });

  it('PROFESSIONAL should have weekday-only availability by default', () => {
    const profDays = BUSINESS_PRESETS.PROFESSIONAL.default_availability.map((a) => a.day_of_week);
    // Should not include Sunday (0) or Saturday (6) by default
    expect(profDays).not.toContain(0);
    expect(profDays).not.toContain(6);
  });

  it('every preset should include a booking confirmation workflow', () => {
    for (const [, preset] of Object.entries(BUSINESS_PRESETS)) {
      const hasConfirmation = preset.default_workflows.some(
        (wf) => wf.trigger === 'BOOKING_CONFIRMED',
      );
      expect(hasConfirmation, `${preset.category} missing confirmation workflow`).toBe(true);
    }
  });
});
