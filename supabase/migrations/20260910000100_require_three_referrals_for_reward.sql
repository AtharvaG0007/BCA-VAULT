-- ==============================================================================
-- Migration: 20260910000100_require_three_referrals_for_reward.sql
-- Description:
--   Update referral qualification to require 3 successful referrals before
--   unlocking the Semester 1 Most Repeated Questions reward pack.
--
--   Qualification Rules:
--   1. Student B uses Student A's valid referral identifier.
--   2. Student B submits an eligible Semester 1 purchase.
--   3. Payment is approved via Payment CRM workflow (qualify_referral_on_payment_approval).
--   4. Referral status changes: PENDING -> SUCCESSFUL.
--   5. Total successful referrals for referrer is calculated.
--   6. Reward unlocks ONLY when successful referral count >= 3.
--   7. Remains locked at 0/3, 1/3, 2/3; unlocks at 3/3.
-- ==============================================================================

-- 1. Create index for fast referrer successful referral lookup if not exists
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status 
ON public.referrals (referrer_user_id, status);

-- 2. Update secure qualify_referral_on_payment_approval function
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
  v_successful_count INTEGER;
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
    -- 1. Update referral status to successful upon verified payment approval
    UPDATE public.referrals
    SET status = 'successful',
        successful_at = now()
    WHERE id = v_referral.id;

    -- 2. Count total successful referrals for this referrer
    SELECT COUNT(*) INTO v_successful_count
    FROM public.referrals
    WHERE referrer_user_id = v_referral.referrer_user_id
      AND status = 'successful';

    -- 3. NEW RULE: Unlock reward ONLY at 3 or more successful referrals
    IF v_successful_count >= 3 THEN
      -- Create or unlock exactly ONE reward row for the referrer
      IF NOT EXISTS (
        SELECT 1 FROM public.referral_rewards
        WHERE user_id = v_referral.referrer_user_id
          AND reward_type = 'most_repeated_questions'
      ) THEN
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
        );
      ELSE
        UPDATE public.referral_rewards
        SET status = 'unlocked',
            unlocked_at = COALESCE(unlocked_at, now())
        WHERE user_id = v_referral.referrer_user_id
          AND reward_type = 'most_repeated_questions';
      END IF;
    END IF;
  END IF;
END;
$$;

-- Restrict EXECUTE privileges:
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) FROM authenticated;

-- Grant EXECUTE exclusively to service_role and postgres
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(UUID) TO postgres;
