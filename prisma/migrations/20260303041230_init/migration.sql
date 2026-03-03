-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('VENUE', 'SALON', 'STUDIO', 'FITNESS', 'PROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('STRIPE', 'ADYEN', 'PAYPAL', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'DIRECTORY', 'API', 'WIDGET', 'REFERRAL', 'WALK_IN');

-- CreateEnum
CREATE TYPE "BookingSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CLIENT_REQUEST', 'PAYMENT_TIMEOUT', 'APPROVAL_TIMEOUT', 'DATE_TAKEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "DateReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StateTransitionTrigger" AS ENUM ('SYSTEM', 'ADMIN', 'CLIENT', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DISPUTED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL_PAYMENT', 'INSTALLMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('DUPLICATE', 'FRAUDULENT', 'PRODUCT_UNACCEPTABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'HOURLY', 'TIERED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('PER_EVENT', 'PER_PERSON', 'PER_HOUR');

-- CreateEnum
CREATE TYPE "ConfirmationMode" AS ENUM ('AUTO_CONFIRM', 'MANUAL_APPROVAL');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('SYSTEM', 'BOOKING', 'PAYMENT', 'CONTRACT', 'COMMUNICATION', 'MARKETING', 'REVIEW', 'CALENDAR');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "WorkflowTriggerEvent" AS ENUM ('BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'BOOKING_COMPLETED', 'PAYMENT_RECEIVED', 'REMINDER_DUE', 'PAYMENT_OVERDUE', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRED', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'QUOTE_EXPIRED', 'REVIEW_SUBMITTED', 'CLIENT_REGISTERED', 'BOOKING_NO_SHOW', 'BOOKING_WALK_IN', 'INVOICE_OVERDUE');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('SEND_EMAIL', 'SEND_SMS', 'SEND_PUSH', 'SEND_NOTIFICATION');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('BOOKING', 'PAYMENT', 'QUESTIONNAIRE_REMINDER');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'SIGNED', 'EXPIRED', 'VOID', 'AMENDED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('DRAWN', 'TYPED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('CLIENT', 'WITNESS', 'COMPANY_REP', 'GUARDIAN', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('REQUESTED', 'DRAFT', 'SENT_FOR_REVIEW', 'APPROVED', 'SIGNED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BUG', 'FEATURE_REQUEST', 'QUESTION', 'ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'AI_INVESTIGATING', 'AI_RESOLVED', 'NEEDS_MANUAL_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AIResolutionType" AS ENUM ('FAQ_MATCH', 'CONFIGURATION_GUIDANCE', 'KNOWN_WORKAROUND', 'CODE_FIX_PREPARED');

-- CreateEnum
CREATE TYPE "ResolvedBy" AS ENUM ('AI', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('FEATURE_REQUEST', 'UX_FRICTION', 'COMPARISON_NOTE', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'PLANNED', 'SHIPPED', 'DECLINED');

-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('BOOKSY', 'FRESHA', 'SQUARE', 'VAGARO', 'MINDBODY', 'CSV_GENERIC', 'JSON_GENERIC');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('CLIENTS', 'SERVICES', 'APPOINTMENTS', 'FULL');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'MAPPING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRecordStatus" AS ENUM ('IMPORTED', 'SKIPPED_DUPLICATE', 'ERROR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'SIGN', 'VOID', 'SEND', 'ACCEPT', 'REJECT', 'PASSWORD_CHANGE', 'MFA_ENABLE', 'MFA_DISABLE');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'API_KEY', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETION', 'TENANT_EXPORT');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('DATA_PROCESSING', 'MARKETING', 'ANALYTICS', 'THIRD_PARTY_SHARING', 'FOLLOW_UP_EMAILS');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('ONE_WAY', 'TWO_WAY');

-- CreateEnum
CREATE TYPE "CalendarConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarEventDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "MessageThreadStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageThreadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_HOURS');

-- CreateEnum
CREATE TYPE "DiscountApplication" AS ENUM ('AUTOMATIC', 'CODE_REQUIRED', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "NoteEntityType" AS ENUM ('BOOKING', 'CLIENT');

-- CreateEnum
CREATE TYPE "AccountingProvider" AS ENUM ('QUICKBOOKS', 'XERO');

-- CreateEnum
CREATE TYPE "AccountingConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkflowStageAutomationType" AS ENUM ('EMAIL', 'TASK', 'QUOTE', 'CONTRACT', 'QUESTIONNAIRE', 'REMINDER', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "WorkflowStageTriggerTime" AS ENUM ('ON_CREATION', 'AFTER_X_DAYS', 'X_DAYS_BEFORE_BOOKING');

-- CreateEnum
CREATE TYPE "WorkflowStageProgressionCondition" AS ENUM ('QUOTE_ACCEPTED', 'PAYMENT_RECEIVED', 'CONTRACT_SIGNED', 'TASKS_COMPLETED');

-- CreateEnum
CREATE TYPE "BookingWorkflowOverrideType" AS ENUM ('SKIP', 'DISABLE_AUTOMATION', 'CUSTOM_TIMING', 'ADD_STAGE');

-- CreateEnum
CREATE TYPE "BreachType" AS ENUM ('UNAUTHORIZED_ACCESS', 'DATA_LEAK', 'CREDENTIAL_COMPROMISE', 'BRUTE_FORCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONFIRMED', 'CONTAINED', 'NOTIFYING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BreachNotificationRecipientType" AS ENUM ('DPA', 'TENANT_ADMIN', 'AFFECTED_USER');

-- CreateEnum
CREATE TYPE "BreachNotificationChannel" AS ENUM ('EMAIL', 'IN_APP', 'POSTAL');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "BusinessCategory" NOT NULL,
    "category_description" TEXT,
    "logo_url" TEXT,
    "cover_photo_url" TEXT,
    "brand_color" TEXT,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" JSONB,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "payment_provider" "PaymentProviderType" NOT NULL DEFAULT 'STRIPE',
    "payment_provider_account_id" TEXT,
    "payment_provider_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscription_provider_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "search_vector" tsvector,
    "tos_accepted_at" TIMESTAMP(3),
    "tos_version" TEXT,
    "dpa_accepted_at" TIMESTAMP(3),
    "dpa_version" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "retention_overrides" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "PlatformRole" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "apple_id" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_recovery_codes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_flow_id" TEXT,
    "service_id" TEXT,
    "client_id" TEXT,
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "resolved_steps" JSONB NOT NULL,
    "data" JSONB,
    "reservation_token" TEXT,
    "reservation_expires_at" TIMESTAMP(3),
    "status" "BookingSessionStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "booking_flow_id" TEXT,
    "status" "BookingStatus" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "guest_count" INTEGER,
    "guest_details" JSONB,
    "notes" TEXT,
    "questionnaire_responses" JSONB,
    "source" "BookingSource" NOT NULL,
    "metadata" JSONB,
    "check_in_status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "checked_in_by" TEXT,
    "checked_out_by" TEXT,
    "original_start_date" DATE,
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "cancellation_reason" "CancellationReason",
    "cancelled_at" TIMESTAMP(3),
    "excess_hours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "excess_hour_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_state_history" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_state" "BookingStatus" NOT NULL,
    "to_state" "BookingStatus" NOT NULL,
    "reason" TEXT,
    "triggered_by" "StateTransitionTrigger" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "service_id" TEXT NOT NULL,
    "reserved_date" DATE NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "DateReservationStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "date_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "service_id" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_dates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "service_id" TEXT,
    "blocked_date" DATE NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_flows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "step_overrides" JSONB,
    "settings" JSONB,
    "min_booking_advance_days" INTEGER NOT NULL DEFAULT 1,
    "max_booking_advance_days" INTEGER NOT NULL DEFAULT 365,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "provider_transaction_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "platform_fee" DECIMAL(65,30),
    "processing_fee" DECIMAL(65,30),
    "referral_commission" DECIMAL(65,30),
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "type" "PaymentType" NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_state_history" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_state" "PaymentStatus" NOT NULL,
    "to_state" "PaymentStatus" NOT NULL,
    "reason" TEXT,
    "triggered_by" "StateTransitionTrigger" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_disputes" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider_dispute_id" TEXT,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "evidence_due_by" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_logs" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processing_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_dead_letters" (
    "id" TEXT NOT NULL,
    "webhook_log_id" TEXT NOT NULL,
    "final_error" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "tax_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "amount_paid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "due_date" TIMESTAMP(3),
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "tax_rate_id" TEXT,
    "tax_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "base_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "pricing_model" "PricingModel" NOT NULL DEFAULT 'FIXED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "pricing_unit" "PricingUnit",
    "base_hours" DECIMAL(65,30),
    "excess_hour_price" DECIMAL(65,30),
    "tier_config" JSONB,
    "guest_config" JSONB,
    "deposit_config" JSONB,
    "intake_form_config" JSONB,
    "contract_template_id" TEXT,
    "buffer_before_minutes" INTEGER NOT NULL DEFAULT 0,
    "buffer_after_minutes" INTEGER NOT NULL DEFAULT 0,
    "cancellation_policy" JSONB,
    "auto_cancel_on_overdue" BOOLEAN,
    "max_reschedule_count" INTEGER,
    "no_show_grace_minutes" INTEGER,
    "confirmation_mode" "ConfirmationMode" NOT NULL DEFAULT 'AUTO_CONFIRM',
    "approval_deadline_hours" INTEGER,
    "images" JSONB,
    "venue_id" TEXT,
    "category_id" TEXT,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" JSONB,
    "capacity" INTEGER,
    "images" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_providers" (
    "service_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("service_id","user_id")
);

-- CreateTable
CREATE TABLE "service_addons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "application" "DiscountApplication" NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "min_order_amount" DECIMAL(65,30),
    "product_scope" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "region" TEXT,
    "is_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "template_key" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommunicationStatus" NOT NULL,
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "subject_template" TEXT,
    "body_template" TEXT NOT NULL,
    "layout_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sandbox_validated" BOOLEAN NOT NULL DEFAULT false,
    "validation_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_layouts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "header_template" TEXT,
    "footer_template" TEXT,
    "wrapper_template" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_history" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject_template" TEXT,
    "body_template" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "default_channels" JSONB NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "auto_expire_hours" INTEGER,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "notification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "digest_frequency" "DigestFrequency" NOT NULL DEFAULT 'IMMEDIATE',
    "quiet_hours_start" TIME,
    "quiet_hours_end" TIME,
    "quiet_hours_timezone" TEXT,
    "preferences" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_digests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "frequency" "DigestFrequency" NOT NULL,
    "notification_ids" JSONB NOT NULL,
    "status" "ReminderStatus" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "device_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "signature_requirements" JSONB,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "quote_id" TEXT,
    "content" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "voided_by" TEXT,
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signatures" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "signer_id" TEXT NOT NULL,
    "role" "SignerRole" NOT NULL,
    "signature_data" TEXT,
    "signature_type" "SignatureType",
    "signed_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" JSONB,
    "legal_disclosure_accepted" BOOLEAN NOT NULL DEFAULT false,
    "electronic_consent_at" TIMESTAMP(3),
    "signature_confidence" DECIMAL(65,30),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "AmendmentStatus" NOT NULL,
    "sections_changed" JSONB,
    "value_change" DECIMAL(65,30),
    "reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuoteStatus" NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "tax_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "accepted_at" TIMESTAMP(3),
    "accepted_signature" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "tax_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "excess_hours" DECIMAL(65,30),
    "excess_rate" DECIMAL(65,30),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_options" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total" DECIMAL(65,30) NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_option_items" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "tax_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "quote_option_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_automations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trigger_event" "WorkflowTriggerEvent" NOT NULL,
    "action_type" "WorkflowActionType" NOT NULL,
    "action_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_event" "WorkflowTriggerEvent" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "automation_type" "WorkflowStageAutomationType" NOT NULL,
    "automation_config" JSONB NOT NULL,
    "trigger_time" "WorkflowStageTriggerTime" NOT NULL,
    "trigger_days" INTEGER,
    "progression_condition" "WorkflowStageProgressionCondition",
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_workflow_overrides" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "override_type" "BookingWorkflowOverrideType" NOT NULL,
    "override_config" JSONB,
    "reason" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_workflow_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_webhooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reminders" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reminder_type" "ReminderType" NOT NULL,
    "interval_days" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "channel" "CommunicationChannel" NOT NULL,
    "status" "ReminderStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "calendar_id" TEXT,
    "sync_direction" "SyncDirection" NOT NULL DEFAULT 'ONE_WAY',
    "sync_calendars" JSONB,
    "sync_frequency_minutes" INTEGER NOT NULL DEFAULT 15,
    "last_synced_at" TIMESTAMP(3),
    "status" "CalendarConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "error_message" TEXT,
    "ical_feed_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "calendar_connection_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "external_event_id" TEXT,
    "direction" "CalendarEventDirection" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "subject" TEXT,
    "priority" "MessageThreadPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "MessageThreadStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_read_status" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "preferences" JSONB,
    "tags" JSONB,
    "internal_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "venue_id" TEXT,
    "service_id" TEXT,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "alt_text" TEXT,
    "caption" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tours" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tour_key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "steps_completed" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_flow_analytics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "step_metrics" JSONB NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bounce_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avg_completion_time_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_flow_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_id" TEXT,
    "actor_type" "ActorType" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_breaches" (
    "id" TEXT NOT NULL,
    "breach_type" "BreachType" NOT NULL,
    "severity" "BreachSeverity" NOT NULL,
    "status" "BreachStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "contained_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "gdpr_notification_deadline" TIMESTAMP(3),
    "affected_tenant_ids" JSONB,
    "affected_user_count" INTEGER,
    "root_cause" TEXT,
    "remediation_steps" TEXT,
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_breaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breach_notifications" (
    "id" TEXT NOT NULL,
    "breach_id" TEXT NOT NULL,
    "recipient_type" "BreachNotificationRecipientType" NOT NULL,
    "recipient_id" TEXT,
    "channel" "BreachNotificationChannel" NOT NULL,
    "sent_at" TIMESTAMP(3),
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breach_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affected_users" (
    "id" TEXT NOT NULL,
    "breach_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data_types_exposed" JSONB,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affected_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "request_type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "export_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "consented" BOOLEAN NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "withdrawn_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "consent_text_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "responded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_photos" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "rate_limit" INTEGER NOT NULL DEFAULT 60,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "entity_type" "NoteEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "submitted_by" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "severity" "TicketSeverity" NOT NULL DEFAULT 'LOW',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "ai_diagnosis" TEXT,
    "ai_response" TEXT,
    "ai_resolution_type" "AIResolutionType",
    "resolved_by" "ResolvedBy",
    "resolved_at" TIMESTAMP(3),
    "developer_notes" TEXT,
    "source_context" JSONB,
    "user_satisfaction" BOOLEAN,
    "related_ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "context_page" TEXT,
    "body" TEXT NOT NULL,
    "screenshot_url" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "developer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_platform" "SourcePlatform" NOT NULL,
    "import_type" "ImportType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "file_url" TEXT,
    "column_mapping" JSONB,
    "stats" JSONB,
    "error_log" JSONB,
    "initiated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_records" (
    "id" TEXT NOT NULL,
    "import_job_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "ImportRecordStatus" NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT,
    "raw_data" JSONB NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "import_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "AccountingProvider" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "company_id" TEXT,
    "category_mappings" JSONB,
    "last_synced_at" TIMESTAMP(3),
    "status" "AccountingConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "error_message" TEXT,

    CONSTRAINT "accounting_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_category_idx" ON "tenants"("category");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_apple_id_key" ON "users"("apple_id");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_tenant_id_idx" ON "team_invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "team_invitations_tenant_id_invitee_email_status_idx" ON "team_invitations"("tenant_id", "invitee_email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "booking_sessions_reservation_token_key" ON "booking_sessions"("reservation_token");

-- CreateIndex
CREATE INDEX "booking_sessions_tenant_id_idx" ON "booking_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_sessions_tenant_id_status_updated_at_idx" ON "booking_sessions"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_service_id_status_start_time_end_time_idx" ON "bookings"("tenant_id", "service_id", "status", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_client_id_idx" ON "bookings"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "bookings_client_id_tenant_id_source_status_created_at_idx" ON "bookings"("client_id", "tenant_id", "source", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_start_time_idx" ON "bookings"("tenant_id", "start_time");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_status_idx" ON "bookings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "booking_state_history_booking_id_created_at_idx" ON "booking_state_history"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_state_history_tenant_id_idx" ON "booking_state_history"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "date_reservations_token_key" ON "date_reservations"("token");

-- CreateIndex
CREATE INDEX "date_reservations_tenant_id_idx" ON "date_reservations"("tenant_id");

-- CreateIndex
CREATE INDEX "date_reservations_service_id_reserved_date_status_idx" ON "date_reservations"("service_id", "reserved_date", "status");

-- CreateIndex
CREATE INDEX "availability_rules_tenant_id_idx" ON "availability_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "blocked_dates_tenant_id_idx" ON "blocked_dates"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_flows_tenant_id_idx" ON "booking_flows"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_status_idx" ON "payments"("booking_id", "status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_created_at_idx" ON "payments"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_state_history_payment_id_created_at_idx" ON "payment_state_history"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_state_history_tenant_id_idx" ON "payment_state_history"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_disputes_tenant_id_idx" ON "payment_disputes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_logs_event_id_key" ON "payment_webhook_logs"("event_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "services_tenant_id_idx" ON "services"("tenant_id");

-- CreateIndex
CREATE INDEX "venues_tenant_id_idx" ON "venues"("tenant_id");

-- CreateIndex
CREATE INDEX "service_categories_tenant_id_idx" ON "service_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "service_providers_tenant_id_idx" ON "service_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "service_addons_tenant_id_idx" ON "service_addons"("tenant_id");

-- CreateIndex
CREATE INDEX "discounts_tenant_id_idx" ON "discounts"("tenant_id");

-- CreateIndex
CREATE INDEX "tax_rates_tenant_id_idx" ON "tax_rates"("tenant_id");

-- CreateIndex
CREATE INDEX "communications_tenant_id_idx" ON "communications"("tenant_id");

-- CreateIndex
CREATE INDEX "communications_tenant_id_recipient_id_created_at_idx" ON "communications"("tenant_id", "recipient_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "communication_templates_tenant_id_key_key" ON "communication_templates"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_types_key_key" ON "notification_types"("key");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_push_tokens_token_key" ON "device_push_tokens"("token");

-- CreateIndex
CREATE INDEX "contract_templates_tenant_id_idx" ON "contract_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "quotes_tenant_id_idx" ON "quotes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_booking_id_version_key" ON "quotes"("booking_id", "version");

-- CreateIndex
CREATE INDEX "workflow_automations_tenant_id_idx" ON "workflow_automations"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_templates_tenant_id_idx" ON "workflow_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_template_id_order_key" ON "workflow_stages"("template_id", "order");

-- CreateIndex
CREATE INDEX "workflow_webhooks_tenant_id_idx" ON "workflow_webhooks"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_reminders_tenant_id_idx" ON "booking_reminders"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_reminders_booking_id_reminder_type_interval_days_ch_key" ON "booking_reminders"("booking_id", "reminder_type", "interval_days", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_ical_feed_token_key" ON "calendar_connections"("ical_feed_token");

-- CreateIndex
CREATE INDEX "calendar_connections_tenant_id_idx" ON "calendar_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_idx" ON "calendar_events"("tenant_id");

-- CreateIndex
CREATE INDEX "message_threads_tenant_id_idx" ON "message_threads"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_read_status_message_id_user_id_key" ON "message_read_status"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "client_profiles_tenant_id_idx" ON "client_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_tenant_id_client_id_key" ON "client_profiles"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "gallery_photos_tenant_id_idx" ON "gallery_photos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_tours_user_id_tour_key_key" ON "onboarding_tours"("user_id", "tour_key");

-- CreateIndex
CREATE UNIQUE INDEX "booking_flow_analytics_tenant_id_flow_id_date_key" ON "booking_flow_analytics"("tenant_id", "flow_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_timestamp_idx" ON "audit_logs"("actor_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "affected_users_breach_id_user_id_key" ON "affected_users"("breach_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_user_id_purpose_key" ON "consent_records"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_tenant_id_idx" ON "reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "notes_tenant_id_entity_type_entity_id_idx" ON "notes"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "referral_links_tenant_id_idx" ON "referral_links"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_tenant_id_code_key" ON "referral_links"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_submitted_by_category_created_at_idx" ON "support_tickets"("submitted_by", "category", "created_at");

-- CreateIndex
CREATE INDEX "feedback_tenant_id_idx" ON "feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "import_jobs_tenant_id_idx" ON "import_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "accounting_connections_tenant_id_idx" ON "accounting_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "browser_push_subscriptions_user_id_idx" ON "browser_push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "browser_push_subscriptions_tenant_id_idx" ON "browser_push_subscriptions"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_booking_flow_id_fkey" FOREIGN KEY ("booking_flow_id") REFERENCES "booking_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booking_flow_id_fkey" FOREIGN KEY ("booking_flow_id") REFERENCES "booking_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_state_history" ADD CONSTRAINT "booking_state_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_state_history" ADD CONSTRAINT "booking_state_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_reservations" ADD CONSTRAINT "date_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_reservations" ADD CONSTRAINT "date_reservations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_reservations" ADD CONSTRAINT "date_reservations_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_reservations" ADD CONSTRAINT "date_reservations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_flows" ADD CONSTRAINT "booking_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_state_history" ADD CONSTRAINT "payment_state_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_state_history" ADD CONSTRAINT "payment_state_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_webhook_log_id_fkey" FOREIGN KEY ("webhook_log_id") REFERENCES "payment_webhook_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_contract_template_id_fkey" FOREIGN KEY ("contract_template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "email_layouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_layouts" ADD CONSTRAINT "email_layouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_history" ADD CONSTRAINT "template_history_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "notification_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_push_tokens" ADD CONSTRAINT "device_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_option_items" ADD CONSTRAINT "quote_option_items_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "quote_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_option_items" ADD CONSTRAINT "quote_option_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_automations" ADD CONSTRAINT "workflow_automations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_workflow_overrides" ADD CONSTRAINT "booking_workflow_overrides_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_workflow_overrides" ADD CONSTRAINT "booking_workflow_overrides_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "workflow_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_workflow_overrides" ADD CONSTRAINT "booking_workflow_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_webhooks" ADD CONSTRAINT "workflow_webhooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_connection_id_fkey" FOREIGN KEY ("calendar_connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_tours" ADD CONSTRAINT "onboarding_tours_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_flow_analytics" ADD CONSTRAINT "booking_flow_analytics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_flow_analytics" ADD CONSTRAINT "booking_flow_analytics_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "booking_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_breaches" ADD CONSTRAINT "security_breaches_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breach_notifications" ADD CONSTRAINT "breach_notifications_breach_id_fkey" FOREIGN KEY ("breach_id") REFERENCES "security_breaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affected_users" ADD CONSTRAINT "affected_users_breach_id_fkey" FOREIGN KEY ("breach_id") REFERENCES "security_breaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affected_users" ADD CONSTRAINT "affected_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_related_ticket_id_fkey" FOREIGN KEY ("related_ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_connections" ADD CONSTRAINT "accounting_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_push_subscriptions" ADD CONSTRAINT "browser_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_push_subscriptions" ADD CONSTRAINT "browser_push_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
