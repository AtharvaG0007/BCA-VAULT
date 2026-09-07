-- ==============================================================================
-- BCA VAULT: REGISTER SEMESTER 1 MOST REPEATED TOPICS NOTES
-- Migration: 20260907000100_register_semester1_most_repeated_topics.sql
-- ==============================================================================

DO $$
DECLARE
  v_sem1_bundle_id uuid;
BEGIN
  -- Look up Semester 1 bundle
  SELECT id INTO v_sem1_bundle_id
  FROM public.bundles
  WHERE (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%') AND published = TRUE
  LIMIT 1;

  IF v_sem1_bundle_id IS NULL THEN
    v_sem1_bundle_id := '5b36f72a-165c-4cd1-8458-d4f33fadd860';
  END IF;

  -- 1. Note 1: Most Repeated Topics — C Programming
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
    'Most Repeated Topics — C Programming',
    'C Programming / Algorithms and Program Design Using C',
    1,
    'High-priority exam-oriented repeated topics and core concepts for C Programming.',
    'Bca_notes',
    'BCA SEM1/C_Programming_Most_Repeated_Topics.pdf',
    TRUE,
    'high',
    'published'
  )
  ON CONFLICT (storage_path) DO UPDATE
    SET
      bundle_id = EXCLUDED.bundle_id,
      title = EXCLUDED.title,
      subject = EXCLUDED.subject,
      semester = EXCLUDED.semester,
      description = EXCLUDED.description,
      storage_bucket = EXCLUDED.storage_bucket,
      published = TRUE,
      priority = 'high',
      status = 'published',
      updated_at = NOW();

  -- 2. Note 2: Most Repeated Topics — Algorithm & Program Design Using C
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
    'Most Repeated Topics — Algorithm & Program Design Using C',
    'Algorithms and Program Design Using C',
    1,
    'High-priority exam-oriented repeated topics for Algorithm & Program Design Using C.',
    'Bca_notes',
    'BCA SEM1/Algorithm_Program_Design_Most_Repeated_Topics.pdf',
    TRUE,
    'high',
    'published'
  )
  ON CONFLICT (storage_path) DO UPDATE
    SET
      bundle_id = EXCLUDED.bundle_id,
      title = EXCLUDED.title,
      subject = EXCLUDED.subject,
      semester = EXCLUDED.semester,
      description = EXCLUDED.description,
      storage_bucket = EXCLUDED.storage_bucket,
      published = TRUE,
      priority = 'high',
      status = 'published',
      updated_at = NOW();

  -- 3. Note 3: Most Repeated Topics — Foundation of Computing
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
    'Most Repeated Topics — Foundation of Computing',
    'Foundation of Computing',
    1,
    'High-priority exam-oriented repeated topics and key concepts for Foundation of Computing.',
    'Bca_notes',
    'BCA SEM1/Foundation_of_Computing_Most_Repeated_Topics.pdf',
    TRUE,
    'high',
    'published'
  )
  ON CONFLICT (storage_path) DO UPDATE
    SET
      bundle_id = EXCLUDED.bundle_id,
      title = EXCLUDED.title,
      subject = EXCLUDED.subject,
      semester = EXCLUDED.semester,
      description = EXCLUDED.description,
      storage_bucket = EXCLUDED.storage_bucket,
      published = TRUE,
      priority = 'high',
      status = 'published',
      updated_at = NOW();

END $$;
