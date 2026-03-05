import type { BusinessCategory } from '../enums/tenant.enums.js';

// ---------------------------------------------------------------------------
// Types for preset definitions
// ---------------------------------------------------------------------------

export interface ServiceTemplate {
  name: string;
  /** Duration in minutes */
  duration_minutes: number;
  /** Starting price in dollars (USD) */
  base_price: number;
}

export interface AvailabilityHours {
  /** 0 = Sunday, 1 = Monday ... 6 = Saturday */
  day_of_week: number;
  /** HH:mm format, 24-hour */
  start_time: string;
  /** HH:mm format, 24-hour */
  end_time: string;
}

export interface WorkflowPreset {
  trigger: string;
  action: string;
  delay_minutes: number;
  description: string;
}

export interface BusinessPreset {
  category: BusinessCategory;
  label: string;
  description: string;
  default_services: ServiceTemplate[];
  default_availability: AvailabilityHours[];
  default_workflows: WorkflowPreset[];
}

// ---------------------------------------------------------------------------
// Shared default availability patterns
// ---------------------------------------------------------------------------

const WEEKDAY_9_TO_5: AvailabilityHours[] = [
  { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
];

const WEEKDAY_PLUS_SATURDAY: AvailabilityHours[] = [
  ...WEEKDAY_9_TO_5,
  { day_of_week: 6, start_time: '10:00', end_time: '16:00' },
];

const SEVEN_DAYS: AvailabilityHours[] = [
  { day_of_week: 0, start_time: '10:00', end_time: '18:00' },
  { day_of_week: 1, start_time: '09:00', end_time: '21:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '21:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '21:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '21:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '21:00' },
  { day_of_week: 6, start_time: '09:00', end_time: '18:00' },
];

// ---------------------------------------------------------------------------
// Shared default workflow automations
// ---------------------------------------------------------------------------

const STANDARD_WORKFLOWS: WorkflowPreset[] = [
  {
    trigger: 'BOOKING_CONFIRMED',
    action: 'SEND_EMAIL',
    delay_minutes: 0,
    description: 'Send booking confirmation email immediately',
  },
  {
    trigger: 'REMINDER_DUE',
    action: 'SEND_EMAIL',
    delay_minutes: -1440, // 24 hours before
    description: 'Send reminder email 24 hours before event',
  },
  {
    trigger: 'BOOKING_COMPLETED',
    action: 'SEND_EMAIL',
    delay_minutes: 60,
    description: 'Send follow-up / review request 1 hour after completion',
  },
];

// ---------------------------------------------------------------------------
// Preset definitions per BusinessCategory
// ---------------------------------------------------------------------------

export const BUSINESS_PRESETS: Record<BusinessCategory, BusinessPreset> = {
  VENUE: {
    category: 'VENUE',
    label: 'Venue / Event Space',
    description: 'Wedding venues, banquet halls, conference centers, and event spaces',
    default_services: [
      { name: 'Full-Day Venue Rental', duration_minutes: 720, base_price: 5000 },
      { name: 'Half-Day Venue Rental', duration_minutes: 360, base_price: 3000 },
      { name: 'Ceremony-Only Package', duration_minutes: 120, base_price: 1500 },
      { name: 'Venue Tour', duration_minutes: 60, base_price: 0 },
    ],
    default_availability: SEVEN_DAYS,
    default_workflows: [
      ...STANDARD_WORKFLOWS,
      {
        trigger: 'BOOKING_CREATED',
        action: 'SEND_EMAIL',
        delay_minutes: 0,
        description: 'Send inquiry acknowledgment with next steps',
      },
    ],
  },

  SALON: {
    category: 'SALON',
    label: 'Salon / Barbershop',
    description: 'Hair salons, barbershops, nail salons, and beauty services',
    default_services: [
      { name: 'Haircut', duration_minutes: 45, base_price: 45 },
      { name: 'Hair Color', duration_minutes: 120, base_price: 120 },
      { name: 'Blowout / Styling', duration_minutes: 45, base_price: 55 },
      { name: 'Manicure', duration_minutes: 30, base_price: 35 },
      { name: 'Pedicure', duration_minutes: 45, base_price: 50 },
    ],
    default_availability: WEEKDAY_PLUS_SATURDAY,
    default_workflows: STANDARD_WORKFLOWS,
  },

  STUDIO: {
    category: 'STUDIO',
    label: 'Studio',
    description: 'Photography studios, recording studios, art studios, and creative spaces',
    default_services: [
      { name: 'Portrait Session', duration_minutes: 60, base_price: 250 },
      { name: 'Mini Session', duration_minutes: 30, base_price: 150 },
      { name: 'Studio Rental (Hourly)', duration_minutes: 60, base_price: 100 },
      { name: 'Full-Day Studio Rental', duration_minutes: 480, base_price: 600 },
    ],
    default_availability: WEEKDAY_PLUS_SATURDAY,
    default_workflows: [
      ...STANDARD_WORKFLOWS,
      {
        trigger: 'BOOKING_CONFIRMED',
        action: 'SEND_EMAIL',
        delay_minutes: 5,
        description: 'Send preparation guide after booking confirmation',
      },
    ],
  },

  FITNESS: {
    category: 'FITNESS',
    label: 'Fitness / Wellness',
    description: 'Gyms, yoga studios, personal trainers, spas, and wellness centers',
    default_services: [
      { name: 'Personal Training Session', duration_minutes: 60, base_price: 80 },
      { name: 'Group Class', duration_minutes: 60, base_price: 25 },
      { name: 'Yoga Session', duration_minutes: 75, base_price: 20 },
      { name: 'Massage (60 min)', duration_minutes: 60, base_price: 90 },
      { name: 'Massage (90 min)', duration_minutes: 90, base_price: 120 },
    ],
    default_availability: SEVEN_DAYS,
    default_workflows: STANDARD_WORKFLOWS,
  },

  PROFESSIONAL: {
    category: 'PROFESSIONAL',
    label: 'Professional Services',
    description: 'Consultants, lawyers, accountants, therapists, and advisors',
    default_services: [
      { name: 'Initial Consultation', duration_minutes: 60, base_price: 150 },
      { name: 'Follow-Up Session', duration_minutes: 30, base_price: 75 },
      { name: 'Strategy Session', duration_minutes: 90, base_price: 250 },
    ],
    default_availability: WEEKDAY_9_TO_5,
    default_workflows: [
      ...STANDARD_WORKFLOWS,
      {
        trigger: 'BOOKING_CONFIRMED',
        action: 'SEND_EMAIL',
        delay_minutes: 5,
        description: 'Send intake form / questionnaire after booking',
      },
    ],
  },

  OTHER: {
    category: 'OTHER',
    label: 'Other',
    description: 'Custom or uncategorized service businesses',
    default_services: [
      { name: 'Service Appointment', duration_minutes: 60, base_price: 100 },
      { name: 'Consultation', duration_minutes: 30, base_price: 0 },
    ],
    default_availability: WEEKDAY_9_TO_5,
    default_workflows: STANDARD_WORKFLOWS,
  },
} as const;

/**
 * Returns the display label for a business category.
 * Priority: custom categoryLabel > preset label > raw enum value.
 */
export function getCategoryDisplayLabel(
  category: BusinessCategory,
  categoryLabel?: string | null,
): string {
  if (categoryLabel) return categoryLabel;
  return BUSINESS_PRESETS[category]?.label ?? category;
}
