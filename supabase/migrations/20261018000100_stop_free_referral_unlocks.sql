-- Stop granting free Most Repeated Questions access through referrals.
-- Referral tracking remains intact: eligible, admin-approved purchases still
-- transition a pending referral to successful. Existing reward rows are
-- intentionally preserved and are not deleted or downgraded.
-- The separate ₹25 cash-reward workflow is not implemented by this migration.

CREATE OR REPLACE FUNCTION public.qualify_referral_on_payment_approval(
  p_referred_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_referral_id uuid;
BEGIN
  IF p_referred_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Called by review_payment_submission only after an active superadmin
  -- approves an eligible payment. Lock the pending referral to make retries
  -- safe and avoid double-processing concurrent approvals.
  SELECT id
    INTO v_referral_id
  FROM public.referrals
  WHERE referred_user_id = p_referred_user_id
    AND status = 'pending'
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.referrals
  SET status = 'successful',
      successful_at = COALESCE(successful_at, now())
  WHERE id = v_referral_id
    AND status = 'pending';

  -- Intentionally do not insert/update referral_rewards and do not queue a
  -- referral-reward-unlocked email. Free-content referral rewards are retired.
  -- Existing referral_rewards records are preserved as historical records.
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral_on_payment_approval(uuid) TO postgres;
