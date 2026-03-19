-- AlterTable
ALTER TABLE "services" ADD COLUMN     "peak_hours_config" JSONB;

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "client_email" VARCHAR(255) NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "preferred_date" DATE,
    "preferred_time_start" VARCHAR(5),
    "preferred_time_end" VARCHAR(5),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_service_id_preferred_date_status_idx" ON "waitlist_entries"("service_id", "preferred_date", "status");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
ALTER TABLE "waitlist_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_entries_tenant_isolation ON "waitlist_entries"
  USING ("tenant_id" = current_setting('app.current_tenant', TRUE))
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant', TRUE));
