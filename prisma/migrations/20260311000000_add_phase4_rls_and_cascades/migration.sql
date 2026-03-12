-- Phase 4 RLS Policies
-- Adding tenant isolation to Phase 4 tenant-scoped tables

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
