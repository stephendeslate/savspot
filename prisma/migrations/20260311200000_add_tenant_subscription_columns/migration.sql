-- Add missing columns that were in the Prisma schema but lacked migrations

-- ==========================================================================
-- TENANTS
-- ==========================================================================

-- Subscription columns
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_current_period_end" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_grace_period_end" TIMESTAMP(3);

-- Benchmark & directory columns
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "benchmark_opt_out" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;

-- Voice columns
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "voice_phone_number" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "voice_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "voice_config" JSONB;

-- Multi-currency support
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "supported_currencies" TEXT[] NOT NULL DEFAULT ARRAY['USD']::TEXT[];

-- ==========================================================================
-- BOOKINGS
-- ==========================================================================

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "referral_link_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "no_show_risk_score" DECIMAL(3,2);

-- Foreign key for referral_link_id
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_referral_link_id_fkey"
    FOREIGN KEY ("referral_link_id") REFERENCES "referral_links"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Index on referral_link_id
CREATE INDEX IF NOT EXISTS "bookings_referral_link_id_idx" ON "bookings"("referral_link_id");

-- ==========================================================================
-- SERVICE_ADDONS
-- ==========================================================================

ALTER TABLE "service_addons" ADD COLUMN IF NOT EXISTS "is_required" BOOLEAN NOT NULL DEFAULT false;

-- ==========================================================================
-- VENUES
-- ==========================================================================

ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "booking_slug" TEXT;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "operating_hours" JSONB;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "branding" JSONB;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "timezone" TEXT;

-- Unique constraint on booking_slug
DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_booking_slug_key" UNIQUE ("booking_slug");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==========================================================================
-- CALENDAR_CONNECTIONS
-- ==========================================================================

ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "webhook_channel_id" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "webhook_token" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "webhook_expires_at" TIMESTAMP(3);
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "webhook_status" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "sync_token" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN IF NOT EXISTS "delta_link" TEXT;

-- ==========================================================================
-- SERVICES
-- ==========================================================================

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "preference_template" JSONB;

-- ==========================================================================
-- CONTRACTS
-- ==========================================================================

ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "document_hash" TEXT;

-- ==========================================================================
-- CLIENT_PROFILES
-- ==========================================================================

ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "optimal_reminder_lead_hours" DECIMAL(65,30);
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "rebooking_interval_days" INTEGER;

-- ==========================================================================
-- API_KEYS
-- ==========================================================================

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_rotated_at" TIMESTAMP(3);

-- ==========================================================================
-- REFERRAL_LINKS
-- ==========================================================================

ALTER TABLE "referral_links" ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2);

-- ==========================================================================
-- VENUES (additional columns)
-- ==========================================================================

ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
