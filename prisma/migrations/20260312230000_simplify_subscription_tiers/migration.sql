-- Simplify subscription tiers: FREE/PREMIUM/ENTERPRISE → FREE/PRO
-- 1. Convert existing PREMIUM and ENTERPRISE tenants to PRO
-- 2. Remove old enum values, add new PRO value

-- Step 1: Update all PREMIUM and ENTERPRISE tenants to use a temporary text column
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" TYPE TEXT;

-- Step 2: Migrate data
UPDATE "tenants" SET "subscription_tier" = 'PRO' WHERE "subscription_tier" IN ('PREMIUM', 'ENTERPRISE');

-- Step 3: Drop old enum and create new one
DROP TYPE "SubscriptionTier";
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- Step 4: Convert column back to enum
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" TYPE "SubscriptionTier" USING "subscription_tier"::"SubscriptionTier";

-- Step 5: Re-apply default
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" SET DEFAULT 'FREE';
