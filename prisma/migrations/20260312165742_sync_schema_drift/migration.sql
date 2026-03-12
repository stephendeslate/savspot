-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProviderType" ADD VALUE 'GCASH';
ALTER TYPE "PaymentProviderType" ADD VALUE 'MAYA';
ALTER TYPE "PaymentProviderType" ADD VALUE 'RAZORPAY';
ALTER TYPE "PaymentProviderType" ADD VALUE 'MOLLIE';
ALTER TYPE "PaymentProviderType" ADD VALUE 'DLOCAL';

-- DropForeignKey
ALTER TABLE "churn_risk_scores" DROP CONSTRAINT "churn_risk_scores_client_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_booking_id_fkey";

-- DropIndex
DROP INDEX "client_profiles_tags_gin_idx";

-- AlterTable
ALTER TABLE "accounting_sync_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "allowed_ips" TEXT[];

-- AlterTable
ALTER TABLE "automation_executions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "category_benchmarks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "churn_risk_scores" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "client_recommendations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "custom_domains" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "directory_listings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "partner_payouts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "partner_referrals" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "partners" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "platform_alerts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "platform_metrics" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "recommendation_models" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "saved_businesses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "slot_demand_insights" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "venue_staff" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "voice_call_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_deliveries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "webhook_endpoints" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
