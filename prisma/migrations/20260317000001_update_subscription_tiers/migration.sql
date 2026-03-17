-- Update SubscriptionTier enum: FREE/PRO → STARTER/TEAM/BUSINESS
-- 1. Add new values
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'BUSINESS';

-- Commit the enum additions (required before using new values in DML)
-- Prisma runs each migration in a transaction, but ALTER TYPE ADD VALUE
-- cannot run inside a transaction. Prisma handles this by running the
-- migration outside a transaction when it detects ALTER TYPE.

-- 2. Migrate existing data
UPDATE "Tenant" SET "subscriptionTier" = 'STARTER' WHERE "subscriptionTier" = 'FREE';
UPDATE "Tenant" SET "subscriptionTier" = 'TEAM' WHERE "subscriptionTier" = 'PRO';

-- 3. Update the default
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionTier" SET DEFAULT 'STARTER'::"SubscriptionTier";

-- 4. Remove old values by recreating the enum
-- PostgreSQL doesn't support DROP VALUE, so we recreate
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'TEAM', 'BUSINESS');

-- Update columns that reference this enum
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionTier" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionTier" TYPE "SubscriptionTier" USING "subscriptionTier"::text::"SubscriptionTier";
ALTER TABLE "Tenant" ALTER COLUMN "subscriptionTier" SET DEFAULT 'STARTER';

ALTER TABLE "Subscription" ALTER COLUMN "tier" TYPE "SubscriptionTier" USING "tier"::text::"SubscriptionTier";

-- Drop old enum
DROP TYPE "SubscriptionTier_old";
