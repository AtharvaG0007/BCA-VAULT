-- ==============================================================================
-- BCA VAULT: REGISTER SEMESTER 1 EXAM ROADMAP NOTES
-- Migration: 20260913000100_register_semester1_exam_roadmaps.sql
-- ==============================================================================

DO $$
DECLARE
  v_sem1_bundle_id uuid;
BEGIN
  -- Look up Semester 1 bundle
  SELECT id INTO v_sem1_bundle_id
  FROM public.bundles
  WHERE id = '5b36f72a-165c-4cd1-8458-d4f33fadd860'
  LIMIT 1;

  IF v_sem1_bundle_id IS NULL THEN
    SELECT id INTO v_sem1_bundle_id
    FROM public.bundles
    WHERE (title ILIKE '%sem%1%' OR title ILIKE '%semester 1%') AND published = TRUE
    LIMIT 1;
  END IF;

  IF v_sem1_bundle_id IS NULL THEN
    v_sem1_bundle_id := '5b36f72a-165c-4cd1-8458-d4f33fadd860';
  END IF;

  -- 1. Note 1: C Programming Exam Roadmap
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
    'BCA Vault — C Programming Exam Roadmap',
    'Algorithms and Program Design using C',
    1,
    'Complete Semester 1 exam preparation roadmap for Algorithms and Program Design using C. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.',
    'Bca_notes',
    'BCA SEM1/BCA_Vault_C_Programming_Exam_Roadmap_Sem1.pdf',
    TRUE,
    'critical',
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
      priority = 'critical',
      status = 'published',
      updated_at = NOW();

  -- 2. Note 2: Foundations of Computing Exam Roadmap
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
    'BCA Vault — Foundations of Computing Exam Roadmap',
    'Foundation of Computing',
    1,
    'Complete Semester 1 exam preparation roadmap for Foundations of Computing. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.',
    'Bca_notes',
    'BCA SEM1/BCA_Vault_Foundations_of_Computing_Exam_Roadmap_Sem1.pdf',
    TRUE,
    'critical',
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
      priority = 'critical',
      status = 'published',
      updated_at = NOW();

  -- 3. Note 3: Client-Side Web Technologies Exam Roadmap
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
    'BCA Vault — Client-Side Web Technologies Exam Roadmap',
    'Client-Side Web Technology',
    1,
    'Complete Semester 1 exam preparation roadmap for Client-Side Web Technologies covering HTML, CSS and JavaScript. Includes syllabus order, priority topics, study method, 15-day, 7-day, 3-day and final revision plans.',
    'Bca_notes',
    'BCA SEM1/BCA_Vault_Client_Side_Web_Technologies_Exam_Roadmap_Sem1.pdf',
    TRUE,
    'critical',
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
      priority = 'critical',
      status = 'published',
      updated_at = NOW();

END $$;
