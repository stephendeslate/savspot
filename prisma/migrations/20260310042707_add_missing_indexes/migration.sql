-- CreateIndex
CREATE INDEX "booking_workflow_overrides_booking_id_idx" ON "booking_workflow_overrides"("booking_id");

-- CreateIndex
CREATE INDEX "calendar_connections_user_id_idx" ON "calendar_connections"("user_id");

-- CreateIndex
CREATE INDEX "calendar_events_calendar_connection_id_idx" ON "calendar_events"("calendar_connection_id");

-- CreateIndex
CREATE INDEX "calendar_events_booking_id_idx" ON "calendar_events"("booking_id");

-- CreateIndex
CREATE INDEX "communications_booking_id_idx" ON "communications"("booking_id");

-- CreateIndex
CREATE INDEX "contract_amendments_contract_id_idx" ON "contract_amendments"("contract_id");

-- CreateIndex
CREATE INDEX "contract_signatures_contract_id_idx" ON "contract_signatures"("contract_id");

-- CreateIndex
CREATE INDEX "contract_signatures_signer_id_idx" ON "contract_signatures"("signer_id");

-- CreateIndex
CREATE INDEX "contracts_booking_id_idx" ON "contracts"("booking_id");

-- CreateIndex
CREATE INDEX "contracts_template_id_idx" ON "contracts"("template_id");

-- CreateIndex
CREATE INDEX "data_requests_user_id_idx" ON "data_requests"("user_id");

-- CreateIndex
CREATE INDEX "date_reservations_session_id_idx" ON "date_reservations"("session_id");

-- CreateIndex
CREATE INDEX "device_push_tokens_user_id_idx" ON "device_push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "import_records_import_job_id_idx" ON "import_records"("import_job_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "message_threads_booking_id_idx" ON "message_threads"("booking_id");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "notification_digests_user_id_idx" ON "notification_digests"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_id_idx" ON "notifications"("type_id");

-- CreateIndex
CREATE INDEX "payment_disputes_payment_id_idx" ON "payment_disputes"("payment_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "quote_line_items_quote_id_idx" ON "quote_line_items"("quote_id");

-- CreateIndex
CREATE INDEX "quote_options_quote_id_idx" ON "quote_options"("quote_id");

-- CreateIndex
CREATE INDEX "review_photos_review_id_idx" ON "review_photos"("review_id");

-- CreateIndex
CREATE INDEX "service_addons_service_id_idx" ON "service_addons"("service_id");

-- CreateIndex
CREATE INDEX "template_history_template_id_idx" ON "template_history"("template_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_webhook_log_id_idx" ON "webhook_dead_letters"("webhook_log_id");
