-- Force Row-Level Security on all tenant-scoped tables.
--
-- By default, PostgreSQL RLS policies do NOT apply to the table owner.
-- Since the application connects as the table owner (the same user that
-- runs migrations), RLS was silently bypassed for all application queries.
--
-- FORCE ROW LEVEL SECURITY makes policies apply even to the table owner,
-- providing true defense-in-depth alongside the Prisma Client Extension.
--
-- The existing policies use:
--   USING (tenant_id = current_setting('app.current_tenant', true))
-- where the 'true' parameter returns NULL (not an error) when the setting
-- is unset. This means:
-- - When app.current_tenant IS set: only matching tenant rows are visible
-- - When app.current_tenant is NOT set: NO rows are visible (NULL != any value)
-- This is the correct fail-closed behavior for multi-tenancy.

ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE team_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_state_history FORCE ROW LEVEL SECURITY;
ALTER TABLE date_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_flows FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_state_history FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE venues FORCE ROW LEVEL SECURITY;
ALTER TABLE service_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE service_providers FORCE ROW LEVEL SECURITY;
ALTER TABLE service_addons FORCE ROW LEVEL SECURITY;
ALTER TABLE discounts FORCE ROW LEVEL SECURITY;
ALTER TABLE tax_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE communications FORCE ROW LEVEL SECURITY;
ALTER TABLE communication_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE email_layouts FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE contract_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE message_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;
ALTER TABLE client_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_flow_analytics FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE data_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE referral_links FORCE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE import_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE accounting_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE browser_push_subscriptions FORCE ROW LEVEL SECURITY;
