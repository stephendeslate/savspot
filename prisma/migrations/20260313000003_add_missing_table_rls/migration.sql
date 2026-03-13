-- Add RLS policies for tenant-scoped tables that were missing them.
-- Only tables with a direct tenant_id column are included.
-- (venue_staff and partner_payouts do not have tenant_id and are skipped.)

-- automation_executions
ALTER TABLE "automation_executions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "automation_executions"
  USING (tenant_id = current_setting('app.current_tenant', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- webhook_endpoints
ALTER TABLE "webhook_endpoints" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "webhook_endpoints"
  USING (tenant_id = current_setting('app.current_tenant', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- saved_businesses
ALTER TABLE "saved_businesses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "saved_businesses"
  USING (tenant_id = current_setting('app.current_tenant', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- partner_referrals
ALTER TABLE "partner_referrals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "partner_referrals"
  USING (tenant_id = current_setting('app.current_tenant', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);
