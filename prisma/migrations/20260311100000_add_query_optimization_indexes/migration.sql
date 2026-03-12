-- Add missing indexes for query optimization

-- PaymentWebhookLog: filter unprocessed webhooks for retry
CREATE INDEX "payment_webhook_logs_processed_created_at_idx" ON "payment_webhook_logs"("processed", "created_at");

-- EmailLayout: tenant lookup
CREATE INDEX "email_layouts_tenant_id_idx" ON "email_layouts"("tenant_id");

-- Quote: filter by tenant + status
CREATE INDEX "quotes_tenant_id_status_idx" ON "quotes"("tenant_id", "status");

-- QuoteOptionItem: FK lookup
CREATE INDEX "quote_option_items_option_id_idx" ON "quote_option_items"("option_id");

-- SecurityBreach: filter by status and severity
CREATE INDEX "security_breaches_status_idx" ON "security_breaches"("status");
CREATE INDEX "security_breaches_severity_idx" ON "security_breaches"("severity");

-- BreachNotification: FK lookup
CREATE INDEX "breach_notifications_breach_id_idx" ON "breach_notifications"("breach_id");

-- PlatformAlert: filter by metric key and unacknowledged alerts
CREATE INDEX "platform_alerts_metric_key_idx" ON "platform_alerts"("metric_key");
CREATE INDEX "platform_alerts_acknowledged_created_at_idx" ON "platform_alerts"("acknowledged", "created_at");

-- DirectoryListing: sort/filter by featured and activity
CREATE INDEX "directory_listings_featured_until_idx" ON "directory_listings"("featured_until");
CREATE INDEX "directory_listings_last_active_at_idx" ON "directory_listings"("last_active_at");

-- CustomDomain: filter pending verification domains
CREATE INDEX "custom_domains_status_idx" ON "custom_domains"("status");

-- RecommendationModel: filter by type
CREATE INDEX "recommendation_models_type_idx" ON "recommendation_models"("type");

-- ClientRecommendation: tenant filter, user+tenant+expiry composite, expiry cleanup
CREATE INDEX "client_recommendations_tenant_id_idx" ON "client_recommendations"("tenant_id");
CREATE INDEX "client_recommendations_user_id_tenant_id_expires_at_idx" ON "client_recommendations"("user_id", "tenant_id", "expires_at");
CREATE INDEX "client_recommendations_expires_at_idx" ON "client_recommendations"("expires_at");

-- ChurnRiskScore: at-risk client queries by tenant + risk level
CREATE INDEX "churn_risk_scores_tenant_id_risk_level_idx" ON "churn_risk_scores"("tenant_id", "risk_level");

-- Partner: filter by status
CREATE INDEX "partners_status_idx" ON "partners"("status");

-- PartnerReferral: FK lookup
CREATE INDEX "partner_referrals_partner_id_idx" ON "partner_referrals"("partner_id");

-- PartnerPayout: payout processing queries
CREATE INDEX "partner_payouts_partner_id_status_idx" ON "partner_payouts"("partner_id", "status");

-- ClientProfile.tags: GIN index for JSON array containment queries
CREATE INDEX "client_profiles_tags_gin_idx" ON "client_profiles" USING GIN ("tags");
