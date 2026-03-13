-- Add WITH CHECK clause to all existing tenant_isolation policies.
-- Without WITH CHECK, INSERT/UPDATE operations are not restricted by RLS,
-- allowing rows to be created with a tenant_id different from the current tenant.

-- Tables from initial RLS migration (20260303041239)
ALTER POLICY tenant_isolation ON "tenant_memberships"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "team_invitations"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "booking_sessions"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "bookings"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "booking_state_history"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "date_reservations"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "availability_rules"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "blocked_dates"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "booking_flows"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "payments"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "payment_state_history"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "payment_disputes"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "invoices"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "services"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "venues"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "service_categories"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "service_providers"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "service_addons"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "discounts"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "tax_rates"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "communications"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "communication_templates"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "email_layouts"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "notifications"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "contract_templates"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "contracts"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "quotes"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "workflow_automations"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "workflow_templates"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "workflow_webhooks"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "booking_reminders"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "calendar_connections"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "calendar_events"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "message_threads"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "notes"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "client_profiles"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "gallery_photos"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "booking_flow_analytics"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "audit_logs"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "data_requests"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "reviews"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "api_keys"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "referral_links"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "support_tickets"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "feedback"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "import_jobs"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "accounting_connections"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "browser_push_subscriptions"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Tables from phase 4 RLS migration (20260311000000)
ALTER POLICY tenant_isolation ON "accounting_sync_logs"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "churn_risk_scores"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "client_recommendations"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "custom_domains"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "directory_listings"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "slot_demand_insights"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

ALTER POLICY tenant_isolation ON "voice_call_logs"
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
