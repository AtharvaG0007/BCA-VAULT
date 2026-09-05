-- ==============================================================================
-- BCA VAULT: MOST REPEATED QUESTIONS INTEGRATION & PAYMENT REDESIGN MIGRATION
-- ==============================================================================

-- 1. Ensure Most Repeated Questions note is in public.notes
DO $$
DECLARE
  v_sem1_bundle_id uuid;
BEGIN
  SELECT id INTO v_sem1_bundle_id
  FROM public.bundles
  WHERE (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%') AND published = TRUE
  LIMIT 1;

  IF v_sem1_bundle_id IS NULL THEN
    SELECT id INTO v_sem1_bundle_id FROM public.bundles LIMIT 1;
  END IF;

  IF v_sem1_bundle_id IS NOT NULL THEN
    INSERT INTO public.notes (
      bundle_id,
      title,
      subject,
      semester,
      description,
      storage_bucket,
      storage_path,
      published,
      priority,
      status
    )
    VALUES (
      v_sem1_bundle_id,
      'Most Repeated Questions (BCA Semester 1)',
      'BCA Semester 1',
      1,
      'Curated exam-focused questions compiled from previous years. High-priority revision material.',
      'Bca_notes',
      'BCA SEM1/bca_sem1_most_repeated_questions_complete.pdf',
      TRUE,
      'high',
      'published'
    )
    ON CONFLICT (storage_path) DO UPDATE
      SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        semester = EXCLUDED.semester,
        description = EXCLUDED.description,
        published = TRUE,
        priority = 'high',
        status = 'published',
        updated_at = NOW();
  END IF;
END $$;

-- 2. Enhance handle_new_user() trigger to automatically link payment submissions
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
  v_phone text;
  v_payment record;
BEGIN
  -- Extract user metadata
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Student'
  );

  v_course := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'course'), ''),
    'BCA'
  );

  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  v_raw_sem := TRIM(NEW.raw_user_meta_data->>'semester');
  IF v_raw_sem ~ '^[1-6]$' THEN
    v_semester := v_raw_sem::smallint;
  ELSE
    v_semester := 1;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    phone,
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
    v_phone,
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
      phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
      course = COALESCE(public.profiles.course, EXCLUDED.course),
      semester = COALESCE(public.profiles.semester, EXCLUDED.semester),
      updated_at = NOW();

  -- Link any existing unlinked payment submissions for this email
  UPDATE public.payment_submissions
  SET user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL;

  -- If any approved payment submission exists for this user, activate profile and grant bundle access
  FOR v_payment IN (
    SELECT * FROM public.payment_submissions
    WHERE LOWER(email) = LOWER(NEW.email) AND status = 'approved'
  ) LOOP
    -- Activate student profile
    UPDATE public.profiles
    SET status = 'active'::public.account_status, updated_at = NOW()
    WHERE user_id = NEW.id;

    -- Grant bundle access
    IF v_payment.bundle_id IS NOT NULL THEN
      INSERT INTO public.access_permissions (user_id, bundle_id, status, granted_by, granted_at, expires_at)
      VALUES (NEW.id, v_payment.bundle_id, 'active', v_payment.verified_by, NOW(), NULL)
      ON CONFLICT (user_id, bundle_id) DO UPDATE
        SET status = 'active', expires_at = NULL;
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Enhance review_payment_submission() to handle unlinked guest submissions
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

    -- Grant access permission to the designated bundle
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
      'student_user_id', COALESCE(v_payment.user_id, v_target_user_id),
      'amount', v_payment.amount,
      'utr', v_payment.utr
    )
  );

  RETURN jsonb_build_object(
    'id', v_payment.id,
    'status', p_status,
    'bundle_id', v_payment.bundle_id,
    'user_id', COALESCE(v_payment.user_id, v_target_user_id)
  );
END;
$$;
