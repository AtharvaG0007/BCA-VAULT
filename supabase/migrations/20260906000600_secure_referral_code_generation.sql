-- ==============================================================================
-- Migration: 20260906000600_secure_referral_code_generation.sql
-- Description:
--   1. Create secure RPC public.get_or_create_referral_code() for authenticated students.
--   2. Ensures auth.uid() is used strictly (no client-provided user_id).
--   3. Idempotent: returns existing active code or generates a unique BV-XXXXXX code.
--   4. Safely handles unique collisions and concurrent calls.
--   5. Enforces strict RLS policies on referral_codes (read-only for own records, zero client insert).
-- ==============================================================================

-- 1. Ensure referral_codes table has appropriate unique constraints and indexes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_code 
ON public.referral_codes (code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_user_active 
ON public.referral_codes (user_id) 
WHERE is_active = true;

-- 2. Tighten RLS policies on referral_codes (only SELECT allowed for students and admins)
DROP POLICY IF EXISTS "users_read_own_referral_codes" ON public.referral_codes;
CREATE POLICY "users_read_own_referral_codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "admins_read_referral_codes" ON public.referral_codes;
CREATE POLICY "admins_read_referral_codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING ((SELECT is_active_admin()));

-- Ensure no direct client mutations
DROP POLICY IF EXISTS "users_insert_referral_codes" ON public.referral_codes;
DROP POLICY IF EXISTS "users_update_referral_codes" ON public.referral_codes;
DROP POLICY IF EXISTS "users_delete_referral_codes" ON public.referral_codes;

-- 3. Create secure get_or_create_referral_code RPC function
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_code text;
  v_code text;
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_len int := length(v_chars);
  v_i int;
  v_attempt int;
BEGIN
  -- Strict authentication check: anon or unauthenticated callers are rejected
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to access referral code';
  END IF;

  -- 1. Return existing active referral code if one already exists for this student
  SELECT code INTO v_existing_code
  FROM public.referral_codes
  WHERE user_id = v_user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;

  -- 2. Generate a new unique code with format BV-XXXXXX (6 alphanumeric chars)
  FOR v_attempt IN 1..15 LOOP
    v_code := 'BV-';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM (1 + FLOOR(RANDOM() * v_len)::int) FOR 1);
    END LOOP;

    BEGIN
      INSERT INTO public.referral_codes (user_id, code, is_active)
      VALUES (v_user_id, v_code, true)
      RETURNING code INTO v_code;

      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        -- Check if concurrent call already inserted an active code for this user
        SELECT code INTO v_existing_code
        FROM public.referral_codes
        WHERE user_id = v_user_id AND is_active = true
        LIMIT 1;

        IF v_existing_code IS NOT NULL THEN
          RETURN v_existing_code;
        END IF;

        -- Otherwise collision was on code; loop continues to try a new code
    END;
  END LOOP;

  RAISE EXCEPTION 'Failed to generate a unique referral code. Please try again.';
END;
$$;

-- 4. Restrict execution privileges:
-- Deny public and anon
REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM anon;

-- Grant execution exclusively to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO service_role;
