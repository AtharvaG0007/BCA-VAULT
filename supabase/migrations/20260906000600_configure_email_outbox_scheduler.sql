-- Migration: 20260906000600_configure_email_outbox_scheduler.sql
-- Description: Configures native pg_cron + pg_net background scheduler for BCA Vault email sweep.
-- Runs every minute (*/1 * * * *).
-- Invokes server-side email-dispatcher via pg_net with credentials from Supabase Vault.
-- Idempotent: unschedules any existing job with the same name before scheduling.

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- 2. Idempotently unschedule any existing job with the same name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'bca-vault-email-outbox-sweep'
  ) THEN
    PERFORM cron.unschedule('bca-vault-email-outbox-sweep');
  END IF;
END $$;

-- 3. Schedule the 1-minute outbox sweep job
SELECT cron.schedule(
  'bca-vault-email-outbox-sweep',
  '*/1 * * * *',
  $cron$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'project_url'
    ) || '/functions/v1/email-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'email_worker_key'
      ),
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'email_worker_key'
      )
    ),
    body := jsonb_build_object(
      'triggered_at', now()
    ),
    timeout_milliseconds := 15000
  ) AS request_id;
  $cron$
);
