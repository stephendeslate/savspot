-- SavSpot RLS Policies, Search Vectors, and Custom Indexes
-- This migration adds Row-Level Security to all tenant-scoped tables,
-- creates tsvector triggers for full-text search, and adds GIN/GiST indexes.

-- ============================================================
-- 0. REQUIRED EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TENANT-SCOPED TABLES
-- ============================================================

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_flow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. CREATE RLS POLICIES
-- Using current_setting('app.current_tenant', true)
-- The 'true' parameter returns NULL instead of error when not set,
-- preventing lockouts during migrations and admin operations.
-- ============================================================

CREATE POLICY tenant_isolation ON tenant_memberships
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON team_invitations
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON booking_sessions
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON bookings
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON booking_state_history
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON date_reservations
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON availability_rules
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON blocked_dates
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON booking_flows
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON payments
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON payment_state_history
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON payment_disputes
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON invoices
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON services
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON venues
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON service_categories
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON service_providers
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON service_addons
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON discounts
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON tax_rates
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON communications
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON communication_templates
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON email_layouts
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON notifications
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON contract_templates
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON contracts
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON quotes
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON workflow_automations
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON workflow_templates
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON workflow_webhooks
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON booking_reminders
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON calendar_connections
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON calendar_events
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON message_threads
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON notes
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON client_profiles
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON gallery_photos
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON booking_flow_analytics
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON data_requests
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON reviews
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON api_keys
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON referral_links
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON support_tickets
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON feedback
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON import_jobs
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON accounting_connections
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON browser_push_subscriptions
  FOR ALL TO PUBLIC
  USING (tenant_id = current_setting('app.current_tenant', true));

-- ============================================================
-- 3. SEARCH VECTOR TRIGGERS
-- Weighted tsvector: name='A', description='B'
-- ============================================================

CREATE OR REPLACE FUNCTION tenants_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A')
    || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION tenants_search_vector_update();

CREATE OR REPLACE FUNCTION services_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A')
    || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER services_search_vector_trigger
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION services_search_vector_update();

CREATE OR REPLACE FUNCTION venues_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A')
    || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER venues_search_vector_trigger
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION venues_search_vector_update();

-- ============================================================
-- 4. GIN / GiST INDEXES (cannot be expressed in Prisma)
-- ============================================================

CREATE INDEX idx_tenants_search ON tenants USING GIN (search_vector);
CREATE INDEX idx_services_search ON services USING GIN (search_vector);
CREATE INDEX idx_venues_search ON venues USING GIN (search_vector);

CREATE INDEX idx_tenants_name_trgm ON tenants USING GIN (name gin_trgm_ops);
CREATE INDEX idx_services_name_trgm ON services USING GIN (name gin_trgm_ops);
CREATE INDEX idx_venues_name_trgm ON venues USING GIN (name gin_trgm_ops);
