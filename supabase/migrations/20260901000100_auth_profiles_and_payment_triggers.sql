-- ==============================================================================
-- BCA VAULT: AUTOMATIC PROFILE PROVISIONING, BACKFILL & PAYMENT VERIFICATION
-- ==============================================================================

-- 1. Function to automatically create student profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name text;
  v_course text;
  v_semester smallint;
  v_raw_sem text;
BEGIN
  -- Extract full name from user metadata or fallback to email username
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Student'
  );

  -- Extract course with default to BCA
  v_course := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'course'), ''),
    'BCA'
  );

  -- Extract semester safely (1 to 6)
  v_raw_sem := TRIM(NEW.raw_user_meta_data->>'semester');
  IF v_raw_sem ~ '^[1-6]$' THEN
    v_semester := v_raw_sem::smallint;
  ELSE
    v_semester := 1;
  END IF;

  -- Insert profile row with status 'inactive' (or existing valid account_status)
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    course,
    semester,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_course,
    v_semester,
    'inactive'::public.account_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET
      full_name = CASE WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = 'Student' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      email = EXCLUDED.email,
      course = COALESCE(public.profiles.course, EXCLUDED.course),
      semester = COALESCE(public.profiles.semester, EXCLUDED.semester),
      updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation on profile logging error
  RAISE WARNING 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Safe Backfill for existing auth.users that currently have no profile
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  course,
  semester,
  status,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(SPLIT_PART(u.email, '@', 1)), ''),
    'Student'
  ) AS full_name,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'course'), ''), 'BCA') AS course,
  CASE
    WHEN (u.raw_user_meta_data->>'semester') ~ '^[1-6]$' THEN (u.raw_user_meta_data->>'semester')::smallint
    ELSE 1
  END AS semester,
  'inactive'::public.account_status AS status,
  COALESCE(u.created_at, NOW()) AS created_at,
  NOW() AS updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL AND u.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4. Ensure RLS policies on payment_submissions & profiles permit user self-operations
DO $$
BEGIN
  -- Permissive insert policy on payment_submissions for authenticated students
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_submissions' AND policyname = 'payment_insert_own'
  ) THEN
    CREATE POLICY "payment_insert_own" ON public.payment_submissions
      FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  -- Permissive insert policy on profiles for authenticated recovery
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 5. Enhanced review_payment_submission function with bundle granting & profile activation
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
  v_bundle public.bundles;
  v_sem1_bundle_id uuid;
  v_sem2_bundle_id uuid;
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

  -- Update payment submission status
  UPDATE public.payment_submissions
  SET
    status = p_status,
    verified_by = p_verified_by,
    verified_at = NOW(),
    admin_notes = NULLIF(TRIM(p_admin_notes), '')
  WHERE id = v_payment.id;

  IF p_status = 'approved' THEN
    -- Automatically activate student account in public.profiles
    UPDATE public.profiles
    SET status = 'active'::public.account_status, updated_at = NOW()
    WHERE user_id = v_payment.user_id;

    -- Grant access permission to the designated bundle
    IF v_payment.bundle_id IS NOT NULL THEN
      INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
      VALUES (v_payment.user_id, v_payment.bundle_id, 'active', p_verified_by, NOW(), NULL)
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
        VALUES (v_payment.user_id, v_sem1_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;

      FOR v_sem2_bundle_id IN (
        SELECT id FROM public.bundles
        WHERE published = TRUE AND (title ILIKE '%sem%2%' OR title ILIKE '%semester 2%')
      ) LOOP
        INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
        VALUES (v_payment.user_id, v_sem2_bundle_id, 'active', p_verified_by, NOW(), NULL)
        ON CONFLICT (user_id, bundle_id) DO UPDATE
          SET status = 'active', granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at, expires_at = NULL;
      END LOOP;
    END IF;
  END IF;

  -- Log administrative action
  INSERT INTO public.activity_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (
    p_verified_by,
    'payment_' || p_status,
    'payment',
    v_payment.id::text,
    jsonb_build_object(
      'bundle_id', v_payment.bundle_id,
      'student_user_id', v_payment.user_id,
      'amount', v_payment.amount,
      'utr', v_payment.utr
    )
  );

  RETURN jsonb_build_object(
    'id', v_payment.id,
    'status', p_status,
    'bundle_id', v_payment.bundle_id,
    'user_id', v_payment.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment_submission(uuid, public.payment_status, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_submission(uuid, public.payment_status, text, uuid) TO service_role;
