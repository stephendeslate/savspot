-- Update SubscriptionTier enum: FREE/PRO → STARTER/TEAM/BUSINESS
-- Uses text-conversion approach (safe, works inside transaction)

-- 1. Drop the default so we can change the column type
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" DROP DEFAULT;

-- 2. Convert column to TEXT (detach from enum)
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" TYPE TEXT;

-- 3. Migrate existing data
UPDATE "tenants" SET "subscription_tier" = 'STARTER' WHERE "subscription_tier" = 'FREE';
UPDATE "tenants" SET "subscription_tier" = 'TEAM' WHERE "subscription_tier" = 'PRO';

-- 4. Drop old enum and recreate with new values
DROP TYPE "SubscriptionTier";
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'TEAM', 'BUSINESS');

-- 5. Convert column back to enum type
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" TYPE "SubscriptionTier" USING "subscription_tier"::"SubscriptionTier";

-- 6. Restore default
ALTER TABLE "tenants" ALTER COLUMN "subscription_tier" SET DEFAULT 'STARTER'::"SubscriptionTier";
