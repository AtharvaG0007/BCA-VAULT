-- ==============================================================================
-- BCA Vault Database Performance Optimization & Indexing Migration
-- ==============================================================================
-- Date: 2026-10-08
-- Scope: Complete database-wide performance indexing across all public tables.
-- Principles:
--   1. Zero data loss / zero schema mutation (indexes only).
--   2. Safe idempotency using CREATE INDEX IF NOT EXISTS.
--   3. Unindexed Foreign Keys resolved to prevent full table scans & lock cascades.
--   4. RLS authorization policy paths indexed for microsecond execution.
--   5. Partial & composite indexes tailored directly to application queries.
--   6. High-speed GIN trigram indexing for ILIKE keyword text searches.
-- ==============================================================================

-- Ensure PostgreSQL Trigram extension for accelerated text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Students & User Accounts)
-- ------------------------------------------------------------------------------
-- Optimizes: admin student directory pagination, search, and status checks.
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc
  ON public.profiles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status);

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON public.profiles USING gin (email gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 2. PAYMENT SUBMISSIONS
-- ------------------------------------------------------------------------------
-- Optimizes: admin payment list, pending verification queue, batch user lookups.
CREATE INDEX IF NOT EXISTS idx_payment_submissions_created_at_desc
  ON public.payment_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_user_created_at
  ON public.payment_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_pending
  ON public.payment_submissions (created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_submissions_name_trgm
  ON public.payment_submissions USING gin (full_name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 3. ACCESS PERMISSIONS
-- ------------------------------------------------------------------------------
-- Optimizes: student note access RLS validation and admin access audit lists.
CREATE INDEX IF NOT EXISTS idx_access_permissions_granted_at_desc
  ON public.access_permissions (granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_permissions_active_lookup
  ON public.access_permissions (user_id, bundle_id, expires_at)
  WHERE status = 'active';

-- ------------------------------------------------------------------------------
-- 4. BUNDLES
-- ------------------------------------------------------------------------------
-- Optimizes: store catalog loading and admin bundle lists.
CREATE INDEX IF NOT EXISTS idx_bundles_created_at_desc
  ON public.bundles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bundles_published_created_at
  ON public.bundles (created_at DESC)
  WHERE published = true;

-- ------------------------------------------------------------------------------
-- 5. NOTES (Study Materials & Documents)
-- ------------------------------------------------------------------------------
-- Optimizes: semester/bundle filtering, note search, and admin note management.
CREATE INDEX IF NOT EXISTS idx_notes_created_at_desc
  ON public.notes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_bundle_semester
  ON public.notes (bundle_id, semester, published);

CREATE INDEX IF NOT EXISTS idx_notes_title_trgm
  ON public.notes USING gin (title gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 6. REFERRALS & REFERRAL REWARDS
-- ------------------------------------------------------------------------------
-- Resolves unindexed FK referral_code_id, speeds up referrer reward milestones.
CREATE INDEX IF NOT EXISTS idx_referrals_code_id
  ON public.referrals (referral_code_id);

CREATE INDEX IF NOT EXISTS idx_referrals_created_at_desc
  ON public.referrals (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON public.referrals (referrer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_unlocked_at_desc
  ON public.referral_rewards (unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_status
  ON public.referral_rewards (user_id, status);

-- ------------------------------------------------------------------------------
-- 7. ACTIVITY LOGS
-- ------------------------------------------------------------------------------
-- Optimizes: admin audit log view, action-specific audit queries, and target lookup.
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc
  ON public.activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created_at
  ON public.activity_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_target
  ON public.activity_logs (target_type, target_id);

-- ------------------------------------------------------------------------------
-- 8. ADMIN NOTICES
-- ------------------------------------------------------------------------------
-- Resolves unindexed FK created_by, speeds up admin notice board sorting.
CREATE INDEX IF NOT EXISTS idx_admin_notices_created_at_desc
  ON public.admin_notices (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notices_created_by
  ON public.admin_notices (created_by)
  WHERE created_by IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 9. ADMIN PROFILES & RLS AUTHORIZATION
-- ------------------------------------------------------------------------------
-- Accelerates is_active_admin() and admin RLS policy evaluations across all tables.
CREATE INDEX IF NOT EXISTS idx_admin_profiles_auth_lookup
  ON public.admin_profiles (user_id, role, status);

-- ------------------------------------------------------------------------------
-- 10. EMAIL COMMUNICATIONS (email_outbox & email_delivery_log)
-- ------------------------------------------------------------------------------
-- Resolves unindexed foreign keys approved_by & generated_by, speeds recipient search.
CREATE INDEX IF NOT EXISTS idx_email_outbox_approved_by
  ON public.email_outbox (approved_by)
  WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_outbox_generated_by
  ON public.email_outbox (generated_by)
  WHERE generated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient
  ON public.email_delivery_log (recipient_email, created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. COUPONS & PROMOTIONS (coupon_campaigns & coupon_redemptions)
-- ------------------------------------------------------------------------------
-- Resolves unindexed FK user_id on coupon_redemptions and active campaign scans.
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id
  ON public.coupon_redemptions (user_id);

CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_active
  ON public.coupon_campaigns (is_active)
  WHERE is_active = true;

-- ------------------------------------------------------------------------------
-- 12. QUIZ COMPETITION SYSTEM
-- ------------------------------------------------------------------------------
-- Resolves unindexed FKs reviewed_by & approved_by, optimizes leaderboard & status windows.
CREATE INDEX IF NOT EXISTS idx_quiz_competitions_status_dates
  ON public.quiz_competitions (status, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_quiz_competitions_created_at_desc
  ON public.quiz_competitions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_competition_created
  ON public.quiz_questions (competition_id, created_at);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_leaderboard
  ON public.quiz_attempts (competition_id, score DESC, completion_ms ASC)
  WHERE status IN ('submitted', 'evaluated');

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_reviewed_by
  ON public.quiz_attempts (reviewed_by)
  WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_winners_approved_by
  ON public.quiz_winners (approved_by)
  WHERE approved_by IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 13. LEGAL ACCEPTANCES & CURRICULUM HIERARCHY
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_accepted_at
  ON public.legal_acceptances (accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_subjects_created_at_desc
  ON public.subjects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topics_unit_priority
  ON public.topics (unit_id, priority);
