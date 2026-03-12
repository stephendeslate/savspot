-- Phase 4 Migration: Create missing enums, tables, then apply RLS policies

-- ============================================================================
-- MISSING ENUMS (Phase 3 + Phase 4)
-- ============================================================================

DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SlotInsightType" AS ENUM ('HIGH_DEMAND_SLOT', 'LOW_FILL_SLOT', 'CANCELLATION_PATTERN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'SUCCEEDED', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "VoiceCallDirection" AS ENUM ('INBOUND', 'OUTBOUND'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "VoiceCallStatus" AS ENUM ('RINGING', 'IN_PROGRESS', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CustomDomainStatus" AS ENUM ('PENDING_VERIFICATION', 'DNS_VERIFIED', 'SSL_PROVISIONING', 'ACTIVE', 'VERIFICATION_FAILED', 'SSL_FAILED', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'RENEWAL_PENDING', 'EXPIRED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RecommendationType" AS ENUM ('SERVICE_AFFINITY', 'CLIENT_PREFERENCE', 'CHURN_RISK'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PartnerType" AS ENUM ('REFERRAL', 'INTEGRATION', 'RESELLER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PartnerTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PartnerReferralStatus" AS ENUM ('PENDING', 'ACTIVATED', 'QUALIFIED', 'CHURNED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- PHASE 3 TABLES
-- ============================================================================

-- Slot Demand Insights
CREATE TABLE "slot_demand_insights" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "insight_type" "SlotInsightType" NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "time_slot" TIME NOT NULL,
    "metric_value" DECIMAL(65,30) NOT NULL,
    "recommendation" TEXT NOT NULL,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_by" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_demand_insights_pkey" PRIMARY KEY ("id")
);

-- Category Benchmarks
CREATE TABLE "category_benchmarks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "business_category" "BusinessCategory" NOT NULL,
    "metric_key" TEXT NOT NULL,
    "p25" DECIMAL(65,30) NOT NULL,
    "p50" DECIMAL(65,30) NOT NULL,
    "p75" DECIMAL(65,30) NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_benchmarks_pkey" PRIMARY KEY ("id")
);

-- Automation Executions
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "current_stage_id" TEXT,
    "trigger_event" "WorkflowTriggerEvent" NOT NULL,
    "trigger_event_data" JSONB,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "stage_results" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- Webhook Endpoints
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "previous_secret" TEXT,
    "secret_rotated_at" TIMESTAMP(3),
    "events" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 10,
    "description" TEXT,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_failure_at" TIMESTAMP(3),
    "disabled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- Webhook Deliveries
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "endpoint_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "request_headers" JSONB,
    "response_status" INTEGER,
    "response_body" TEXT,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- Voice Call Logs
CREATE TABLE "voice_call_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "call_sid" TEXT NOT NULL,
    "caller_number" TEXT NOT NULL,
    "caller_client_id" TEXT,
    "direction" "VoiceCallDirection" NOT NULL DEFAULT 'INBOUND',
    "duration" INTEGER,
    "status" "VoiceCallStatus" NOT NULL,
    "ai_handled" BOOLEAN NOT NULL DEFAULT false,
    "transcript" JSONB,
    "tool_calls" JSONB,
    "ai_confidence_scores" JSONB,
    "transferred_at" TIMESTAMP(3),
    "transferred_to" TEXT,
    "recording_url" TEXT,
    "booking_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_call_logs_pkey" PRIMARY KEY ("id")
);

-- Accounting Sync Logs
CREATE TABLE "accounting_sync_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "external_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "error_code" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_sync_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- PHASE 4 TABLES
-- ============================================================================

-- Platform Metrics
CREATE TABLE "platform_metrics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "metadata" JSONB,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_metrics_pkey" PRIMARY KEY ("id")
);

-- Platform Alerts
CREATE TABLE "platform_alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "metric_key" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "current_value" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_alerts_pkey" PRIMARY KEY ("id")
);

-- Directory Listings
CREATE TABLE "directory_listings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "featured_until" TIMESTAMP(3),
    "sort_boost" INTEGER NOT NULL DEFAULT 0,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "response_rate" DECIMAL(5,2),
    "response_time_min" INTEGER,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_listings_pkey" PRIMARY KEY ("id")
);

-- Saved Businesses
CREATE TABLE "saved_businesses" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_businesses_pkey" PRIMARY KEY ("id")
);

-- Custom Domains
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "CustomDomainStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verification_token" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "ssl_status" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "ssl_issued_at" TIMESTAMP(3),
    "ssl_expires_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- Venue Staff (Multi-Location join table)
CREATE TABLE "venue_staff" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_staff_pkey" PRIMARY KEY ("id")
);

-- Recommendation Models
CREATE TABLE "recommendation_models" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" "RecommendationType" NOT NULL,
    "category" TEXT,
    "model_data" JSONB NOT NULL,
    "training_size" INTEGER NOT NULL,
    "accuracy" DECIMAL(5,4),
    "trained_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_models_pkey" PRIMARY KEY ("id")
);

-- Client Recommendations
CREATE TABLE "client_recommendations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "booked_from_rec" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_recommendations_pkey" PRIMARY KEY ("id")
);

-- Churn Risk Scores
CREATE TABLE "churn_risk_scores" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "client_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "factors" JSONB NOT NULL,
    "last_booking" TIMESTAMP(3) NOT NULL,
    "expected_next" TIMESTAMP(3),
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "churn_risk_scores_pkey" PRIMARY KEY ("id")
);

-- Partners
CREATE TABLE "partners" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_url" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "tier" "PartnerTier" NOT NULL DEFAULT 'STANDARD',
    "referral_code" TEXT NOT NULL,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "total_referrals" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payout_method" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- Partner Referrals
CREATE TABLE "partner_referrals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "PartnerReferralStatus" NOT NULL DEFAULT 'PENDING',
    "activated_at" TIMESTAMP(3),
    "first_booking_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_referrals_pkey" PRIMARY KEY ("id")
);

-- Partner Payouts
CREATE TABLE "partner_payouts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "provider_payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "category_benchmarks_business_category_metric_key_key" ON "category_benchmarks"("business_category", "metric_key");
CREATE UNIQUE INDEX "webhook_deliveries_idempotency_key_key" ON "webhook_deliveries"("idempotency_key");
CREATE UNIQUE INDEX "voice_call_logs_call_sid_key" ON "voice_call_logs"("call_sid");
CREATE UNIQUE INDEX "accounting_sync_logs_idempotency_key_key" ON "accounting_sync_logs"("idempotency_key");
CREATE UNIQUE INDEX "directory_listings_tenant_id_key" ON "directory_listings"("tenant_id");
CREATE UNIQUE INDEX "saved_businesses_user_id_tenant_id_key" ON "saved_businesses"("user_id", "tenant_id");
CREATE UNIQUE INDEX "custom_domains_tenant_id_key" ON "custom_domains"("tenant_id");
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");
CREATE UNIQUE INDEX "venue_staff_venue_id_user_id_key" ON "venue_staff"("venue_id", "user_id");
CREATE UNIQUE INDEX "churn_risk_scores_client_id_tenant_id_key" ON "churn_risk_scores"("client_id", "tenant_id");
CREATE UNIQUE INDEX "partners_user_id_key" ON "partners"("user_id");
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");
CREATE UNIQUE INDEX "partner_referrals_partner_id_tenant_id_key" ON "partner_referrals"("partner_id", "tenant_id");

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Slot Demand Insights indexes
CREATE INDEX "slot_demand_insights_tenant_id_idx" ON "slot_demand_insights"("tenant_id");
CREATE INDEX "slot_demand_insights_tenant_id_is_dismissed_expires_at_idx" ON "slot_demand_insights"("tenant_id", "is_dismissed", "expires_at");

-- Automation Executions indexes
CREATE INDEX "automation_executions_tenant_id_idx" ON "automation_executions"("tenant_id");
CREATE INDEX "automation_executions_booking_id_idx" ON "automation_executions"("booking_id");
CREATE INDEX "automation_executions_status_idx" ON "automation_executions"("status");

-- Webhook Endpoints indexes
CREATE INDEX "webhook_endpoints_tenant_id_idx" ON "webhook_endpoints"("tenant_id");

-- Webhook Deliveries indexes
CREATE INDEX "webhook_deliveries_endpoint_id_idx" ON "webhook_deliveries"("endpoint_id");
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "webhook_deliveries"("status", "next_retry_at");

-- Voice Call Logs indexes
CREATE INDEX "voice_call_logs_tenant_id_idx" ON "voice_call_logs"("tenant_id");
CREATE INDEX "voice_call_logs_created_at_idx" ON "voice_call_logs"("created_at");
CREATE INDEX "voice_call_logs_caller_client_id_idx" ON "voice_call_logs"("caller_client_id");

-- Accounting Sync Logs indexes
CREATE INDEX "accounting_sync_logs_tenant_id_idx" ON "accounting_sync_logs"("tenant_id");
CREATE INDEX "accounting_sync_logs_connection_id_idx" ON "accounting_sync_logs"("connection_id");
CREATE INDEX "accounting_sync_logs_entity_type_entity_id_idx" ON "accounting_sync_logs"("entity_type", "entity_id");
CREATE INDEX "accounting_sync_logs_status_idx" ON "accounting_sync_logs"("status");

-- Platform Metrics indexes
CREATE INDEX "platform_metrics_key_measured_at_idx" ON "platform_metrics"("key", "measured_at");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Slot Demand Insights
ALTER TABLE "slot_demand_insights" ADD CONSTRAINT "slot_demand_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slot_demand_insights" ADD CONSTRAINT "slot_demand_insights_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Automation Executions
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "workflow_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Webhook Endpoints
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Webhook Deliveries
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Voice Call Logs
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voice_call_logs" ADD CONSTRAINT "voice_call_logs_caller_client_id_fkey" FOREIGN KEY ("caller_client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Accounting Sync Logs
ALTER TABLE "accounting_sync_logs" ADD CONSTRAINT "accounting_sync_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounting_sync_logs" ADD CONSTRAINT "accounting_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "accounting_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Directory Listings
ALTER TABLE "directory_listings" ADD CONSTRAINT "directory_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Saved Businesses
ALTER TABLE "saved_businesses" ADD CONSTRAINT "saved_businesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_businesses" ADD CONSTRAINT "saved_businesses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom Domains
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Venue Staff
ALTER TABLE "venue_staff" ADD CONSTRAINT "venue_staff_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_staff" ADD CONSTRAINT "venue_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Client Recommendations
ALTER TABLE "client_recommendations" ADD CONSTRAINT "client_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_recommendations" ADD CONSTRAINT "client_recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_recommendations" ADD CONSTRAINT "client_recommendations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Churn Risk Scores
-- Note: client_id references users table (clients are users)
ALTER TABLE "churn_risk_scores" ADD CONSTRAINT "churn_risk_scores_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partners
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partner Referrals
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partner Payouts
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- RLS POLICIES (original content)
-- ============================================================================

-- Enable RLS
ALTER TABLE accounting_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_demand_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_logs ENABLE ROW LEVEL SECURITY;

-- Create isolation policies
CREATE POLICY tenant_isolation ON accounting_sync_logs
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON churn_risk_scores
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON client_recommendations
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON custom_domains
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON directory_listings
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON slot_demand_insights
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON voice_call_logs
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));
