-- AlterTable
ALTER TABLE "booking_flow_analytics" ALTER COLUMN "conversion_rate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "total_revenue" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "bounce_rate" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "excess_hours" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "excess_hour_fee" SET DATA TYPE DECIMAL(8,2);

-- AlterTable
ALTER TABLE "category_benchmarks" ALTER COLUMN "p25" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "p50" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "p75" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "client_profiles" ALTER COLUMN "optimal_reminder_lead_hours" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "contract_amendments" ALTER COLUMN "value_change" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "contract_signatures" ALTER COLUMN "signature_confidence" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "discounts" ALTER COLUMN "value" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "min_order_amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "invoice_line_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "amount_paid" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "payment_disputes" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "platform_fee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "processing_fee" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "referral_commission" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "quote_line_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_rate" SET DATA TYPE DECIMAL(7,5),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "excess_hours" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "excess_rate" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "quote_option_items" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_rate" SET DATA TYPE DECIMAL(7,5),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "quote_options" ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "quotes" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_total" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "service_addons" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "base_price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "base_hours" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "excess_hour_price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "slot_demand_insights" ALTER COLUMN "metric_value" SET DATA TYPE DECIMAL(5,4);

-- AlterTable
ALTER TABLE "tax_rates" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(7,5);

-- CreateIndex
CREATE INDEX "payments_provider_transaction_id_idx" ON "payments"("provider_transaction_id");
