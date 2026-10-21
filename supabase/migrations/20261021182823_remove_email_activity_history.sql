-- Clear the existing admin email-console and activity-log history.
-- These tables remain in use for automated payment mail and internal audit events.
delete from public.email_delivery_log;
delete from public.email_outbox;
delete from public.activity_logs;
