-- ==============================================================================
-- Migration: 20260908000200_student_dms_referral_workflow.sql
-- Description:
--   1. Transition active referral system from legacy BV-XXXXXX codes to Student DMS
--      identifier format (<Student Full Name> DMS).
--   2. Allow referral_code_id in public.referrals to be NULL for new DMS referrals.
--   3. Add referral_identifier column to public.referrals and public.payment_submissions.
--   4. Implement secure public.resolve_referral_identifier() function with:
--      - whitespace normalization & case-insensitive matching
--      - DMS suffix verification
--      - unique profile resolution & ambiguity rejection
--      - strict self-referral protection (user_id and email)
--      - single referral enforcement (rejects duplicate referral relationships)
--      - client-safe data masking (no user_id or email exposed to public/anon/authenticated)
--   5. Connect payment review fallback to resolve and create pending referral for
--      qualifying purchases.
-- ==============================================================================

-- 1. Modify public.referrals to support DMS identifiers without requiring legacy code ID
DO $$
BEGIN
  -- Drop NOT NULL on referral_code_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'referrals' 
      AND column_name = 'referral_code_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.referrals ALTER COLUMN referral_code_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Add referral_identifier columns for authoritative audit and display
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS referral_identifier TEXT;

ALTER TABLE public.payment_submissions
ADD COLUMN IF NOT EXISTS referral_identifier TEXT;

-- Create indexing for efficient lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referral_identifier 
ON public.referrals (referral_identifier) 
WHERE referral_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_submissions_referral_identifier 
ON public.payment_submissions (referral_identifier) 
WHERE referral_identifier IS NOT NULL;

-- 3. Create authoritative resolver function
DROP FUNCTION IF EXISTS public.resolve_referral_identifier(TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_referral_identifier(
  p_identifier TEXT,
  p_caller_user_id UUID DEFAULT NULL,
  p_caller_email TEXT DEFAULT NULL,
  p_is_internal BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized TEXT;
  v_name_part TEXT;
  v_match_count INT := 0;
  v_found_profile RECORD;
  v_matching_profile RECORD;
  v_caller_id UUID := p_caller_user_id;
  v_caller_mail TEXT := LOWER(TRIM(COALESCE(p_caller_email, '')));
  v_is_internal BOOLEAN := false;
BEGIN
  -- Determine caller UUID from session if not explicitly provided
  IF v_caller_id IS NULL THEN
    v_caller_id := auth.uid();
  END IF;

  -- Determine caller email from JWT claim if not explicitly provided
  IF v_caller_mail = '' THEN
    BEGIN
      v_caller_mail := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
    EXCEPTION WHEN OTHERS THEN
      v_caller_mail := '';
    END;
  END IF;

  -- Determine caller execution role: only permit internal data if requested by service_role
  IF p_is_internal IS TRUE THEN
    IF auth.role() = 'service_role' 
       OR current_setting('request.jwt.claim.role', true) = 'service_role' 
       OR current_setting('request.jwt.claim.role', true) IS NULL THEN
      v_is_internal := true;
    END IF;
  END IF;

  -- 1. Validate non-empty input
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please enter a referral identifier.'
    );
  END IF;

  -- 2. Normalize whitespace: trim and collapse repeated internal spaces
  v_normalized := TRIM(regexp_replace(p_identifier, '\s+', ' ', 'g'));

  -- 3. Validate DMS suffix (must end with ' DMS', case-insensitive)
  IF NOT (v_normalized ~* '\s+dms$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral identifier not found. Referral identifiers must end with DMS (e.g. Atharva Gogawale DMS).'
    );
  END IF;

  -- 4. Extract student name portion
  v_name_part := TRIM(regexp_replace(v_normalized, '(?i)\s+dms$', ''));
  v_name_part := TRIM(regexp_replace(v_name_part, '\s+', ' ', 'g'));

  IF v_name_part = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral identifier not found.'
    );
  END IF;

  -- 5. Find matching active student profiles
  FOR v_matching_profile IN
    SELECT user_id, full_name, email, status
    FROM public.profiles
    WHERE status = 'active'
      AND LOWER(TRIM(regexp_replace(full_name, '\s+', ' ', 'g'))) = LOWER(v_name_part)
  LOOP
    v_match_count := v_match_count + 1;
    v_found_profile := v_matching_profile;
  END LOOP;

  -- 6. Zero matches -> invalid identifier
  IF v_match_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral identifier not found.'
    );
  END IF;

  -- 7. Multiple matches -> reject ambiguous identifier (never arbitrarily choose)
  IF v_match_count > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This referral identifier could not be uniquely verified. Please confirm the identifier with your friend.'
    );
  END IF;

  -- 8. Self-referral protection: reject if referrer is the caller
  IF v_caller_id IS NOT NULL AND v_found_profile.user_id = v_caller_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot use your own referral identifier.'
    );
  END IF;

  IF v_caller_mail <> '' AND LOWER(TRIM(v_found_profile.email)) = v_caller_mail THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot use your own referral identifier.'
    );
  END IF;

  IF v_caller_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = v_caller_id 
        AND LOWER(TRIM(email)) = LOWER(TRIM(v_found_profile.email))
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You cannot use your own referral identifier.'
      );
    END IF;
  END IF;

  -- 9. Single referral rule: verify student does not already have an associated referral
  IF v_caller_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.referrals
      WHERE referred_user_id = v_caller_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This student already has a referral associated with their account.'
      );
    END IF;
  END IF;

  IF v_caller_mail <> '' THEN
    IF EXISTS (
      SELECT 1 FROM public.referrals r
      JOIN public.profiles p ON p.user_id = r.referred_user_id
      WHERE LOWER(TRIM(p.email)) = v_caller_mail
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This student already has a referral associated with their account.'
      );
    END IF;
  END IF;

  -- 10. Success response: mask sensitive IDs for client callers
  IF v_is_internal THEN
    RETURN jsonb_build_object(
      'success', true,
      'referrer_name', v_found_profile.full_name,
      'referral_identifier', v_found_profile.full_name || ' DMS',
      'referrer_user_id', v_found_profile.user_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'referrer_name', v_found_profile.full_name,
      'referral_identifier', v_found_profile.full_name || ' DMS'
    );
  END IF;
END;
$$;

-- Grant execution privileges to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.resolve_referral_identifier(TEXT, UUID, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_referral_identifier(TEXT, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_referral_identifier(TEXT, UUID, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_referral_identifier(TEXT, UUID, TEXT, BOOLEAN) TO postgres;

-- 4. Update review_payment_submission to ensure fallback referral creation on approval
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
  v_ref_res jsonb;
  v_ref_user_id uuid;
  v_ref_identifier text;
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

    -- If qualifying purchase, ensure referral row is created and qualified
    IF v_is_sem1_eligible THEN
      -- If no referral relationship exists yet for this student, resolve from payment record
      v_ref_identifier := COALESCE(v_payment.referral_identifier, v_payment.referral_code);
      IF v_ref_identifier IS NOT NULL AND v_ref_identifier <> '' THEN
        IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_target_user_id) THEN
          BEGIN
            v_ref_res := public.resolve_referral_identifier(
              v_ref_identifier,
              v_target_user_id,
              v_payment.email,
              true
            );
            IF (v_ref_res->>'success')::boolean = true AND (v_ref_res->>'referrer_user_id') IS NOT NULL THEN
              v_ref_user_id := (v_ref_res->>'referrer_user_id')::uuid;
              INSERT INTO public.referrals (
                referrer_user_id,
                referred_user_id,
                referral_identifier,
                status
              )
              VALUES (
                v_ref_user_id,
                v_target_user_id,
                v_ref_res->>'referral_identifier',
                'pending'
              )
              ON CONFLICT (referred_user_id) DO NOTHING;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;
      END IF;

      -- Qualify pending referral and unlock reward for Student A
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
