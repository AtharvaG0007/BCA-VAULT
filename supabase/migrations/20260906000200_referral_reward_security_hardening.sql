-- ==============================================================================
-- Migration: 20260906000200_referral_reward_security_hardening.sql
-- Description:
--   1. Add referral_code to payment_submissions for tracking referred checkouts.
--   2. Enforce self-referral prevention constraint on referrals.
--   3. Enforce 1-referral per referred user (uq_referrals_referred_user).
--   4. Enforce 1-reward per referral (uq_referral_rewards_referral).
--   5. Harden RLS policies on referrals and referral_rewards (read-only for students, zero client mutation).
--   6. Create secure qualification function qualify_referral_on_payment_approval with restricted EXECUTE.
-- ==============================================================================

-- 1. Add referral_code column to payment_submissions
ALTER TABLE public.payment_submissions
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 2. Self-referral database protection
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.referrals'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) ILIKE '%referrer_user_id <> referred_user_id%'
  ) THEN
    ALTER TABLE public.referrals 
    ADD CONSTRAINT referrals_no_self_referral 
    CHECK (referrer_user_id <> referred_user_id);
  END IF;
END $$;

-- 3. Enforce one referral per referred student
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.referrals'::regclass 
      AND conname = 'uq_referrals_referred_user'
  ) THEN
    ALTER TABLE public.referrals 
    ADD CONSTRAINT uq_referrals_referred_user 
    UNIQUE (referred_user_id);
  END IF;
END $$;

-- 4. Enforce one reward per referral
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.referral_rewards'::regclass 
      AND (conname = 'uq_referral_rewards_referral' OR conname = 'referral_rewards_referral_id_key')
  ) THEN
    ALTER TABLE public.referral_rewards 
    ADD CONSTRAINT uq_referral_rewards_referral 
    UNIQUE (referral_id);
  END IF;
END $$;

-- 5. RLS Security Hardening
-- Ensure RLS is active on referral tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Drop any unsafe or legacy client mutation policies if they exist
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update their own rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Users can insert rewards" ON public.referral_rewards;

-- Drop and recreate clean, optimal SELECT policies for students
DROP POLICY IF EXISTS "users_read_own_referrals" ON public.referrals;
CREATE POLICY "users_read_own_referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (
  (referrer_user_id = (SELECT auth.uid())) 
  OR (referred_user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "users_read_own_referral_rewards" ON public.referral_rewards;
CREATE POLICY "users_read_own_referral_rewards"
ON public.referral_rewards FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- Ensure admin read policies exist and are preserved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'referrals' 
      AND policyname = 'admins_read_referrals'
  ) THEN
    CREATE POLICY "admins_read_referrals"
    ON public.referrals FOR SELECT
    TO authenticated
    USING ((SELECT is_active_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'referral_rewards' 
      AND policyname = 'admins_read_referral_rewards'
  ) THEN
    CREATE POLICY "admins_read_referral_rewards"
    ON public.referral_rewards FOR SELECT
    TO authenticated
    USING ((SELECT is_active_admin()));
  END IF;
END $$;

-- 6. Secure Referral Qualification Function
CREATE OR REPLACE FUNCTION public.qualify_referral_on_payment_approval(
  p_referred_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referral RECORD;
BEGIN
  IF p_referred_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Find pending referral for this referred user
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_user_id = p_referred_user_id
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    -- Update referral status to successful
    UPDATE public.referrals
    SET status = 'successful',
        successful_at = now()
    WHERE id = v_referral.id;

    -- Create or unlock exactly ONE reward for the referrer
    INSERT INTO public.referral_rewards (
      referral_id,
      user_id,
      reward_type,
      status,
      unlocked_at
    )
    VALUES (
      v_referral.id,
      v_referral.referrer_user_id,
      'most_repeated_questions',
      'unlocked',
      now()
    )
    ON CONFLICT (referral_id) DO UPDATE
    SET status = 'unlocked',
        unlocked_at = COALESCE(public.referral_rewards.unlocked_at, now());
  END IF;
END;
$$;

-- Restrict EXECUTE privileges:
-- Revoke from PUBLIC, anon, and authenticated so students cannot self-qualify
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM authenticated;

-- Grant EXECUTE exclusively to service_role and postgres
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) TO postgres;
