export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface GuestConfig {
  min_guests: number;
  max_guests: number;
  price_per_guest?: number;
  age_tiers?: AgeTier[];
}

export interface AgeTier {
  label: string;
  min_age: number;
  max_age: number;
  price_modifier: number;
}

export interface TierConfig {
  tiers: PriceTier[];
}

export interface PriceTier {
  label: string;
  min_quantity: number;
  max_quantity?: number;
  price_per_unit: number;
}

export interface DepositConfig {
  type: 'FIXED' | 'PERCENTAGE';
  amount: number;
  due_at_booking: boolean;
  remainder_due_hours_before?: number;
}

export interface CancellationPolicy {
  free_cancellation_hours: number;
  late_cancel_fee_type: 'FIXED' | 'PERCENTAGE';
  late_cancel_fee_amount: number;
  no_show_fee_type: 'FIXED' | 'PERCENTAGE';
  no_show_fee_amount: number;
}

export interface IntakeFormConfig {
  fields: IntakeFormField[];
}

export interface IntakeFormField {
  id: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX' | 'DATE' | 'NUMBER';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ActionConfig {
  template_id?: string;
  channel?: string;
  delay_minutes?: number;
  custom_message?: string;
}
