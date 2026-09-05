-- ==============================================================================
-- Migration: 20260906000300_payment_approval_referral_qualification.sql
-- Description:
--   Connect admin payment approval directly to referral qualification.
--   When an eligible Semester 1 payment is approved by an active superadmin,
--   atomically invoke qualify_referral_on_payment_approval(v_target_user_id).
-- ==============================================================================

-- Drop legacy overload with different argument ordering
DROP FUNCTION IF EXISTS public.review_payment_submission(text, uuid, public.payment_status, uuid);

CREATE OR REPLACE FUNCTION public.review_payment_submission(
  p_payment_id uuid,
  p_status public.payment_status,
  p_admin_notes text,
  p_verified_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payment_submissions;
  v_target_user_id uuid;
  v_bundle public.bundles;
  v_sem1_bundle_id uuid;
  v_sem2_bundle_id uuid;
  v_is_sem1_eligible boolean := false;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid payment review status';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = p_verified_by AND role = 'superadmin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  SELECT * INTO v_payment
  FROM public.payment_submissions
  WHERE id = p_payment_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission is not pending';
  END IF;

  -- If user_id is null, attempt to link with existing profile by email
  v_target_user_id := v_payment.user_id;
  IF v_target_user_id IS NULL THEN
    SELECT user_id INTO v_target_user_id
    FROM public.profiles
    WHERE LOWER(email) = LOWER(v_payment.email)
    LIMIT 1;
  END IF;

  -- Update payment submission status
  UPDATE public.payment_submissions
  SET
    status = p_status,
    user_id = COALESCE(v_payment.user_id, v_target_user_id),
    verified_by = p_verified_by,
    verified_at = NOW(),
    admin_notes = NULLIF(TRIM(p_admin_notes), '')
  WHERE id = v_payment.id;

  IF p_status = 'approved' AND v_target_user_id IS NOT NULL THEN
    -- Automatically activate student account in public.profiles
    UPDATE public.profiles
    SET status = 'active'::public.account_status, updated_at = NOW()
    WHERE user_id = v_target_user_id;

    -- Grant access permission to the designated bundle for the student
    IF v_payment.bundle_id IS NOT NULL THEN
      INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
      VALUES (v_target_user_id, v_payment.bundle_id, 'active', p_verified_by, NOW(), NULL)
      ON CONFLICT (user_id, bundle_id) DO UPDATE
        SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
    END IF;

    -- If bundle title implies "Complete" / "Both" / "All Semesters", grant access to Semester 1 and Semester 2 bundles as well
    SELECT * INTO v_bundle FROM public.bundles WHERE id = v_payment.bundle_id;
    IF FOUND AND (v_bundle.title ILIKE '%complete%' OR v_bundle.title ILIKE '%both%' OR v_bundle.title ILIKE '%all%') THEN
      FOR v_sem1_bundle_id IN (
        SELECT id FROM public.bundles
        WHERE published = TRUE AND (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%')
      ) LOOP
        INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
        VALUES (v_target_user_id, v_sem1_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;

      FOR v_sem2_bundle_id IN (
        SELECT id FROM public.bundles
        WHERE published = TRUE AND (title ILIKE '%sem%2%' OR title ILIKE '%semester 2%')
      ) LOOP
        INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
        VALUES (v_target_user_id, v_sem2_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;
    END IF;

    -- Check if payment is an eligible Semester 1 qualifying purchase for referral reward
    IF v_payment.semester = 1 
       OR v_payment.bundle_id = '5b36f72a-165c-4cd1-8458-d4f33fadd860' 
       OR (v_bundle.title IS NOT NULL AND (v_bundle.title ILIKE '%sem%1%' OR v_bundle.title ILIKE '%semester 1%')) THEN
      v_is_sem1_eligible := true;
    END IF;

    -- If qualifying purchase, qualify pending referral and unlock reward for Student A
    IF v_is_sem1_eligible THEN
      PERFORM public.qualify_referral_on_payment_approval(v_target_user_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_payment.id,
    'reference_id', v_payment.reference_id,
    'user_id', v_target_user_id,
    'status', p_status,
    'verified_at', NOW(),
    'verified_by', p_verified_by,
    'bundle_id', v_payment.bundle_id,
    'semester', v_payment.semester
  );
END;
$$;
