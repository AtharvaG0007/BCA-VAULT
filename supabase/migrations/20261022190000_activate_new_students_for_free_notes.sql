-- New student accounts should be active immediately so they can access
-- published standard notes for free. Paid Exam Kits remain protected by their
-- own entitlement checks; this does not grant any bundle permissions.

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

  v_raw_sem := TRIM(NEW.raw_user_meta_data->>'semester');
  IF v_raw_sem ~ '^[1-6]$' THEN
    v_semester := v_raw_sem::smallint;
  ELSE
    v_semester := 1;
  END IF;

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
    'active'::public.account_status,
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
  RAISE WARNING 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
