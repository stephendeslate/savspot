-- Revert FORCE ROW LEVEL SECURITY on all tenant-scoped tables.
--
-- FORCE RLS is incompatible with Prisma's connection pooling: set_config()
-- called by middleware runs on one pooled connection, but subsequent Prisma
-- queries (guards, services) may execute on different connections where
-- app.current_tenant is unset. With FORCE RLS, this causes the RLS policy
-- (tenant_id = current_setting('app.current_tenant', true)) to evaluate as
-- tenant_id = NULL, returning zero rows — making tenant data invisible.
--
-- Tenant isolation is reliably enforced by the Prisma Client Extension
-- (withTenantExtension) which injects tenantId into every WHERE clause at
-- the application layer. The RLS policies remain ENABLED (not dropped) as
-- a safety net for any non-owner database connections.

ALTER TABLE tenant_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE team_invitations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_state_history NO FORCE ROW LEVEL SECURITY;
ALTER TABLE date_reservations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_rules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_flows NO FORCE ROW LEVEL SECURITY;
ALTER TABLE payments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_state_history NO FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices NO FORCE ROW LEVEL SECURITY;
ALTER TABLE services NO FORCE ROW LEVEL SECURITY;
ALTER TABLE venues NO FORCE ROW LEVEL SECURITY;
ALTER TABLE service_categories NO FORCE ROW LEVEL SECURITY;
ALTER TABLE service_providers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE service_addons NO FORCE ROW LEVEL SECURITY;
ALTER TABLE discounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tax_rates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE communications NO FORCE ROW LEVEL SECURITY;
ALTER TABLE communication_templates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE email_layouts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications NO FORCE ROW LEVEL SECURITY;
ALTER TABLE contract_templates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE contracts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections NO FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE message_threads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE notes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE client_profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos NO FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_flow_analytics NO FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE data_requests NO FORCE ROW LEVEL SECURITY;
ALTER TABLE reviews NO FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys NO FORCE ROW LEVEL SECURITY;
ALTER TABLE referral_links NO FORCE ROW LEVEL SECURITY;
ALTER TABLE support_tickets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE feedback NO FORCE ROW LEVEL SECURITY;
ALTER TABLE import_jobs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE accounting_connections NO FORCE ROW LEVEL SECURITY;
ALTER TABLE browser_push_subscriptions NO FORCE ROW LEVEL SECURITY;
