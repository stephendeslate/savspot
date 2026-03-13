-- Add WITH CHECK clauses to all tenant_isolation policies.
-- This ensures INSERT and UPDATE operations also respect tenant isolation,
-- preventing a tenant from writing rows with a different tenant_id.

-- ============================================================
-- Migration 1 tables (20260303041239_rls_and_search)
-- ============================================================

ALTER POLICY tenant_isolation ON tenant_memberships
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON team_invitations
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON booking_sessions
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON bookings
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON booking_state_history
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON date_reservations
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON availability_rules
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON blocked_dates
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON booking_flows
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON payments
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON payment_state_history
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON payment_disputes
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON invoices
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON services
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON venues
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON service_categories
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON service_providers
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON service_addons
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON discounts
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON tax_rates
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON communications
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON communication_templates
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON email_layouts
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON notifications
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON contract_templates
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON contracts
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON quotes
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON workflow_automations
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON workflow_templates
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON workflow_webhooks
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON booking_reminders
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON calendar_connections
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON calendar_events
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON message_threads
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON notes
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON client_profiles
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON gallery_photos
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON booking_flow_analytics
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON audit_logs
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON data_requests
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON reviews
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON api_keys
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON referral_links
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON support_tickets
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON feedback
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON import_jobs
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON accounting_connections
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON browser_push_subscriptions
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- ============================================================
-- Migration 2 tables (20260311000000_add_phase4_rls_and_cascades)
-- ============================================================

ALTER POLICY tenant_isolation ON accounting_sync_logs
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON churn_risk_scores
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON client_recommendations
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON custom_domains
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON directory_listings
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON slot_demand_insights
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON voice_call_logs
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
